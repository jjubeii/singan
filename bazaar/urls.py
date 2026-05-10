from django.urls import path
from . import views


urlpatterns = [
    path('', views.bazaar_index, name='bazaar_index'),
    path('chans-diner/', views.chans_diner, name='chans_diner'),
    path('old-coffeehouse/', views.old_coffeehouse, name='old_coffeehouse' ),
    path('take-job', views.take_job, name='take_job'),
    path('refuse-job', views.refuse_job, name='refuse_job'),
]