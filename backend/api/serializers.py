from rest_framework import serializers
from decimal import Decimal
from django.conf import settings
from .models import (
    Patient, Doctor, Collaborator, Diagnostic,
    CollaboratorTest, Booking, BookingItem, Payment,
    CollaboratorProfile, BookingCompletion
)


# ──────────────────────────────────────────────
#  PATIENT
# ──────────────────────────────────────────────

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['id', 'name', 'age', 'gender', 'contact_number', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


# ──────────────────────────────────────────────
#  DOCTOR
# ──────────────────────────────────────────────

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ['id', 'name', 'specialization', 'gender', 'age', 'contact_number', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


# ──────────────────────────────────────────────
#  COLLABORATOR
# ──────────────────────────────────────────────

class CollaboratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collaborator
        fields = ['id', 'name', 'contact_number', 'percentage', 'created_at']
        read_only_fields = ['id', 'created_at']


# ──────────────────────────────────────────────
#  DIAGNOSTIC
# ──────────────────────────────────────────────

class DiagnosticSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnostic
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


# ──────────────────────────────────────────────
#  COLLABORATOR TEST
# ──────────────────────────────────────────────

class CollaboratorTestSerializer(serializers.ModelSerializer):
    """
    Full read serializer — shows nested collaborator and diagnostic info.
    Used for GET responses.
    """
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    diagnostic_name = serializers.CharField(source='diagnostic.name', read_only=True)

    class Meta:
        model = CollaboratorTest
        fields = [
            'id', 'collaborator', 'collaborator_name',
            'diagnostic', 'diagnostic_name',
            'price', 'is_active',
        ]
        read_only_fields = ['id', 'collaborator_name', 'diagnostic_name']

    def validate(self, data):
        collaborator = data.get('collaborator')
        diagnostic = data.get('diagnostic')
        # On create, check unique_together manually so we return a clean error
        instance = self.instance
        qs = CollaboratorTest.objects.filter(
            collaborator=collaborator, diagnostic=diagnostic
        )
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"A price for '{diagnostic.name}' under '{collaborator.name}' already exists."
            )
        return data


# ──────────────────────────────────────────────
#  BOOKING
# ──────────────────────────────────────────────

class BookingItemSerializer(serializers.ModelSerializer):
    """Used for reading booking items (nested inside BookingSerializer)."""
    class Meta:
        model = BookingItem
        fields = ['id', 'collaborator_test', 'test_name', 'price']
        read_only_fields = ['id', 'test_name', 'price']


class BookingSerializer(serializers.ModelSerializer):
    """Full read serializer — used for GET responses."""
    items = BookingItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True, default=None)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id',
            'patient', 'patient_name',
            'collaborator', 'collaborator_name',
            'doctor', 'doctor_name',
            'service_type', 'scheduled_at',
            'discount_value', 'discount_type',
            'discount_amount', 'delivery_charge',
            'subtotal', 'grand_total',
            'notes', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'booking_id',
            'patient_name', 'collaborator_name', 'doctor_name',
            'discount_amount', 'delivery_charge',
            'subtotal', 'grand_total',
            'created_at', 'updated_at',
        ]


class BookingCreateSerializer(serializers.Serializer):
    """
    Write serializer for creating a booking.
    Accepts collaborator_test IDs, validates they all belong to the
    chosen collaborator, then computes all financials server-side.
    """
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    collaborator = serializers.PrimaryKeyRelatedField(queryset=Collaborator.objects.all())
    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.all(), required=False, allow_null=True
    )
    service_type = serializers.ChoiceField(choices=['center', 'home'], default='center')
    scheduled_at = serializers.DateTimeField()
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_type = serializers.ChoiceField(choices=['flat', 'percent'], default='flat')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    collaborator_test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )

    def validate(self, data):
        collaborator = data['collaborator']
        test_ids = data['collaborator_test_ids']

        # Fetch the CollaboratorTest records
        tests = CollaboratorTest.objects.select_related('diagnostic').filter(
            id__in=test_ids,
            is_active=True,
        )

        # Check all IDs exist and are active
        if tests.count() != len(set(test_ids)):
            raise serializers.ValidationError(
                {'collaborator_test_ids': 'One or more test IDs are invalid or inactive.'}
            )

        # Check all tests belong to the chosen collaborator
        wrong = tests.exclude(collaborator=collaborator)
        if wrong.exists():
            names = list(wrong.values_list('diagnostic__name', flat=True))
            raise serializers.ValidationError(
                {'collaborator_test_ids': f"These tests do not belong to the selected collaborator: {names}"}
            )

        data['_tests'] = tests
        return data

    def create(self, validated_data):
        tests = validated_data.pop('_tests')
        validated_data.pop('collaborator_test_ids')

        discount_value = Decimal(str(validated_data.get('discount_value', 0)))
        discount_type = validated_data.get('discount_type', 'flat')
        service_type = validated_data.get('service_type', 'center')

        subtotal = sum(t.price for t in tests)

        if discount_type == 'percent':
            discount_amount = min(subtotal * discount_value / 100, subtotal)
        else:
            discount_amount = min(discount_value, subtotal)

        delivery_charge = Decimal(
            str(getattr(settings, 'HOME_COLLECTION_CHARGE', 200))
        ) if service_type == 'home' else Decimal('0')

        grand_total = subtotal - discount_amount + delivery_charge

        booking = Booking.objects.create(
            **validated_data,
            subtotal=subtotal,
            discount_amount=discount_amount,
            delivery_charge=delivery_charge,
            grand_total=grand_total,
        )

        for test in tests:
            BookingItem.objects.create(
                booking=booking,
                collaborator_test=test,
                test_name=test.diagnostic.name,   # snapshot
                price=test.price,                  # snapshot
            )

        return booking


# ──────────────────────────────────────────────
#  PAYMENT
# ──────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'collaborator', 'collaborator_name', 'amount', 'paid_at', 'notes', 'created_at']
        read_only_fields = ['id', 'collaborator_name', 'created_at']


# ──────────────────────────────────────────────
#  PAYMENT
# ──────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'collaborator', 'collaborator_name', 'amount', 'paid_at', 'notes', 'created_at']
        read_only_fields = ['id', 'collaborator_name', 'created_at']


# ──────────────────────────────────────────────
#  COLLABORATOR PORTAL
# ──────────────────────────────────────────────

class BookingCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingCompletion
        fields = ['id', 'completed_at', 'completed_by']
        read_only_fields = ['id', 'completed_at', 'completed_by']


class CollaboratorBookingSerializer(serializers.ModelSerializer):
    """
    Booking serializer for the collaborator portal.
    Includes items and completion status.
    """
    items = BookingItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    is_completed = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'patient_name',
            'service_type', 'scheduled_at',
            'grand_total', 'notes',
            'items', 'is_completed', 'completed_at',
            'created_at',
        ]

    def get_is_completed(self, obj):
        return hasattr(obj, 'completion')

    def get_completed_at(self, obj):
        if hasattr(obj, 'completion'):
            return obj.completion.completed_at
        return None