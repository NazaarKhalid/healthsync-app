from google import genai
from google.genai import types
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from pgvector.django import CosineDistance
from .models import ChatMemory
from .serializers import ChatMemorySerializer
from users.models import HealthUser
from django.utils import timezone
from tracker.models import FoodEntry
from datetime import timedelta


client = genai.Client(api_key=settings.GEMINI_API_KEY)

TEXT_MODEL = 'gemini-2.5-flash'
EMBEDDING_MODEL = 'gemini-embedding-001'

class ChatEngineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user_prompt = request.data.get('text_content')
        
        if not user_prompt:
            return Response({"error": "Prompt cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Embed and Save User Message
        embedding_response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=user_prompt,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=768 #match for the db
            )
        )
        prompt_vector = embedding_response.embeddings[0].values

        user_message = ChatMemory.objects.create(
            user=user,
            role='user',
            text_content=user_prompt,
            embedding=prompt_vector
        )

        # 2. Retrieve Past Memory Context
        relevant_memories = ChatMemory.objects.filter(user=user).order_by(
            CosineDistance('embedding', prompt_vector)
        )[:3]

        context_string = f"User Profile: Name: {user.username}, Age: {user.age}, Gender: {user.gender}, Height: {user.height_cm}cm.\n\n"
        context_string += "Relevant Past Conversation History:\n"
        
        for memory in relevant_memories:
            context_string += f"{memory.role.capitalize()}: {memory.text_content}\n"

        # 3. Fetch Recent Database Ledger (Rolling 7-Day Context)
        today = timezone.localdate()
        seven_days_ago = today - timedelta(days=7)
        
        recent_foods = FoodEntry.objects.filter(
            user=user, 
            created_at__date__gte=seven_days_ago
        ).order_by('-created_at')
        
        food_context = "Recent Food Ledger (Last 7 Days):\n"
        if recent_foods.exists():
            current_date_str = ""
            for food in recent_foods:
                # Group foods by their specific date so the AI understands timelines
                food_date = food.created_at.strftime("%Y-%m-%d")
                if food_date != current_date_str:
                    food_context += f"\n--- Date: {food_date} ---\n"
                    current_date_str = food_date
                
                food_context += f"- {food.item_name}: {food.calories} kcal, {food.protein}g protein, {food.carbs}g carbs, {food.fats}g fats\n"
        else:
            food_context += "- No meals have been logged in the past 7 days.\n"

        # 4. Construct Final Prompt combining all contexts
        today_date_string = timezone.localdate().strftime("%A, %B %d, %Y")
        
        final_prompt = (
            "You are HealthSync, an empathetic and highly concise AI dietary assistant. "
            f"CRITICAL CONTEXT: Today's exact date is {today_date_string}. " # Add this line!
            "CRITICAL RULES:\n"
            "1. CONTINUOUS CONVERSATION: Do not start responses with 'Hello [Name]'. Treat this as a continuous conversation.\n"
            "2. CONTEXT AWARENESS: Use the past conversation history and user profile to maintain context.\n"
            "3. LEDGER PRIORITY: If the user asks about what they ate, refer exclusively to the 'Recent Food Ledger' dates.\n"
            "4. Keep all responses very short, natural, and scannable.\n"
            "5. GENTLE NUDGING: If the user logged unhealthy food options today, politely nudge the user towards goal\n\n"
            "6. SUGGESTION: If user asks what they should eat, using the time of user message refer to whether its a breakfast, lunch or dinner. Then provide suggestions of food that combines to the remaining required calories and macros"
            f"{context_string}\n"
            f"{food_context}\n\n"
            f"Current User Message: {user_prompt}"
        )
        print(f"Final Prompt: \n {final_prompt}")

        # 5. Generate AI Response
        response = client.models.generate_content(
            model=TEXT_MODEL,
            contents=final_prompt
        )
        ai_response_text = response.text

        # 6. Embed and Save AI Response
        ai_embedding_response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=ai_response_text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768
            )
        )
        ai_vector = ai_embedding_response.embeddings[0].values

        ai_message = ChatMemory.objects.create(
            user=user,
            role='model',
            text_content=ai_response_text,
            embedding=ai_vector
        )

        return Response({
            "user_message": ChatMemorySerializer(user_message).data,
            "ai_response": ChatMemorySerializer(ai_message).data
        }, status=status.HTTP_201_CREATED)
    
class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = ChatMemory.objects.filter(user=request.user).order_by('timestamp')
        serializer = ChatMemorySerializer(history, many=True)
        return Response(serializer.data)