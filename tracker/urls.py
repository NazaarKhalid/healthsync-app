from django.urls import path
from .views import ManualMealLogView, ImageMealLogView, DailyMacroSummaryView, FoodHistoryView, FoodHistoryDetailView

urlpatterns = [
    path('log/manual/', ManualMealLogView.as_view(), name='manual-log'),
    path('log/vision/', ImageMealLogView.as_view(), name='vision-log'),
    path('summary/', DailyMacroSummaryView.as_view(), name='macro-summary'),
    path('history/', FoodHistoryView.as_view(), name='food-history'),
    path('history/<int:pk>/', FoodHistoryDetailView.as_view(), name='food-history-detail'),

]