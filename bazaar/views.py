from django.shortcuts import render, redirect
from characters.models import Character
from django.views.decorators.http import require_POST
import random


def get_eon():
    eon, _ = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    return eon


def bazaar_index(request):
    context = {
        'district_name': 'Базар',
        'description': 'Здесь, на этажах 25-50, никогда не затихает шум. Запах жареного масла смешивается с выхлопными газами дронов,'
                       ' а из тумана неоновых вывесок доносятся обрывки фраз на Бахаса Пасар. Торговля идёт днём и ночью.'
    }
    return render(request, 'bazaar/index.html', context)


def chans_diner(request):
    context = {
        'location_name': 'Забегаловка Мистера Чана',
        'description': 'Узкое помещение, залитое тёплым жёлтым светом. За прилавком возвышается Мистер Чан — огромный,'
                       ' вспыльчивый, но надёжный, как старый дрон. В углу, свернув манипуляторы, спит курьер Мистер Чу.'
                       ' Пахнет острым соусом и дешёвым маслом.',
        'chan_quote': '"Ты не ноёшь — это редкость. Ладно, есть одна работа... Но учти, если не вернёшься, долг повешу на твоего тупого приятеля."'
    }
    return render(request, 'bazaar/location.html', context)


def old_coffeehouse(request):
    eon = get_eon()
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'accept':
            eon.stress += 15
            eon.save()
            return redirect('timos_workshop')

        elif action == 'refuse':
            eon.stress -= 5
            eon.save()
            return redirect('timos_workshop')
    context = {
        'location_name': 'Старая кофейня',
        'description': 'Здесь всегда полумрак. За столиком у окна часто сидит Лилит — высокая худая блондинка с увядающей'
                       ' красотой и неизменной ментоловой сигаретой. Она не задаёт вопросов и не любит, когда их задают ей.',
        'lilith_quote': '"Слушай, у тебя завтра днём дела? Может, просто выпьем кофе. А может, я вру. Я вообще много вру."'
    }
    return render(request, 'bazaar/location.html', context)


@require_POST
def take_job(request):
    eon = get_eon()
    eon.stress += 10
    eon.credits += random.randint(100, 300)
    eon.save()
    return redirect('timos_workshop')


@require_POST
def refuse_job(request):
    eon = get_eon()
    eon.stress -= 5
    eon.save()
    return redirect('timos_workshop')