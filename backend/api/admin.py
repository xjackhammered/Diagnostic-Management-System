from django.contrib import admin
from . models import Patient, Doctor, Collaborator, CollaboratorTest, Booking, BookingItem, Diagnostic
# Register your models here.

admin.site.register(Patient)
admin.site.register(Doctor)
admin.site.register(Collaborator)
admin.site.register(CollaboratorTest)
admin.site.register(Booking)
admin.site.register(BookingItem)
admin.site.register(Diagnostic)