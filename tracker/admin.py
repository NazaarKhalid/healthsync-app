from django.contrib import admin
from .models import HealthAttribute, FoodEntry

# Register your models here.

admin.site.register(HealthAttribute)
admin.site.register(FoodEntry)