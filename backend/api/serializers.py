from rest_framework import serializers
from decimal import Decimal
from django.conf import settings
from .models import (
    Patient, Doctor, Collaborator, Diagnostic,
    CollaboratorTest, Booking, BookingItem
)


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['id', 'name', 'age', 'contact_number', 'email', 'gender', 'created_at']
        read_only_fields = ['id', 'created_at']


class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ['id', 'name', 'age', 'contact_number', 'email', 'gender', 'specialization', 'created_at']
        read_only_fields = ['id', 'created_at']



class CollaboratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collaborator
        fields = ['id', 'name', 'contact_number', 'percentage', 'created_at']
        read_only_fields = ['id', 'created_at']



class DiagnosticSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnostic
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']




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


class BookingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingItem
        fields = ['id', 'collaborator_test', 'test_name', 'price']
        read_only_fields = ['id', 'test_name', 'price']


class BookingSerializer(serializers.ModelSerializer):
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
            'created_at'
        ]
        read_only_fields = [
            'id', 'booking_id',
            'patient_name', 'collaborator_name', 'doctor_name',
            'discount_amount', 'delivery_charge',
            'subtotal', 'grand_total',
            'created_at'
        ]


class BookingCreateSerializer(serializers.Serializer):

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

        
        tests = CollaboratorTest.objects.select_related('diagnostic').filter(
            id__in=test_ids,
            is_active=True,
        )

        
        if tests.count() != len(set(test_ids)):
            raise serializers.ValidationError(
                {'collaborator_test_ids': 'One or more test IDs are invalid or inactive.'}
            )

        
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
                test_name=test.diagnostic.name, 
                price=test.price,                 
            )

        return booking