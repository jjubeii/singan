from django.urls import path
from . import views

urlpatterns = [
    path('apartment/', views.eon_apartment, name='eon_apartment')
]