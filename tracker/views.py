import json
import base64
from google import genai
from google.genai import types
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import generics
from django.utils import timezone
from django.db.models import Sum
from django.contrib.auth import get_user_model
from pydantic import BaseModel
from datetime import timedelta
from .models import FoodEntry
from .serializers import FoodEntrySerializer, FoodVisionBlueprintSerializer, RegisterSerializer
from .nudge_logic import evaluate_meal_for_nudge
from chat.models import ChatMemory
from users.serializers import HealthUserSerializer 

client = genai.Client(api_key=settings.GEMINI_API_KEY)
VISION_MODEL = 'gemini-3.5-flash'
TEXT_MODEL = 'gemini-3.5-flash'
EMBEDDING_MODEL = 'gemini-embedding-001'

def get_todays_calories(user):
    today = timezone.localdate()
    daily_entries = FoodEntry.objects.filter(user=user, created_at__date=today)
    total = daily_entries.aggregate(total_calories=Sum('calories'))['total_calories']
    return total or 0

def generate_meal_chat_response(user, meal, triggers, is_image=False, local_id=None):
    user_data = HealthUserSerializer(user).data
    t_cals = user_data.get('target_calories', 2000)
    t_prot = user_data.get('target_protein', 100)
    goal = user.primary_goal if user.primary_goal else 'Maintain Weight'
    
    trigger_context = f"This meal triggered the following system alerts: {', '.join(triggers)}." if triggers else "This meal is perfectly balanced."
    
    prompt = (
        "You are HealthSync's proactive, empathetic AI health coach. "
        f"The user just logged a meal: '{meal.item_name}' ({meal.calories} kcal, {meal.protein}g protein, {meal.carbs}g carbs, {meal.fats}g fat). "
        f"User Profile -> Goal: {goal}, Daily Calorie Target: {t_cals} kcal. "
        f"{trigger_context}\n\n"
        "Write a friendly, conversational 1-to-2 sentence message to the user acknowledging the meal. "
        "If there are alerts, gently guide them back on track based on their specific goals. "
        "If there are no alerts, validate their choice enthusiastically. "
        "Do not be robotic, do not use hashtags, and do not use emojis excessively."
    )

    try:
        response = client.models.generate_content(
            model=TEXT_MODEL, 
            contents=prompt,
        )
        ai_text = response.text.strip()
    except Exception as e:
        print(f"❌ Failed to generate text: {str(e)}")
        ai_text = f"I've successfully logged {meal.item_name} ({meal.calories} kcal) for you!"

    if is_image:
        user_msg_text = f"📸 [img_{local_id}]" if local_id else f"📸 Uploaded an image of {meal.item_name}"
    else:
        user_msg_text = f"I just manually logged {meal.item_name}."

    try:
        u_embed = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=user_msg_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=768)
        ).embeddings[0].values

        ai_embed = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=ai_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", output_dimensionality=768)
        ).embeddings[0].values
    except Exception as e:
        print(f"❌ Failed to generate embeddings: {str(e)}")
        u_embed = [0.0] * 768
        ai_embed = [0.0] * 768

    ChatMemory.objects.create(user=user, role='user', text_content=user_msg_text, embedding=u_embed)
    ChatMemory.objects.create(user=user, role='model', text_content=ai_text, embedding=ai_embed)

    return ai_text


class ManualMealLogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FoodEntrySerializer(data=request.data)
        if serializer.is_valid():
            meal = serializer.save(user=request.user)
            
            current_daily_total = get_todays_calories(request.user)
            triggers = evaluate_meal_for_nudge(
                user=request.user,
                meal_name=meal.item_name,
                meal_calories=meal.calories,
                meal_fats=meal.fats,
                current_daily_total=current_daily_total
            )
            
            generate_meal_chat_response(request.user, meal, triggers, is_image=False)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FoodVisionBlueprint(BaseModel):
    is_food: bool
    item_name: str
    calories: int
    protein: int
    carbs: int
    fats: int

class ImageMealLogView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        image_bytes = None
        mime_type = "image/jpeg"

        if request.FILES.get('image'):
            image_file = request.FILES.get('image')
            image_bytes = image_file.read()
            mime_type = image_file.content_type
            
        elif isinstance(request.data, dict) and request.data.get('image_base64'):
            try:
                base64_data = request.data.get('image_base64')
                if "," in base64_data:
                    header, base64_data = base64_data.split(",", 1)
                    if "image/" in header:
                        mime_type = header.split(";")[0].split(":")[1]
                
                image_bytes = base64.b64decode(base64_data)
            except Exception:
                return Response({"error": "Invalid base64 image data string."}, status=status.HTTP_400_BAD_REQUEST)

        if not image_bytes:
            return Response({"error": "No image file or base64 data provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            prompt = (
                "Analyze this image. First, determine if it contains a visible, identifiable food item. "
                "If it is NOT food, set is_food to false, calories to 0, protein to 0, carbs to 0, and fats to 0. "
                "If it IS food, estimate the total calories, protein (g), carbs (g), and fats (g) for the entire plate."
            )

            response = client.models.generate_content(
                model=VISION_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FoodVisionBlueprint,
                ),
            )

            vision_data = json.loads(response.text)

            if not vision_data.get('is_food', False):
                return Response(
                    {"error": "Invalid log. The uploaded image does not appear to contain food items."},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )

            db_payload = {
                "item_name": vision_data.get("item_name", "Identified Meal"),
                "calories": vision_data.get("calories", 0),
                "protein": vision_data.get("protein", 0),
                "carbs": vision_data.get("carbs", 0),
                "fats": vision_data.get("fats", 0),
            }

            db_serializer = FoodEntrySerializer(data=db_payload)
            if db_serializer.is_valid():
                meal = db_serializer.save(user=request.user)
                
                local_id = request.data.get('local_image_id')
                current_daily_total = get_todays_calories(request.user)
                
                triggers = evaluate_meal_for_nudge(
                    user=request.user,
                    meal_name=meal.item_name,
                    meal_calories=meal.calories,
                    meal_fats=meal.fats,
                    current_daily_total=current_daily_total
                )
                
                ai_reply = generate_meal_chat_response(
                    user=request.user, 
                    meal=meal, 
                    triggers=triggers, 
                    is_image=True, 
                    local_id=local_id
                )

                return Response({
                    "message": ai_reply,
                    "entry": db_serializer.data
                }, status=status.HTTP_201_CREATED)
            
            return Response(db_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": f"Vision processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DailyMacroSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        
        daily_entries = FoodEntry.objects.filter(
            user=request.user, 
            created_at__date=today
        )

        summary = daily_entries.aggregate(
            total_calories=Sum('calories'),
            total_protein=Sum('protein'),
            total_carbs=Sum('carbs'),
            total_fats=Sum('fats')
        )

        return Response({
            "calories": summary['total_calories'] or 0,
            "protein": summary['total_protein'] or 0,
            "carbs": summary['total_carbs'] or 0,
            "fats": summary['total_fats'] or 0,
        }, status=status.HTTP_200_OK)
    

class FoodHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seven_days_ago = timezone.localdate() - timedelta(days=7)
        
        recent_entries = FoodEntry.objects.filter(
            user=request.user,
            created_at__date__gte=seven_days_ago
        ).order_by('-created_at')

        serializer = FoodEntrySerializer(recent_entries, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class FoodHistoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            food_entry = FoodEntry.objects.get(pk=pk, user=request.user)
            food_entry.delete()
            return Response({"message": "Entry deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except FoodEntry.DoesNotExist:
            return Response({"error": "Food entry not found."}, status=status.HTTP_404_NOT_FOUND)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer