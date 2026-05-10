from http.client import responses

from django.shortcuts import render, get_object_or_404
from characters.models import Character
import json
from django.http import JsonResponse
from .models import DronePuzzle
from .drone_checker import check_program


def get_eon():
    eon, _ = Character.objects.get_or_create(pk=1, defaults={'name': 'Эон'})
    return eon


def timos_workshop(request):
    eon = get_eon()

    puzzles = DronePuzzle.objects.filter(character=eon).order_by('id')
    unsolved_puzzle = puzzles.filter(is_solved=False).first()
    solved_count = puzzles.filter(is_solved=True).count()

    if unsolved_puzzle:
        quote = (f'"О, Эон! У меня тут {unsolved_puzzle.name} полетел. Чип маршрутизатора барахлит.'
                 f' Если починишь — с меня пиво. Ну, или хотя бы не ворчи, что я опять твои инструменты трогал."')
    elif solved_count > 0:
        quote = f'"Все дроны летают, как новенькие. Спасибо, брат. Если что ещё сломается – ты первый, кому позвоню."'
    else:
        quote = '"У тебя руки золотые, но не с того конца растут. Ладно, проходи, не стой в дверях."'

    context = {
        'location_name': 'Мастерская Тимо',
        'description': 'В воздухе пахнет озоном, канифолью и машинным маслом. Тимо возится у верстака,'
                       ' его протезы тихо жужжат.',
        'timo_quote': quote,
        'character': eon,
        'unsolved_puzzle': unsolved_puzzle,
    }
    return render(request, 'shaft/location.html', context)


def drone_puzzle_view(request, puzzle_id):
    puzzle = get_object_or_404(DronePuzzle, pk=puzzle_id)
    broken = json.loads(puzzle.broken_cells)  # Список списков

    # Данные для сетки
    cells = []
    for y in range(puzzle.grid_height):
        for x in range(puzzle.grid_width):
            cells.append({
                'x': x,
                'y': y,
                'is_start': x == puzzle.start_x and y == puzzle.start_y,
                'is_finish': x == puzzle.finish_x and y == puzzle.finish_y,
                'is_broken': [x, y] in broken,
            })

    if request.method == 'POST':
        program = request.POST.get('program', '')
        result = check_program(program, puzzle, broken)
        if result['success']:
            puzzle.is_solved = True
            puzzle.save()
        return JsonResponse(result)

    context = {
        'puzzle': puzzle,
        'broken_json': puzzle.broken_cells,
        'cells': cells,
    }

    return render(request, 'shaft/drone_puzzle.html', context)


