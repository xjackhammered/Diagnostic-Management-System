from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
import os
import logging

logger = logging.getLogger(__name__)

# ── Colour palette — all blue now ────────────────────────────
BRAND_BLUE      = colors.HexColor('#1A3E6F')   # dark blue (was green)
BRAND_BLUE_MID  = colors.HexColor('#2563EB')   # medium blue for grand total
LIGHT_BLUE      = colors.HexColor('#EBF3FF')   # light blue table header (was light green)
TEXT_DARK       = colors.HexColor('#1a1a1a')
TEXT_MUTED      = colors.HexColor('#6b7280')
TABLE_ALT       = colors.HexColor('#f9fafb')
RED             = colors.HexColor('#E24B4A')

GENDER_LABELS = {'M': 'Male', 'F': 'Female', 'O': 'Other'}

LOGO_PATH = os.path.join(os.path.dirname(__file__), '..', 'static', 'logo.png')


def generate_booking_pdf(booking):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=12 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Top: Logo left, Booking ID right — NO coloured bar ───
    try:
        if not os.path.isfile(LOGO_PATH):
            raise FileNotFoundError(f"Logo not found at {LOGO_PATH}")
        logo = Image(LOGO_PATH, width=42 * mm, height=28 * mm)
        logger.info(f"Logo loaded from {LOGO_PATH}")
    except Exception as e:
        logger.error(f"Failed to load logo: {e}")
        logo = Paragraph(
            '<font size="16"><b>BelleVie</b></font>',
            ParagraphStyle('logo_fallback', alignment=TA_LEFT)
        )

    header_data = [[
        logo,
        Paragraph(
            f'<font size="14" color="#1A3E6F"><b>{booking.booking_id}</b></font><br/>'
            f'<font size="9" color="#6b7280">'
            f'{booking.created_at.strftime("%d %b %Y  %H:%M")}</font>',
            ParagraphStyle('hdr_right', alignment=TA_RIGHT, leading=18)
        ),
    ]]

    header_table = Table(header_data, colWidths=['55%', '45%'])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 5 * mm))

    # ── Divider ───────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=1.2, color=BRAND_BLUE))
    story.append(Spacer(1, 4 * mm))

    # ── Title ────────────────────────────────────────────────
    story.append(Paragraph(
        '<font size="13" color="#1A3E6F"><b>DIAGNOSTIC REQUEST</b></font>',
        ParagraphStyle('title', alignment=TA_LEFT)
    ))
    story.append(HRFlowable(width='100%', thickness=0.4, color=colors.HexColor('#CBD5E1')))
    story.append(Spacer(1, 4 * mm))

    # ── Patient Info ──────────────────────────────────────────
    story.append(Paragraph(
        '<font size="9" color="#6b7280"><b>PATIENT INFORMATION</b></font>',
        styles['Normal']
    ))
    story.append(Spacer(1, 2 * mm))

    patient = booking.patient
    patient_name  = patient.name           if patient else 'N/A'
    patient_phone = patient.contact_number if patient else 'N/A'
    patient_age   = patient.age            if patient else 'N/A'

    patient_gender  = getattr(patient, 'gender', None) if patient else None
    gender_display  = GENDER_LABELS.get(patient_gender, 'N/A')
    service_display = 'Home Collection' if booking.service_type == 'home' else 'Visit Center'

    if booking.doctor:
        doctor_ref = booking.doctor.name
        spec = getattr(booking.doctor, 'specialization', None)
        if spec:
            doctor_ref += f" ({spec})"
    else:
        doctor_ref = 'Self'

    collaborator_name = booking.collaborator.name if booking.collaborator else 'N/A'

    info_style = ParagraphStyle('info', fontSize=10, leading=14)

    patient_data = [
        [
            Paragraph(f'<b>Name:</b> {patient_name}', info_style),
            Paragraph(f'<b>Phone:</b> {patient_phone or "N/A"}', info_style),
        ],
        [
            Paragraph(f'<b>Age:</b> {patient_age or "N/A"}', info_style),
            Paragraph(f'<b>Gender:</b> {gender_display}', info_style),
        ],
        [
            Paragraph(f'<b>Service:</b> {service_display}', info_style),
            Paragraph(f'<b>Referred by:</b> {doctor_ref}', info_style),
        ],
        [
            Paragraph(f'<b>Diagnostic Center:</b> {collaborator_name}', info_style),
            Paragraph(
                f'<b>Scheduled:</b> {booking.scheduled_at.strftime("%d %b %Y  %H:%M") if booking.scheduled_at else "N/A"}',
                info_style
            ),
        ],
    ]
    patient_table = Table(patient_data, colWidths=['50%', '50%'])
    patient_table.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 5 * mm))

    # ── Tests Table ───────────────────────────────────────────
    story.append(Paragraph(
        '<font size="9" color="#6b7280"><b>REQUESTED TESTS</b></font>',
        styles['Normal']
    ))
    story.append(Spacer(1, 2 * mm))

    hdr_style  = ParagraphStyle('th', fontSize=9, fontName='Helvetica-Bold')
    hdr_right  = ParagraphStyle('th_r', fontSize=9, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    cell_right = ParagraphStyle('td_r', fontSize=9, alignment=TA_RIGHT)

    test_rows = [[
        Paragraph('#', hdr_style),
        Paragraph('Test Name', hdr_style),
        Paragraph('Price (Taka)', hdr_right),
    ]]

    items = booking.items.all()
    for i, item in enumerate(items):
        test_rows.append([
            Paragraph(str(i + 1), ParagraphStyle('td', fontSize=9)),
            Paragraph(item.test_name, ParagraphStyle('td', fontSize=9)),
            Paragraph(f'{item.price:,.2f}', cell_right),
        ])

    test_table = Table(test_rows, colWidths=[10 * mm, None, 35 * mm], repeatRows=1)
    ts = TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  LIGHT_BLUE),   # light blue header
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('ALIGN',         (2, 0), (2, -1),  'RIGHT'),
        ('LINEBELOW',     (0, 0), (-1, -1), 0.2, colors.HexColor('#e5e7eb')),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ])
    for i in range(1, len(test_rows)):
        if i % 2 == 0:
            ts.add('BACKGROUND', (0, i), (-1, i), TABLE_ALT)
    test_table.setStyle(ts)
    story.append(test_table)
    story.append(Spacer(1, 4 * mm))

    # ── Totals ────────────────────────────────────────────────
    lbl_style   = ParagraphStyle('lbl', alignment=TA_RIGHT, textColor=TEXT_MUTED, fontSize=10)
    val_style   = ParagraphStyle('val', alignment=TA_RIGHT, fontSize=10)
    grand_lbl   = ParagraphStyle('glbl', alignment=TA_RIGHT, fontSize=12,
                                 textColor=BRAND_BLUE, fontName='Helvetica-Bold')
    grand_val   = ParagraphStyle('gval', alignment=TA_RIGHT, fontSize=12,
                                 textColor=BRAND_BLUE_MID, fontName='Helvetica-Bold')

    totals = [[
        Paragraph('Subtotal:', lbl_style),
        Paragraph(f'Tk{booking.subtotal:,.2f}', val_style),
    ]]

    if booking.discount_amount > 0:
        disc_label = (
            f'Discount ({booking.discount_value}%):' if booking.discount_type == 'percent'
            else f'Discount (Tk{booking.discount_value} flat):'
        )
        totals.append([
            Paragraph(disc_label, lbl_style),
            Paragraph(
                f'<font color="#E24B4A">-Tk{booking.discount_amount:,.2f}</font>',
                val_style
            ),
        ])

    if booking.delivery_charge > 0:
        totals.append([
            Paragraph('Home Collection Fee:', lbl_style),
            Paragraph(f'Tk{booking.delivery_charge:,.2f}', val_style),
        ])

    totals.append([
        Paragraph('Grand Total:', grand_lbl),
        Paragraph(f'Tk{booking.grand_total:,.2f}', grand_val),
    ])

    totals_table = Table(totals, colWidths=[None, 42 * mm], hAlign='RIGHT')
    totals_table.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE',     (0, -1), (-1, -1), 0.8, BRAND_BLUE),
        ('TOPPADDING',    (0, -1), (-1, -1), 7),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 8 * mm))

    # ── Notes ─────────────────────────────────────────────────
    if booking.notes:
        story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph(
            f'<font size="9" color="#6b7280"><b>NOTES:</b></font> '
            f'<font size="9">{booking.notes}</font>',
            styles['Normal']
        ))
        story.append(Spacer(1, 3 * mm))

    # ── Footer ────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#e5e7eb')))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        '<font size="8" color="#9ca3af">This document is generated by BelleVie Global Health Services. '
        'Please present this receipt at the diagnostic center.</font>',
        ParagraphStyle('footer', alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer