from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.db.models import Count, Sum, Q
from django.shortcuts import get_object_or_404
from decimal import Decimal
from urllib.parse import quote
from .models import (
    Patient, Doctor, Collaborator, Diagnostic,
    CollaboratorTest, Booking, BookingItem
)
from .serializers import (
    PatientSerializer, DoctorSerializer, CollaboratorSerializer,
    DiagnosticSerializer, CollaboratorTestSerializer,
    BookingSerializer, BookingCreateSerializer,
)
from .pdf_generator import generate_booking_pdf


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────

def paginate(qs, request):
    """Simple page-based pagination. Returns (slice, meta dict)."""
    page_size = int(request.query_params.get('page_size', 20))
    page = int(request.query_params.get('page', 1))
    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size
    return qs[start:end], {
        'count': total,
        'page': page,
        'page_size': page_size,
        'next': page + 1 if end < total else None,
        'previous': page - 1 if page > 1 else None,
    }


# ──────────────────────────────────────────────
#  PATIENTS
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def patient_list(request):
    """
    GET  /api/patients/  — list patients (?search=name)
    POST /api/patients/  — create a patient
    """
    if request.method == 'GET':
        qs = Patient.objects.all().order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_number__icontains=search) |
                Q(email__icontains=search)
            )
        results, meta = paginate(qs, request)
        serializer = PatientSerializer(results, many=True)
        return Response({**meta, 'results': serializer.data})

    if request.method == 'POST':
        serializer = PatientSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def patient_detail(request, pk):
    """
    GET    /api/patients/<pk>/
    PATCH  /api/patients/<pk>/
    DELETE /api/patients/<pk>/
    """
    patient = get_object_or_404(Patient, pk=pk)

    if request.method == 'GET':
        return Response(PatientSerializer(patient).data)

    if request.method in ('PATCH', 'PUT'):
        serializer = PatientSerializer(patient, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  DOCTORS
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def doctor_list(request):
    """
    GET  /api/doctors/
    POST /api/doctors/
    """
    if request.method == 'GET':
        qs = Doctor.objects.all().order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(contact_number__icontains=search))
        results, meta = paginate(qs, request)
        return Response({**meta, 'results': DoctorSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = DoctorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def doctor_detail(request, pk):
    doctor = get_object_or_404(Doctor, pk=pk)

    if request.method == 'GET':
        return Response(DoctorSerializer(doctor).data)

    if request.method in ('PATCH', 'PUT'):
        serializer = DoctorSerializer(doctor, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        doctor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  COLLABORATORS
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def collaborator_list(request):
    """
    GET  /api/collaborators/
    POST /api/collaborators/
    """
    if request.method == 'GET':
        qs = Collaborator.objects.all().order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        results, meta = paginate(qs, request)
        return Response({**meta, 'results': CollaboratorSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = CollaboratorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def collaborator_detail(request, pk):
    collaborator = get_object_or_404(Collaborator, pk=pk)

    if request.method == 'GET':
        return Response(CollaboratorSerializer(collaborator).data)

    if request.method in ('PATCH', 'PUT'):
        serializer = CollaboratorSerializer(collaborator, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        collaborator.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  DIAGNOSTICS
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def diagnostic_list(request):
    """
    GET  /api/diagnostics/  — list all diagnostic test names (?search=)
    POST /api/diagnostics/  — create a new diagnostic test name
    """
    if request.method == 'GET':
        qs = Diagnostic.objects.all().order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        results, meta = paginate(qs, request)
        return Response({**meta, 'results': DiagnosticSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = DiagnosticSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def diagnostic_detail(request, pk):
    diagnostic = get_object_or_404(Diagnostic, pk=pk)

    if request.method == 'GET':
        return Response(DiagnosticSerializer(diagnostic).data)

    if request.method in ('PATCH', 'PUT'):
        serializer = DiagnosticSerializer(diagnostic, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        diagnostic.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  COLLABORATOR TESTS (price assignment)
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def collaborator_test_list(request):
    """
    GET  /api/collaborator-tests/
         ?collaborator=<id>  filter by collaborator
         ?diagnostic=<id>    filter by diagnostic
         ?search=<name>      search by diagnostic name
    POST /api/collaborator-tests/  — assign a diagnostic to a collaborator with a price
    """
    if request.method == 'GET':
        qs = CollaboratorTest.objects.select_related(
            'collaborator', 'diagnostic'
        ).filter(is_active=True)

        collaborator_id = request.query_params.get('collaborator')
        if collaborator_id:
            qs = qs.filter(collaborator_id=collaborator_id)

        diagnostic_id = request.query_params.get('diagnostic')
        if diagnostic_id:
            qs = qs.filter(diagnostic_id=diagnostic_id)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(diagnostic__name__icontains=search)

        results, meta = paginate(qs, request)
        return Response({**meta, 'results': CollaboratorTestSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = CollaboratorTestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def collaborator_test_detail(request, pk):
    """
    GET    /api/collaborator-tests/<pk>/
    PATCH  /api/collaborator-tests/<pk>/  — update price or active status
    DELETE /api/collaborator-tests/<pk>/  — deactivate (soft delete)
    """
    ct = get_object_or_404(
        CollaboratorTest.objects.select_related('collaborator', 'diagnostic'), pk=pk
    )

    if request.method == 'GET':
        return Response(CollaboratorTestSerializer(ct).data)

    if request.method in ('PATCH', 'PUT'):
        serializer = CollaboratorTestSerializer(ct, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        # Soft delete — keep the record so existing BookingItems still reference it
        ct.is_active = False
        ct.save()
        return Response(
            {'detail': 'Test deactivated. Existing booking history is preserved.'},
            status=status.HTTP_200_OK
        )


# ──────────────────────────────────────────────
#  BOOKINGS
# ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
def booking_list(request):
    """
    GET  /api/bookings/
         ?search=        patient name / phone / booking_id
         ?collaborator=  filter by collaborator id
         ?service_type=  center | home
    POST /api/bookings/  — create a booking
    """
    if request.method == 'GET':
        qs = Booking.objects.select_related(
            'patient', 'collaborator', 'doctor'
        ).prefetch_related('items').all()

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(patient__name__icontains=search) |
                Q(patient__contact_number__icontains=search) |
                Q(booking_id__icontains=search)
            )

        collaborator_id = request.query_params.get('collaborator')
        if collaborator_id:
            qs = qs.filter(collaborator_id=collaborator_id)

        service_type = request.query_params.get('service_type', '').strip()
        if service_type in ('center', 'home'):
            qs = qs.filter(service_type=service_type)

        results, meta = paginate(qs, request)
        return Response({**meta, 'results': BookingSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = BookingCreateSerializer(data=request.data)
        if serializer.is_valid():
            booking = serializer.save()
            return Response(
                BookingSerializer(booking).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
def booking_detail(request, pk):
    """
    GET    /api/bookings/<pk>/
    PATCH  /api/bookings/<pk>/  — update notes, scheduled_at, doctor only
    DELETE /api/bookings/<pk>/
    """
    booking = get_object_or_404(
        Booking.objects.select_related(
            'patient', 'collaborator', 'doctor'
        ).prefetch_related('items'), pk=pk
    )

    if request.method == 'GET':
        return Response(BookingSerializer(booking).data)

    if request.method in ('PATCH', 'PUT'):
        # Only allow updating non-financial fields after creation
        editable = {'notes', 'scheduled_at', 'doctor', 'service_type'}
        data = {k: v for k, v in request.data.items() if k in editable}
        serializer = BookingSerializer(booking, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def booking_pdf(request, pk):
    """
    GET /api/bookings/<pk>/pdf/  — download booking receipt as PDF
    """
    booking = get_object_or_404(
        Booking.objects.select_related(
            'patient', 'collaborator', 'doctor'
        ).prefetch_related('items'), pk=pk
    )
    pdf_buffer = generate_booking_pdf(booking)
    # Strip non-ASCII characters to avoid (anonymous) filename in browsers
    safe_name = ''.join(c for c in booking.patient.name if c.isascii() and (c.isalnum() or c in ' _-')).strip().replace(' ', '_')
    filename = f"{booking.booking_id}_{safe_name}.pdf"
    response = HttpResponse(pdf_buffer, content_type='application/pdf')
    # Use both filename and filename* (RFC 5987) for maximum browser compatibility
    response['Content-Disposition'] = f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"
    return response


@api_view(['GET'])
def booking_stats(request):
    """
    GET /api/bookings/stats/
    Total revenue = our cut: sum of (grand_total * collaborator.percentage / 100) per booking
    """
    bookings = Booking.objects.select_related('collaborator').all()
    our_revenue = sum(
        b.grand_total * (b.collaborator.percentage / 100)
        for b in bookings
        if b.collaborator and b.collaborator.percentage
    )
    data = {
        'total_bookings': bookings.count(),
        'total_revenue': round(our_revenue, 2),
        'total_patients': Patient.objects.count(),
        'total_collaborators': Collaborator.objects.count(),
        'total_diagnostics': Diagnostic.objects.count(),
    }
    return Response(data)


# ──────────────────────────────────────────────
#  AUTH
# ──────────────────────────────────────────────

from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie


@api_view(['GET'])
@ensure_csrf_cookie
def csrf_token(request):
    """
    GET /api/auth/csrf/
    Called once when the React app loads so the browser gets the CSRF cookie.
    """
    return Response({'detail': 'CSRF cookie set'})


@api_view(['POST'])
def login_view(request):
    """
    POST /api/auth/login/
    Body: { username, password }
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'detail': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)

    if user is None:
        return Response(
            {'detail': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_staff:
        return Response(
            {'detail': 'Access restricted to staff only.'},
            status=status.HTTP_403_FORBIDDEN
        )

    login(request, user)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_superuser': user.is_superuser,
    })


@api_view(['POST'])
def logout_view(request):
    """
    POST /api/auth/logout/
    """
    logout(request)
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET'])
def me(request):
    """
    GET /api/auth/me/
    Returns the currently logged-in user or 401.
    """
    if not request.user.is_authenticated:
        return Response(
            {'detail': 'Not authenticated.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'is_superuser': request.user.is_superuser,
    })


# ──────────────────────────────────────────────
#  FOLLOW-UPS
# ──────────────────────────────────────────────

@api_view(['GET'])
def patient_followup(request, pk):
    """
    GET /api/patients/<pk>/followup/
    Returns the patient's full booking history with all test details.
    Used by the Follow-ups page.
    """
    patient = get_object_or_404(Patient, pk=pk)

    bookings = Booking.objects.select_related(
        'collaborator', 'doctor'
    ).prefetch_related('items').filter(patient=patient).order_by('-created_at')

    patient_data = PatientSerializer(patient).data
    bookings_data = BookingSerializer(bookings, many=True).data

    return Response({
        'patient': patient_data,
        'bookings': bookings_data,
        'total_bookings': bookings.count(),
        'total_spent': sum(float(b.grand_total) for b in bookings),
    })