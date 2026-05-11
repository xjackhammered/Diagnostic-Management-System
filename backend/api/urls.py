from django.urls import path
from . import views

urlpatterns = [

    path('auth/csrf/',    views.csrf_token,   name='csrf-token'),
    path('auth/login/',   views.login_view,   name='login'),
    path('auth/logout/',  views.logout_view,  name='logout'),
    path('auth/me/',      views.me,           name='me'),

    path('collaborator/login/',                          views.collaborator_login,          name='collaborator-login'),
    path('collaborator/logout/',                         views.collaborator_logout,         name='collaborator-logout'),
    path('collaborator/me/',                             views.collaborator_me,             name='collaborator-me'),
    path('collaborator/bookings/',                       views.collaborator_bookings,       name='collaborator-bookings'),
    path('collaborator/bookings/<int:pk>/complete/',     views.toggle_booking_completion,   name='toggle-completion'),

    path('patients/',                    views.patient_list,     name='patient-list'),
    path('patients/<int:pk>/',           views.patient_detail,   name='patient-detail'),
    path('patients/<int:pk>/followup/',  views.patient_followup, name='patient-followup'),

    path('doctors/',           views.doctor_list,   name='doctor-list'),
    path('doctors/<int:pk>/',  views.doctor_detail, name='doctor-detail'),

    path('collaborators/',           views.collaborator_list,   name='collaborator-list'),
    path('collaborators/<int:pk>/',  views.collaborator_detail, name='collaborator-detail'),

    path('diagnostics/',           views.diagnostic_list,   name='diagnostic-list'),
    path('diagnostics/<int:pk>/',  views.diagnostic_detail, name='diagnostic-detail'),

    path('collaborator-tests/',           views.collaborator_test_list,   name='collaborator-test-list'),
    path('collaborator-tests/<int:pk>/',  views.collaborator_test_detail, name='collaborator-test-detail'),

    path('bookings/stats/',        views.booking_stats,  name='booking-stats'),
    path('bookings/',              views.booking_list,   name='booking-list'),
    path('bookings/<int:pk>/',     views.booking_detail, name='booking-detail'),
    path('bookings/<int:pk>/pdf/', views.booking_pdf,    name='booking-pdf'),

    path('revenue/breakdown/',   views.revenue_breakdown, name='revenue-breakdown'),
    path('payments/',            views.payment_list,      name='payment-list'),
    path('payments/<int:pk>/',   views.payment_detail,    name='payment-detail'),

]