from django.contrib import admin
from .models import DronePuzzle


@admin.register(DronePuzzle)
class DronePuzzleAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_solved', 'character')  # что показывает в списке
    list_filter = ('is_solved',)  # фильтр по статусу