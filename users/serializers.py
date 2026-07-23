from rest_framework import serializers
from .models import HealthUser

class HealthUserSerializer(serializers.ModelSerializer):
    target_calories = serializers.SerializerMethodField()
    target_protein = serializers.SerializerMethodField()
    target_carbs = serializers.SerializerMethodField()
    target_fats = serializers.SerializerMethodField()

    class Meta:
        model = HealthUser
        fields = [
            'id', 'username', 'age', 'gender', 'height_cm', 'weight_kg', 
            'activity_level', 'primary_goal', 'last_checkin',
            'target_calories', 'target_protein', 'target_carbs', 'target_fats'
        ]

    def get_tdee_and_macros(self, obj):
        if not all([obj.age, obj.gender, obj.height_cm, obj.weight_kg, obj.activity_level, obj.primary_goal]):
            return 2000, 100, 200, 50

        if obj.gender.lower() == 'male':
            bmr = (10 * obj.weight_kg) + (6.25 * obj.height_cm) - (5 * obj.age) + 5
        else:
            bmr = (10 * obj.weight_kg) + (6.25 * obj.height_cm) - (5 * obj.age) - 161

        activity_multipliers = {
            'Sedentary': 1.2,
            'Lightly Active': 1.375,
            'Moderately Active': 1.55,
            'Very Active': 1.725
        }
        multiplier = activity_multipliers.get(obj.activity_level, 1.2)
        tdee = bmr * multiplier

        if obj.primary_goal == 'Lose Weight':
            target_calories = tdee - 500
            protein_multiplier = 2.2
        elif obj.primary_goal == 'Build Muscle':
            target_calories = tdee + 500
            protein_multiplier = 2.0
        else:
            target_calories = tdee
            protein_multiplier = 1.8
        
        target_calories = max(1200, int(target_calories))

        target_protein = int(obj.weight_kg * protein_multiplier)
        
        target_fats = int((target_calories * 0.25) / 9)
        
        protein_cals = target_protein * 4
        fats_cals = target_fats * 9
        remaining_cals = target_calories - protein_cals - fats_cals
        
        target_carbs = max(50, int(remaining_cals / 4))

        return target_calories, target_protein, target_carbs, target_fats

    def get_target_calories(self, obj):
        cals, _, _, _ = self.get_tdee_and_macros(obj)
        return cals

    def get_target_protein(self, obj):
        _, p, _, _ = self.get_tdee_and_macros(obj)
        return p

    def get_target_carbs(self, obj):
        _, _, c, _ = self.get_tdee_and_macros(obj)
        return c

    def get_target_fats(self, obj):
        _, _, _, f = self.get_tdee_and_macros(obj)
        return f