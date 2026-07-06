import json
from google import genai
from google.genai import types
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import FoodEntry
from .serializers import FoodEntrySerializer, FoodVisionBlueprintSerializer
from django.utils import timezone
from django.db.models import Sum
from pydantic import BaseModel
import base64
from datetime import timedelta
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from .nudge_logic import evaluate_meal_for_nudge
from chat.models import ChatMemory

client = genai.Client(api_key=settings.GEMINI_API_KEY)
VISION_MODEL = 'gemini-2.5-flash'

def get_todays_calories(user):
    today = timezone.localdate()
    daily_entries = FoodEntry.objects.filter(user=user, created_at__date=today)
    total = daily_entries.aggregate(total_calories=Sum('calories'))['total_calories']
    return total or 0

def trigger_ai_nudge(user, meal_name, calories, fats, triggers):
    """
    Phase 2 & 3: Sends flagged meal data to Gemini, gets a coaching response,
    and saves it directly into the user's ChatMemory.
    """
    trigger_reasons = ", ".join(triggers)
    
    prompt = (
        f"You are HealthSync's proactive, empathetic AI health coach. "
        f"The user '{user.username}' just logged a meal: '{meal_name}' ({calories} kcal, {fats}g fat). "
        f"This flagged our system for the following reasons: {trigger_reasons}. "
        f"Write a short, friendly, 1-to-2 sentence message to the user acknowledging the meal "
        f"and offering a gentle, encouraging nudge to get back on track or balance the rest of their day. "
        f"Do not be robotic, overly judgmental, or use hashtags."
    )

    try:
        # 1. Generate the response using Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt,
        )
        
        nudge_text = response.text.strip()

        # 2. Save it directly to the chat database (Delivery)
        ChatMemory.objects.create(
            user=user,
            role='assistant',
            text_content=nudge_text
        )
        
        print(f"✅ AI Nudge delivered to chat: {nudge_text}")
        
    except Exception as e:
        print(f"❌ Failed to generate AI Nudge: {str(e)}")

class ManualMealLogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FoodEntrySerializer(data=request.data)
        if serializer.is_valid():
            meal = serializer.save(user=request.user)
            
            # --- PHASE 1: NUDGE EVALUATION ---
            current_daily_total = get_todays_calories(request.user)
            triggers = evaluate_meal_for_nudge(
                user=request.user,
                meal_name=meal.item_name,
                meal_calories=meal.calories,
                meal_fats=meal.fats,
                current_daily_total=current_daily_total
            )
            
            if triggers:
                trigger_ai_nudge(
                    user=request.user,
                    meal_name=meal.item_name,
                    calories=meal.calories,
                    fats=meal.fats,
                    triggers=triggers
                )

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

            # 2. Pass the Pydantic model to Gemini
            response = client.models.generate_content(
                model=VISION_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FoodVisionBlueprint, # <--- Changed this line!
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
                
                # --- PHASE 1: NUDGE EVALUATION ---
                current_daily_total = get_todays_calories(request.user)
                triggers = evaluate_meal_for_nudge(
                    user=request.user,
                    meal_name=meal.item_name,
                    meal_calories=meal.calories,
                    meal_fats=meal.fats,
                    current_daily_total=current_daily_total
                )
                
                if triggers:
                    trigger_ai_nudge(
                        user=request.user,
                        meal_name=meal.item_name,
                        calories=meal.calories,
                        fats=meal.fats,
                        triggers=triggers
                    )

                return Response({
                    "message": "Meal logged successfully via Vision AI!",
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
        """Fetches the individual food logs for the past 7 days."""
        seven_days_ago = timezone.localdate() - timedelta(days=7)
        
        recent_entries = FoodEntry.objects.filter(
            user=request.user,
            created_at__date__gte=seven_days_ago
        ).order_by('-created_at')

        serializer = FoodEntrySerializer(recent_entries, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    




User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer