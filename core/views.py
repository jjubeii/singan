from django.shortcuts import render
from characters.models import Character

def main_map(request):
    eon, _ = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    context = {'character': eon}
    return render(request, 'core/main_map.html', context)
