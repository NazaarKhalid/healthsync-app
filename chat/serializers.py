from rest_framework import serializers
from .models import ChatMemory

class ChatMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMemory
        fields = ['id', 'role', 'text_content', 'timestamp']