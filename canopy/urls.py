from django.urls import path
from . import views

urlpatterns = [
    path('aurora/', views.aurora_restaurant, name='aurora_restaurant'),
]