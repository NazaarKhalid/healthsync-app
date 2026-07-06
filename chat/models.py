from django.db import models
from django.conf import settings
from pgvector.django import VectorField

class ChatMemory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_history')
    
    role = models.CharField(max_length=10) 
    
    text_content = models.TextField()
    
    embedding = VectorField(dimensions=768, null=True, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role}) - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"