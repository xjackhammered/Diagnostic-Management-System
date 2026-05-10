from django.db import models


class Patient(models.Model):
    name = models.CharField(max_length=100, blank=False)
    age = models.IntegerField(blank=False)
    gender = models.CharField(
        max_length=1,
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        blank=True
    )
    contact_number = models.CharField(max_length=20, blank=False)
    email = models.EmailField(blank=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Doctor(models.Model):
    name = models.CharField(max_length=100, blank=False)
    age = models.IntegerField(blank=False)
    gender = models.CharField(
        max_length=1,
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        blank=True
    )
    specialization = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=20, blank=False)
    email = models.EmailField(blank=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Collaborator(models.Model):
    name = models.CharField(max_length=80, blank=False)
    contact_number = models.CharField(max_length=20, blank=False)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Diagnostic(models.Model):
    name = models.CharField(max_length=100, blank=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class CollaboratorTest(models.Model):
    """
    Links a Diagnostic test to a Collaborator with a specific price.
    e.g. Lipid Profile @ Collaborator A = 500tk
         Lipid Profile @ Collaborator B = 800tk
    """
    collaborator = models.ForeignKey(
        Collaborator, on_delete=models.CASCADE, related_name='tests'
    )
    diagnostic = models.ForeignKey(
        Diagnostic, on_delete=models.CASCADE, related_name='collaborator_prices'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('collaborator', 'diagnostic')

    def __str__(self):
        return f"{self.diagnostic.name} @ {self.collaborator.name} — {self.price}tk"


class Booking(models.Model):
    SERVICE_TYPE_CHOICES = [
        ('center', 'Visit Center'),
        ('home', 'Home Collection'),
    ]
    DISCOUNT_TYPE_CHOICES = [
        ('flat', 'Flat Amount'),
        ('percent', 'Percentage'),
    ]

    booking_id = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.PROTECT, related_name='bookings'
    )
    collaborator = models.ForeignKey(
        Collaborator, on_delete=models.PROTECT, related_name='bookings'
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='bookings'
    )
    service_type = models.CharField(
        max_length=10, choices=SERVICE_TYPE_CHOICES, default='center'
    )
    scheduled_at = models.DateTimeField()

    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_type = models.CharField(
        max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='flat'
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.booking_id} — {self.patient.name}"

    def save(self, *args, **kwargs):
        if not self.booking_id:
            last = Booking.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.booking_id = f"BLV-{next_num:04d}"
        super().save(*args, **kwargs)


class BookingItem(models.Model):
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name='items'
    )
    collaborator_test = models.ForeignKey(
        CollaboratorTest, on_delete=models.PROTECT
    )
    # Snapshots at time of booking so price changes don't affect history
    test_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.booking.booking_id} — {self.test_name}"


class Payment(models.Model):
    """
    Records a lump sum payment received from a collaborator.
    e.g. LabCorp paid us Tk5000 on 1st May covering multiple bookings.
    """
    collaborator = models.ForeignKey(
        Collaborator, on_delete=models.PROTECT, related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        return f"{self.collaborator.name} — Tk{self.amount} on {self.paid_at}"


class CollaboratorProfile(models.Model):
    """
    Links a Django User account to a Collaborator.
    When a collaborator logs in, we look up this profile
    to know which collaborator they belong to.
    """
    user = models.OneToOneField(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='collaborator_profile'
    )
    collaborator = models.OneToOneField(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} → {self.collaborator.name}"


class BookingCompletion(models.Model):
    """
    Tracks whether a collaborator has marked a booking as completed.
    One record per booking — created when the collaborator checks it off.
    """
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='completion'
    )
    completed_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='completed_bookings'
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.booking.booking_id} — completed"