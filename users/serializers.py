from rest_framework import serializers
from .models import HealthUser

class HealthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthUser
        fields = ['id', 'username', 'age', 'gender', 'height_cm', 'weight_kg', 'last_checkin']