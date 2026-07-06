from django.urls import path
from .views import ChatEngineView, ChatHistoryView

urlpatterns = [
    path('stream/', ChatEngineView.as_view(), name='chat-engine'),
    path('history/', ChatHistoryView.as_view(), name='chat-history'),
]