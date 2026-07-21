import json
from pydantic import BaseModel
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
from django.utils import timezone
from tracker.models import FoodEntry
from datetime import timedelta

client = genai.Client(api_key=settings.GEMINI_API_KEY)

TEXT_MODEL = 'gemini-3.5-flash'
EMBEDDING_MODEL = 'gemini-embedding-001'

class ChatResponseBlueprint(BaseModel):
    is_food_log: bool
    item_name: str
    calories: int
    protein: int
    carbs: int
    fats: int
    message: str

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
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=768)
        )
        prompt_vector = embedding_response.embeddings[0].values

        user_message = ChatMemory.objects.create(
            user=user, role='user', text_content=user_prompt, embedding=prompt_vector
        )

        # 2. FAST SHORT-TERM MEMORY
        recent_memories = ChatMemory.objects.filter(user=user).exclude(id=user_message.id).order_by('-timestamp')[:4]
        short_term_context = "Recent Conversation Context:\n"
        for mem in reversed(recent_memories): 
            short_term_context += f"{mem.role.capitalize()}: {mem.text_content}\n"

        # 3. Tools
        master_tools = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="search_past_conversations",
                    description="Search deep chat history. Use ONLY if the user asks about past conversations, concepts discussed, or preferences.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "query": types.Schema(
                                type=types.Type.STRING,
                                description="A specific, detailed search query to find in past conversations.",
                            )
                        },
                        required=["query"],
                    )
                ),
                types.FunctionDeclaration(
                    name="search_lifetime_food_ledger",
                    description="Search the user's entire lifetime database of logged meals and account details.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "query_type": types.Schema(
                                type=types.Type.STRING,
                                description="Must be one of: 'first_food' (to find the very first meal ever logged), 'account_creation' (to find when they joined), or 'specific_food' (to search for a specific food name).",
                            ),
                            "food_name": types.Schema(
                                type=types.Type.STRING,
                                description="The specific food name to search for if query_type is 'specific_food'. Otherwise leave empty.",
                            )
                        },
                        required=["query_type"],
                    )
                )
            ]
        )

        # 4. Fetch Recent Database Ledger 7 day
        today = timezone.localdate()
        seven_days_ago = today - timedelta(days=7)
        
        recent_foods = FoodEntry.objects.filter(
            user=user, created_at__date__gte=seven_days_ago
        ).order_by('-created_at')
        
        food_context = "Recent Food Ledger (Last 7 Days):\n"
        if recent_foods.exists():
            current_date_str = ""
            for food in recent_foods:
                food_date = food.created_at.strftime("%Y-%m-%d")
                if food_date != current_date_str:
                    food_context += f"\n--- Date: {food_date} ---\n"
                    current_date_str = food_date
                food_context += f"- {food.item_name}: {food.calories} kcal, {food.protein}g protein, {food.carbs}g carbs, {food.fats}g fats\n"
        else:
            food_context += "- No meals have been logged in the past 7 days.\n"

        # 5. Tool-Decision Prompt (PASS 1)
        pass1_prompt = (
            "You are a routing assistant for HealthSync. You have tools to search a database.\n"
            "Review the user's message. If you need to search past conversations or the lifetime food ledger to answer, USE THE APPROPRIATE TOOL.\n"
            "If you DO NOT need a tool (because the answer is in the immediate context, or it's a casual chat, or the requested search is impossible), DO NOT USE A TOOL. Just reply with the exact word: 'CONTINUE'.\n\n"
            f"--- RECENT CHAT HISTORY ---\n{short_term_context}\n\n"
            f"--- RECENT FOOD LEDGER ---\n{food_context}\n\n"
            f"CURRENT USER MESSAGE: {user_prompt}"
        )

        try:
            # 6. FIRST PASS: Tool Check 
            response1 = client.models.generate_content(
                model=TEXT_MODEL,
                contents=pass1_prompt,
                config=types.GenerateContentConfig(
                    tools=[master_tools],
                    temperature=0.1, 
                )
            )

            tool_result_text = ""
            
            # 7. THE INTERCEPT ROUTER
            if response1.function_calls:
                function_call = response1.function_calls[0]
                tool_name = function_call.name
                
                print("\n=============================================")
                print(f"🔫 AI TRIGGERED TOOL: {tool_name}")
                print("=============================================\n")

                if tool_name == "search_past_conversations":
                    search_query = function_call.args.get("query", "")
                    query_vec = client.models.embed_content(
                        model=EMBEDDING_MODEL,
                        contents=search_query,
                        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=768)
                    ).embeddings[0].values

                    deep_memories = ChatMemory.objects.filter(user=user).exclude(id=user_message.id).order_by(
                        CosineDistance('embedding', query_vec)
                    )[:4]

                    if not deep_memories:
                        tool_result_text = "No previous records found for this query."
                    else:
                        tool_result_text = "Found these records in the deep archives:\n"
                        for m in deep_memories:
                            tool_result_text += f"{m.role.capitalize()}: {m.text_content}\n"

                elif tool_name == "search_lifetime_food_ledger":
                    query_type = function_call.args.get("query_type", "")
                    food_name = function_call.args.get("food_name", "")
                    
                    if query_type == "first_food":
                        first_meal = FoodEntry.objects.filter(user=user).order_by('created_at').first()
                        if first_meal:
                            tool_result_text = f"The user's first logged meal was: {first_meal.item_name} on {first_meal.created_at.strftime('%B %d, %Y')}."
                        else:
                            tool_result_text = "The user has not logged any foods yet."
                    
                    elif query_type == "account_creation":
                        joined_date = getattr(user, 'date_joined', None)
                        if joined_date:
                            tool_result_text = f"The user created their account on {joined_date.strftime('%B %d, %Y')}."
                        else:
                            tool_result_text = "Account creation date is unavailable."
                            
                    elif query_type == "specific_food" and food_name:
                        matches = FoodEntry.objects.filter(user=user, item_name__icontains=food_name).order_by('-created_at')[:5]
                        if matches:
                            tool_result_text = f"Recent lifetime logs for {food_name}:\n"
                            for m in matches:
                                tool_result_text += f"- {m.item_name} on {m.created_at.strftime('%B %d, %Y')} ({m.calories} kcal)\n"
                        else:
                            tool_result_text = f"The user has never logged a meal matching '{food_name}'."
                    else:
                        tool_result_text = "Invalid search query parameters."

            # 8. SECOND PASS: Construct Final Prompt (Enforce JSON)
            today_date_string = timezone.localdate().strftime("%A, %B %d, %Y")
            
            pass2_prompt = (
                "You are HealthSync, an empathetic AI dietary assistant.\n"
                f"CURRENT SYSTEM DATE: {today_date_string}\n\n"
                "CRITICAL RULES:\n"
                "1. JSON RESPONSE ONLY: You must reply with a valid JSON object matching the schema.\n"
                "2. NATURAL LANGUAGE LOGGING: If the user states they ate something, set is_food_log to true, estimate macros, and provide a confirming 'message'.\n"
                "3. TONE CONTROL & GENERAL KNOWLEDGE (CRITICAL): If a user asks for a aggregate sum of a metric you do not track in your database (like vitamins or minerals), state naturally that you don't have it recorded. HOWEVER, if a user asks about the general nutritional facts of a specific food they just logged (e.g., 'How much potassium is in a banana?'), do NOT use the fallback phrase. Use your general knowledge to answer their question directly while reminding them it won't be stored in their daily ledger totals.\n"
                "4. HEALTH NUDGING (CRITICAL): You are a coach, not just a calculator. If the user logs an exceptionally unhealthy or high-calorie meal (e.g., multiple fast food items, 2000+ calories in one sitting), your 'message' MUST include a gentle, empathetic, but candid nudge. Validate their choice without guilt-tripping, but ground them in reality by suggesting hydration or a lighter, balanced next meal.\n\n"
                "--- USER PROFILE ---\n"
                f"Name: {user.username}, Age: {user.age}, Gender: {user.gender}, Height: {user.height_cm}cm.\n\n"
                f"--- RECENT CHAT HISTORY ---\n{short_term_context}\n\n"
                f"--- RECENT FOOD LEDGER ---\n{food_context}\n\n"
            )
            
            if tool_result_text:
                pass2_prompt += f"--- DATABASE SEARCH RESULT ---\nThe following information was retrieved from the database to help you answer the user:\n{tool_result_text}\n\n"
                
            pass2_prompt += f"CURRENT USER MESSAGE: {user_prompt}"

            response2 = client.models.generate_content(
                model=TEXT_MODEL,
                contents=pass2_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ChatResponseBlueprint,
                )
            )

            # 9. SAVE & RETURN
            raw_text = response2.text.strip()
            
            ai_data = json.loads(raw_text)
            ai_response_text = ai_data.get("message", "I've updated your log.")
            is_food_log = ai_data.get("is_food_log", False)

            if is_food_log and ai_data.get("calories", 0) > 0:
                FoodEntry.objects.create(
                    user=user,
                    item_name=ai_data.get("item_name", "AI Logged Meal"),
                    calories=ai_data.get("calories", 0),
                    protein=ai_data.get("protein", 0),
                    carbs=ai_data.get("carbs", 0),
                    fats=ai_data.get("fats", 0)
                )

        except Exception as e:
            print("====== GEMINI API CRASH ======")
            print(str(e))
            return Response({"error": "AI Error."}, status=500)

        # 10. Embed and Save AI Response
        ai_embedding_response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=ai_response_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", output_dimensionality=768)
        )
        ai_vector = ai_embedding_response.embeddings[0].values

        ai_message = ChatMemory.objects.create(
            user=user, role='model', text_content=ai_response_text, embedding=ai_vector
        )

        return Response({
            "user_message": ChatMemorySerializer(user_message).data,
            "ai_response": ChatMemorySerializer(ai_message).data,
            "meal_logged": is_food_log
        }, status=status.HTTP_201_CREATED)

class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = ChatMemory.objects.filter(user=request.user).order_by('timestamp')
        serializer = ChatMemorySerializer(history, many=True)
        return Response(serializer.data)