from django.urls import path
from . import views


urlpatterns = [
    path('timo-workshop/', views.timos_workshop, name='timos_workshop'),
    path('drone-puzzle/<int:puzzle_id>/', views.drone_puzzle_view, name='drone_puzzle')
]