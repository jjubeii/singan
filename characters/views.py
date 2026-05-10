from django.shortcuts import render
from .models import Character


def get_eon():
    """Возвращает объект Эона, если он не существует"""
    eon, created = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    return eon


def profile(request):
    """Показывает текущее состояние персонажа"""
    eon = get_eon()
    context = {'character': eon}
    return render(request, 'characters/profile.html', context)
