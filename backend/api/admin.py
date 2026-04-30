from django.contrib import admin
from .models import Patient, Doctor, Collaborator, Diagnostic, CollaboratorTest, Booking, BookingItem


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['name', 'age', 'contact_number', 'email', 'created_at']
    search_fields = ['name', 'contact_number', 'email']


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['name', 'age', 'contact_number', 'email', 'created_at']
    search_fields = ['name', 'contact_number']


@admin.register(Collaborator)
class CollaboratorAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_number', 'percentage', 'created_at']
    search_fields = ['name']


@admin.register(Diagnostic)
class DiagnosticAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(CollaboratorTest)
class CollaboratorTestAdmin(admin.ModelAdmin):
    list_display = ['diagnostic', 'collaborator', 'price', 'is_active']
    list_filter = ['collaborator', 'is_active']
    search_fields = ['diagnostic__name', 'collaborator__name']


class BookingItemInline(admin.TabularInline):
    model = BookingItem
    extra = 0
    readonly_fields = ['test_name', 'price']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_id', 'patient', 'collaborator', 'service_type', 'grand_total', 'scheduled_at', 'created_at']
    list_filter = ['service_type', 'collaborator']
    search_fields = ['booking_id', 'patient__name', 'patient__contact_number']
    readonly_fields = ['booking_id', 'subtotal', 'discount_amount', 'delivery_charge', 'grand_total']
    inlines = [BookingItemInline]