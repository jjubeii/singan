from django.shortcuts import render
from characters.models import Character
import random


def get_eon():
    eon, _ = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    return eon


def aurora_restaurant(request):
    eon = get_eon()
    if eon.clearance_index >= 60:
        context = {
            'access_granted': True,
            'location_name': 'Ресторан "Аврора"',
            'description': 'Вы входите в зал, наполненный светом тысячи свечей. Огромные панорамные окна открывают вид на весь город.'
        }
        return render(request, 'canopy/aurora.html', context)
    else:
        events = [
            {'title': 'Пьяный богач', 'weight': 10,
             'text': 'Из дверей вываливается пьяный мужчина в дорогом костюме. Он презрительно смотрит на вас и бросает горсть кредитов,'
                     ' после чего падает в подоспевший лимузин.'},
            {'title': 'Знакомый силуэт', 'weight': 5,
             'text': 'Сквозь стеклянные двери вы видите Лилит, которая беседует с каким-то пожилым господином. '
                     'Она замечает вас, но делает вид что не узнала.'},
            {'title': 'Сбой электронного замка', 'weight': 0.1,
             'text': 'Экран доступа на секунду гаснет и снова загорается, показывая код ошибки 47-Б.'
                     ' Вэй говорил, что эта ошибка иногда открывает двери, которые должны быть закрыты. Может, стоит рассказать ему?'},
            {'title': 'Бездомный с укулеле', 'weight': 15,
             'text': 'На другой стороне улицы сидит старик с потрепанной укулеле. Он бренчит мелодию, которую вы слышали в детстве,'
                     ' и кивает вам, словно старому знакомому. Вы не помните его лица.'},
            {'title': 'Светлый день', 'weight': 50,
             'text': 'Солнце ярким светом заливает всю улицу, мимо вас неспешно проезжают дорогие автомобили.'
                     ' Из дверей ресторана  доносится запах трюфелей и французских духов.'},
        ]

        event_weights = [event['weight'] for event in events]
        chosen_event = random.choices(events, weights=event_weights, k=1)[0]

        context = {
            'access_granted': False,
            'location_name': 'Вход в ресторан "Аврора"',
            'description': 'Там, вдали, виднеется огромный зал, украшенный золотыми гирляндами. Слышна живая музыка, пахнет дорогой едой.'
                           ' Но путь вам преграждает вежливый охранник с неизменным: "Извините, я не могу пропустить вас. Ваш индекс слишком низок."',
            'event': chosen_event,
            'character': eon,
        }
        return render(request, 'canopy/aurora.html', context)

