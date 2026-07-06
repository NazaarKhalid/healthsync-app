# tracker/nudge_logic.py

def calculate_tdee(user):
    """Calculates personalized daily calorie limit based on profile attributes."""
    if not all([user.weight_kg, user.height_cm, user.age, user.gender]):
        return 2000 # Safe fallback if profile is somehow incomplete
    
    if user.gender.lower() == 'male':
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) + 5
    else:
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) - 161
        
    # Multiply by 1.2 assuming a baseline sedentary lifestyle 
    return bmr * 1.2

def evaluate_meal_for_nudge(user, meal_name, meal_calories, meal_fats, current_daily_total):
    """
    Evaluates if a logged meal should trigger an AI nudging response.
    Returns a list of trigger reasons, or an empty list if the meal is fine.
    """
    tdee = calculate_tdee(user)
    triggers = []

    # 1. Total Daily Calories Exceeded
    if (current_daily_total + meal_calories) > tdee:
        triggers.append(f"Exceeded daily limit of {int(tdee)} calories.")

    # 2. Disproportionately Massive Single Meal (> 40% of daily allowance)
    if meal_calories > (tdee * 0.40):
        triggers.append("Single meal is excessively dense in calories.")

    # 3. Unhealthy Fats & Junk Food / Cold Drinks Keywords
    # We flag it if it's known junk OR if it has excessive fats for a single serving
    junk_keywords = ['soda', 'cola', 'pepsi', 'cold drink', 'sprite', 'fried', 'chips', 'burger', 'pizza']
    is_junk_name = any(word in meal_name.lower() for word in junk_keywords)
    
    if is_junk_name or meal_fats > 25:
        triggers.append("Contains high fats or sugary/processed ingredients.")

    return triggers