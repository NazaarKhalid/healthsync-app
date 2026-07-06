from django.urls import path
from .views import ManualMealLogView, ImageMealLogView, DailyMacroSummaryView, FoodHistoryView

urlpatterns = [
    path('log/manual/', ManualMealLogView.as_view(), name='manual-log'),
    path('log/vision/', ImageMealLogView.as_view(), name='vision-log'),
    path('summary/', DailyMacroSummaryView.as_view(), name='macro-summary'),
    path('history/', FoodHistoryView.as_view(), name='food-history'), # New endpoint!
]