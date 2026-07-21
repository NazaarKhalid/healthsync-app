import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from chat.models import ChatMemory 
from tracker.models import FoodEntry 

class Command(BaseCommand):
    help = 'Creates a test account and seeds realistic dummy data without hitting API limits.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seeding...")
        User = get_user_model()

        username = 'tester'
        password = 'testpassword123'
        
        if User.objects.filter(username=username).exists():
            User.objects.get(username=username).delete()
            
        test_user = User.objects.create_user(username=username, password=password, email="test@healthsync.com")
        
        today = timezone.now()
        dummy_vector = [0.0] * 768 

        scenarios = [
            {
                "user": "I just ate two huge slices of chocolate cake and feel awful about it.",
                "ai": "Hey, take a breath! One heavy dessert doesn't erase your progress. Let's just focus on drinking an extra glass of water tonight and hitting your protein goal tomorrow. You're doing fine!"
            },
            {
                "user": "Logged my lunch. It was a chicken salad with olive oil.",
                "ai": "Perfectly balanced. That olive oil is a great source of healthy fats to keep your energy stable through the afternoon."
            },
            {
                "user": "Why have I been feeling so sluggish during my workouts lately?",
                "ai": "Looking at your logs from the past three days, your carbohydrate intake has been about 30% lower than usual. Carbs are your body's primary energy source. Try adding some sweet potatoes or oats before your next session."
            },
            {
                "user": "Just uploaded a photo of my dinner.",
                "ai": "I see it! Looks like grilled salmon, asparagus, and a side of quinoa. I've estimated the portions and logged 450 calories and 35g of protein to your daily ledger."
            },
            {
                "user": "I'm starving but I only have 200 calories left for the day.",
                "ai": "If you're truly hungry, listen to your body. A small, protein-rich snack like greek yogurt or a handful of almonds will keep you full without pushing you too far over. Don't starve yourself for the sake of the numbers."
            }
        ]

        # --- THE FOOD BANK ---
        food_items = [
            "Grilled Chicken Salad with Olive Oil",
            "Overnight Oats and Blueberries",
            "Steak and Sweet Potato Mash",
            "Avocado Toast with Poached Eggs",
            "Salmon and Quinoa Bowl",
            "Greek Yogurt with Almonds",
            "Whey Protein Shake",
            "Turkey and Hummus Wrap",
            "Banana with Peanut Butter",
            "Tofu Stir-fry with Brown Rice"
        ]

        for i in range(30):
            target_date = today - timedelta(days=30 - i)
            daily_scenario = random.choice(scenarios)
            
            entry = FoodEntry.objects.create(
                user=test_user,
                item_name=random.choice(food_items), 
                calories=random.randint(400, 800),
                protein=random.randint(20, 50),
                carbs=random.randint(30, 80),
                fats=random.randint(10, 30)
            )
            FoodEntry.objects.filter(id=entry.id).update(created_at=target_date)

            user_msg = ChatMemory.objects.create(
                user=test_user, 
                role='user',
                text_content=daily_scenario["user"],
                embedding=dummy_vector
            )
            ChatMemory.objects.filter(id=user_msg.id).update(timestamp=target_date)
            
            ai_msg = ChatMemory.objects.create(
                user=test_user, 
                role='model',
                text_content=daily_scenario["ai"],
                embedding=dummy_vector
            )
            ChatMemory.objects.filter(id=ai_msg.id).update(timestamp=target_date + timedelta(minutes=1))

        self.stdout.write(self.style.SUCCESS("Successfully seeded 30 days of highly realistic data"))