from django.db import models
from django.contrib.auth.models import AbstractUser

class HealthUser(AbstractUser):
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    height_cm = models.FloatField(null=True, blank=True) 
    weight_kg = models.FloatField(null=True, blank=True)
    activity_level = models.CharField(max_length=50, blank=True)
    primary_goal = models.CharField(max_length=50, blank=True)
    
    last_checkin = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.username