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


# ──────────────────────────────────────────────
#  PAYMENTS
# ──────────────────────────────────────────────

from .models import Payment
from .serializers import PaymentSerializer


@api_view(['GET', 'POST'])
def payment_list(request):
    """
    GET  /api/payments/  — list all payments (?collaborator=<id>)
    POST /api/payments/  — log a new payment from a collaborator
    """
    if request.method == 'GET':
        qs = Payment.objects.select_related('collaborator').all()

        collaborator_id = request.query_params.get('collaborator')
        if collaborator_id:
            qs = qs.filter(collaborator_id=collaborator_id)

        results, meta = paginate(qs, request)
        return Response({**meta, 'results': PaymentSerializer(results, many=True).data})

    if request.method == 'POST':
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def payment_detail(request, pk):
    """
    GET    /api/payments/<pk>/
    PATCH  /api/payments/<pk>/  — edit amount, date or notes
    DELETE /api/payments/<pk>/  — remove a payment record
    """
    payment = get_object_or_404(Payment, pk=pk)

    if request.method == 'GET':
        return Response(PaymentSerializer(payment).data)

    if request.method == 'PATCH':
        serializer = PaymentSerializer(payment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def revenue_breakdown(request):
    """
    GET /api/revenue/
    Returns per-collaborator revenue breakdown:
    - our_cut per booking (grand_total * percentage / 100)
    - total earned across all bookings
    - total paid (sum of Payment records)
    - outstanding balance
    - list of individual bookings with our cut shown
    """
    collaborators = Collaborator.objects.prefetch_related(
        'bookings__items', 'payments'
    ).all()

    result = []

    for collab in collaborators:
        bookings = collab.bookings.all().order_by('-created_at')
        percentage = collab.percentage / 100

        booking_breakdown = []
        total_earned = Decimal('0')

        for b in bookings:
            our_cut = round(b.grand_total * percentage, 2)
            total_earned += our_cut
            booking_breakdown.append({
                'id': b.id,
                'booking_id': b.booking_id,
                'patient_name': b.patient.name,
                'grand_total': str(b.grand_total),
                'our_cut': str(our_cut),
                'scheduled_at': b.scheduled_at,
                'created_at': b.created_at,
                'items': [
                    {'test_name': item.test_name, 'price': str(item.price)}
                    for item in b.items.all()
                ],
            })

        payments = collab.payments.all()
        total_paid = sum(p.amount for p in payments)
        outstanding = total_earned - total_paid

        payment_records = [
            {
                'id': p.id,
                'amount': str(p.amount),
                'paid_at': p.paid_at,
                'notes': p.notes,
            }
            for p in payments
        ]

        result.append({
            'collaborator_id': collab.id,
            'collaborator_name': collab.name,
            'collaborator_contact': collab.contact_number,
            'percentage': str(collab.percentage),
            'total_bookings': len(booking_breakdown),
            'total_earned': str(round(total_earned, 2)),
            'total_paid': str(round(total_paid, 2)),
            'outstanding': str(round(outstanding, 2)),
            'bookings': booking_breakdown,
            'payments': payment_records,
        })

    # Summary totals across all collaborators
    grand_earned = sum(Decimal(r['total_earned']) for r in result)
    grand_paid = sum(Decimal(r['total_paid']) for r in result)
    grand_outstanding = grand_earned - grand_paid

    return Response({
        'summary': {
            'total_earned': str(round(grand_earned, 2)),
            'total_paid': str(round(grand_paid, 2)),
            'total_outstanding': str(round(grand_outstanding, 2)),
        },
        'collaborators': result,
    })


# ──────────────────────────────────────────────
#  REVENUE & PAYMENTS
# ──────────────────────────────────────────────

from .models import Payment
from .serializers import PaymentSerializer


@api_view(['GET'])
def revenue_breakdown(request):
    """
    GET /api/revenue/breakdown/
    Returns per-collaborator summary:
      - total_earned  : sum of (grand_total * percentage/100) across all bookings
      - total_paid    : sum of all Payment records for that collaborator
      - balance       : total_earned - total_paid
      - bookings      : each booking with our_cut calculated
    """
    collaborators = Collaborator.objects.all()
    result = []

    for collab in collaborators:
        bookings = Booking.objects.filter(
            collaborator=collab
        ).order_by('-created_at')

        booking_rows = []
        total_earned = 0

        for b in bookings:
            our_cut = float(b.grand_total) * float(collab.percentage) / 100
            total_earned += our_cut
            booking_rows.append({
                'id': b.id,
                'booking_id': b.booking_id,
                'patient_name': b.patient.name if b.patient else 'N/A',
                'grand_total': float(b.grand_total),
                'our_cut': round(our_cut, 2),
                'scheduled_at': b.scheduled_at,
                'created_at': b.created_at,
                'tests': [
                    {'name': item.test_name, 'price': float(item.price)}
                    for item in b.items.all()
                ],
            })

        payments = Payment.objects.filter(collaborator=collab)
        total_paid = float(sum(p.amount for p in payments))
        balance = round(total_earned - total_paid, 2)

        payment_rows = PaymentSerializer(payments, many=True).data

        result.append({
            'collaborator_id': collab.id,
            'collaborator_name': collab.name,
            'collaborator_contact': collab.contact_number,
            'percentage': float(collab.percentage),
            'total_bookings': len(booking_rows),
            'total_earned': round(total_earned, 2),
            'total_paid': round(total_paid, 2),
            'balance': balance,
            'bookings': booking_rows,
            'payments': payment_rows,
        })

    # Sort by balance descending — most owed first
    result.sort(key=lambda x: x['balance'], reverse=True)
    return Response(result)


@api_view(['GET', 'POST'])
def payment_list(request):
    """
    GET  /api/payments/           — list all payments (?collaborator=<id>)
    POST /api/payments/           — log a new payment
    Body: { collaborator, amount, paid_at, notes }
    """
    if request.method == 'GET':
        qs = Payment.objects.select_related('collaborator').all()
        collaborator_id = request.query_params.get('collaborator')
        if collaborator_id:
            qs = qs.filter(collaborator_id=collaborator_id)
        serializer = PaymentSerializer(qs, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def payment_detail(request, pk):
    """
    GET    /api/payments/<pk>/
    PATCH  /api/payments/<pk>/  — edit amount, date, notes
    DELETE /api/payments/<pk>/  — delete a payment record
    """
    payment = get_object_or_404(Payment, pk=pk)

    if request.method == 'GET':
        return Response(PaymentSerializer(payment).data)

    if request.method == 'PATCH':
        serializer = PaymentSerializer(payment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  COLLABORATOR PORTAL
# ──────────────────────────────────────────────

from .models import CollaboratorProfile, BookingCompletion
from .serializers import CollaboratorBookingSerializer, BookingCompletionSerializer


@api_view(['POST'])
def collaborator_login(request):
    """
    POST /api/collaborator/login/
    Body: { username, password }
    Only allows users who have a CollaboratorProfile.
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

    # Must have a collaborator profile — not an admin
    try:
        profile = user.collaborator_profile
    except CollaboratorProfile.DoesNotExist:
        return Response(
            {'detail': 'No collaborator account found for this user.'},
            status=status.HTTP_403_FORBIDDEN
        )

    login(request, user)
    return Response({
        'id': user.id,
        'username': user.username,
        'collaborator_id': profile.collaborator.id,
        'collaborator_name': profile.collaborator.name,
    })


@api_view(['POST'])
def collaborator_logout(request):
    """POST /api/collaborator/logout/"""
    logout(request)
    return Response({'detail': 'Logged out.'})


@api_view(['GET'])
def collaborator_me(request):
    """
    GET /api/collaborator/me/
    Returns the logged-in collaborator's info.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = request.user.collaborator_profile
    except CollaboratorProfile.DoesNotExist:
        return Response({'detail': 'Not a collaborator account.'}, status=status.HTTP_403_FORBIDDEN)

    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'collaborator_id': profile.collaborator.id,
        'collaborator_name': profile.collaborator.name,
    })


@api_view(['GET'])
def collaborator_bookings(request):
    """
    GET /api/collaborator/bookings/
    Returns paginated bookings for the logged-in collaborator.
    Uncompleted bookings first, then completed, newest within each group.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = request.user.collaborator_profile
    except CollaboratorProfile.DoesNotExist:
        return Response({'detail': 'Not a collaborator account.'}, status=status.HTTP_403_FORBIDDEN)

    qs = Booking.objects.filter(
        collaborator=profile.collaborator
    ).select_related(
        'patient', 'collaborator'
    ).prefetch_related(
        'items', 'completion'
    ).order_by('-created_at')

    # Uncompleted first, then completed — within each group newest first
    # We do this in Python since it's a two-level sort
    bookings = list(qs)
    uncompleted = [b for b in bookings if not hasattr(b, 'completion')]
    completed   = [b for b in bookings if hasattr(b, 'completion')]
    bookings = uncompleted + completed

    # Pagination
    page_size = int(request.query_params.get('page_size', 15))
    page      = int(request.query_params.get('page', 1))
    total     = len(bookings)
    start     = (page - 1) * page_size
    end       = start + page_size
    page_data = bookings[start:end]

    serializer = CollaboratorBookingSerializer(page_data, many=True)
    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'next': page + 1 if end < total else None,
        'previous': page - 1 if page > 1 else None,
        'results': serializer.data,
    })


@api_view(['POST', 'DELETE'])
def toggle_booking_completion(request, pk):
    """
    POST   /api/collaborator/bookings/<pk>/complete/  — mark as complete
    DELETE /api/collaborator/bookings/<pk>/complete/  — unmark
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = request.user.collaborator_profile
    except CollaboratorProfile.DoesNotExist:
        return Response({'detail': 'Not a collaborator account.'}, status=status.HTTP_403_FORBIDDEN)

    booking = get_object_or_404(Booking, pk=pk, collaborator=profile.collaborator)

    if request.method == 'POST':
        completion, created = BookingCompletion.objects.get_or_create(
            booking=booking,
            defaults={'completed_by': request.user}
        )
        return Response({
            'is_completed': True,
            'completed_at': completion.completed_at,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    if request.method == 'DELETE':
        BookingCompletion.objects.filter(booking=booking).delete()
        return Response({'is_completed': False}, status=status.HTTP_200_OK)