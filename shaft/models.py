from django.db import models
from characters.models import Character


class DronePuzzle(models.Model):
    name = models.CharField(max_length=100)
    grid_width = models.IntegerField(default=3)
    grid_height = models.IntegerField(default=3)
    start_x = models.IntegerField(default=0)
    start_y = models.IntegerField(default=0)
    finish_x = models.IntegerField(default=2)
    finish_y = models.IntegerField(default=2)
    # Список координат поломанных клеток в JSON: "[[1,0],[2,1]]"
    broken_cells = models.TextField(default='[]')

    # Прогресс игрока (связь с персонажем)
    character = models.ForeignKey(Character, on_delete=models.CASCADE)
    is_solved = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.name} ({"Решено" if self.is_solved else "Не решено"})'