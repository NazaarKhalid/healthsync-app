def calculate_tdee(user):
    if not all([user.weight_kg, user.height_cm, user.age, user.gender]):
        return 2000 # Safe fallback if profile is somehow incomplete
    
    if user.gender.lower() == 'male':
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) + 5
    else:
        bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) - 161
        
    return bmr * 1.2

def evaluate_meal_for_nudge(user, meal_name, meal_calories, meal_fats, current_daily_total):
    """
    Evaluates if a logged meal should trigger an AI nudging response.
    Returns a list of trigger reasons, or an empty list if the meal is fine.
    """
    tdee = calculate_tdee(user)
    triggers = []

    if (current_daily_total + meal_calories) > tdee:
        triggers.append(f"Exceeded daily limit of {int(tdee)} calories.")

    if meal_calories > (tdee * 0.40):
        triggers.append("Single meal is excessively dense in calories.")

    junk_keywords = ['soda', 'cola', 'pepsi', 'cold drink', 'sprite', 'fried', 'chips', 'burger', 'pizza']
    is_junk_name = any(word in meal_name.lower() for word in junk_keywords)
    
    if is_junk_name or meal_fats > 25:
        triggers.append("Contains high fats or sugary/processed ingredients.")

    return triggers