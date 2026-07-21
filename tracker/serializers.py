from rest_framework import serializers
from .models import FoodEntry
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model


class FoodEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodEntry
        fields = ['id', 'user', 'item_name', 'calories', 'protein', 'carbs', 'fats', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class FoodVisionBlueprintSerializer(serializers.Serializer):
    is_food = serializers.BooleanField()
    item_name = serializers.CharField(max_length=255)
    calories = serializers.IntegerField(min_value=0)
    protein = serializers.IntegerField(min_value=0)
    carbs = serializers.IntegerField(min_value=0)
    fats = serializers.IntegerField(min_value=0)


User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        # Extract the password
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        
        user.set_password(password) 
        
        user.save()
        return user