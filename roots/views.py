from django.shortcuts import render
from characters.models import Character


def get_eon():
    eon, _ = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    return eon


def eon_apartment(request):
    eon = get_eon()

    items = {
        'helmet': {'title': 'Старый нейрошлем «Сибертек НСША»',
                   'text': 'Треснувший поликарбонат визора, потертый логотип корпорации, которой больше нет.'
                           ' Тим починил его из жалости. Внутри еще греется старый адаптер.'
                   },
        'photo': {'title': 'Потрепанная фотография',
                  'text': 'Женщина с усталыми глазами держит на руках смеющуюся девочку.'
                  },
        'communicator': {'title': 'Старый коммуникатор',
                         'text': 'На экране — непрочитанное сообщение от управляющей компании: "Ваша задолженность за январь составляет 143 доллара.'
                                 ' Напоминаем, что вы должны погасить всякую задолженность до 29.02.89 или Вы будете выселены из квартиры."'
                         },
        'drawer': {'title': 'Ящик стола',
                   'text': 'Внутри — просроченный счёт от "Правового союза", моток синей изоленты, сломанная зажигалка и несколько монет.'
                                                  ' И старый жетон доступа в порт.'
                   },
        'window': {'title': 'Окно',
                   'text': 'Вид на бесконечную шахту лифтов. Гирлянда из красных фонариков напоминает,'
                                            ' что сейчас Китайский Новый год. Где-то далеко грохочут салюты,'
                                            ' но здесь, в Корнях, слышен только гул вентиляции. И шум соседей за стеной.'
                   }
        }

    # Получаем параметр item из URL
    selected_item = request.GET.get('item')
    item_detail = None
    if selected_item in items:
        item_detail = items[selected_item]

    context = {
        'location_name': 'Квартира Эона',
        'description': 'Двадцать квадратных метров в Корнях. Пахнет табаком, озоном и чем-то еще — наверное, безнадежностью.',
        'character': eon,
        'items': items,
        'selected_item': selected_item,
        'item_detail': item_detail
    }
    return render(request, 'roots/apartment.html', context)

