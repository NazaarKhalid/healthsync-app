from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import HealthUserSerializer
from django.contrib.auth import get_user_model

class OnboardingView(APIView):
    permission_classes = [IsAuthenticated] 

    def post(self, request):
        user = request.user
        serializer = HealthUserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Profile metrics updated successfully.",
                "user": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = HealthUserSerializer
    permission_classes = [IsAuthenticated]

    # This ensures the user doesn't have to pass an ID in the URL.
    # The view automatically grabs the user from the JWT token.
    def get_object(self):
        return self.request.user