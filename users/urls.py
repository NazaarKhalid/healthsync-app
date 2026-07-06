from django.urls import path
from .views import OnboardingView, UserProfileView

urlpatterns = [
    path('onboard/', OnboardingView.as_view(), name='user-onboard'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
]