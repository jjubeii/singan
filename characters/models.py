from django.db import models

class Character(models.Model):
    name = models.CharField(max_length=100, default='Эон')
    credits = models.IntegerField(default=300)
    stress = models.IntegerField(default=25)
    fatigue = models.IntegerField(default=20)
    clearance_index = models.IntegerField(default=27)

    def __str__(self):
        return f'{self.name} (Стресс: {self.stress}%, Усталость: {self.fatigue}%, Индекс: {self.clearance_index})'