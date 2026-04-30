from django.urls import path
from . import views

urlpatterns = [

    
    path('patients/', views.patient_list, name='patient-list'),
    path('patients/<int:pk>/', views.patient_detail, name='patient-detail'),

    
    path('doctors/', views.doctor_list, name='doctor-list'),
    path('doctors/<int:pk>/', views.doctor_detail, name='doctor-detail'),

    
    path('collaborators/', views.collaborator_list, name='collaborator-list'),
    path('collaborators/<int:pk>/', views.collaborator_detail, name='collaborator-detail'),

    
    path('diagnostics/', views.diagnostic_list, name='diagnostic-list'),
    path('diagnostics/<int:pk>/', views.diagnostic_detail, name='diagnostic-detail'),

    
    path('collaborator-tests/', views.collaborator_test_list, name='collaborator-test-list'),
    path('collaborator-tests/<int:pk>/', views.collaborator_test_detail, name='collaborator-test-detail'),

    
    path('bookings/stats/', views.booking_stats, name='booking-stats'),   # must be before <pk>
    path('bookings/', views.booking_list, name='booking-list'),
    path('bookings/<int:pk>/', views.booking_detail, name='booking-detail'),
    path('bookings/<int:pk>/pdf/', views.booking_pdf, name='booking-pdf'),

]