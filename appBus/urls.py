from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/auth/register/', views.register, name='api-register'),
    path('api/auth/login/', views.login, name='api-login'),
    path('api/auth/logout/', views.logout, name='api-logout'),
    path('api/auth/me/', views.me, name='api-me'),
    path('api/students/', views.get_students, name='api-students'),
    path('api/students/<str:student_id>/status/', views.update_student_status, name='api-student-status'),
]
