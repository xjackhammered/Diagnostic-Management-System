from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
import datetime


BRAND_GREEN = colors.HexColor('#1D9E75')
BRAND_DARK = colors.HexColor('#085041')
LIGHT_GREEN = colors.HexColor('#E1F5EE')
TEXT_DARK = colors.HexColor('#1a1a1a')
TEXT_MUTED = colors.HexColor('#6b7280')
TABLE_ALT = colors.HexColor('#f9fafb')
RED = colors.HexColor('#E24B4A')


def generate_booking_pdf(booking):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=10 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ──────────────────────────────────────────────
    header_data = [[
        Paragraph(
            '<font size="16" color="white"><b>DiagnosticHub</b></font><br/>'
            '<font size="9" color="white">Diagnostic Management System</font>',
            ParagraphStyle('hdr_left', alignment=TA_LEFT)
        ),
        Paragraph(
            f'<font size="12" color="white"><b>{booking.booking_id}</b></font><br/>'
            f'<font size="9" color="white">'
            f'{booking.created_at.strftime("%d %b %Y  %H:%M")}</font>',
            ParagraphStyle('hdr_right', alignment=TA_RIGHT)
        ),
    ]]
    header_table = Table(header_data, colWidths=['60%', '40%'])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_GREEN),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6 * mm))

    # ── Title ────────────────────────────────────────────────
    story.append(Paragraph(
        '<font size="13" color="#1D9E75"><b>DIAGNOSTIC REQUEST</b></font>',
        ParagraphStyle('title', alignment=TA_LEFT)
    ))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BRAND_GREEN))
    story.append(Spacer(1, 4 * mm))

    # ── Patient Info ─────────────────────────────────────────
    story.append(Paragraph(
        '<font size="9" color="#6b7280"><b>PATIENT INFORMATION</b></font>',
        styles['Normal']
    ))
    story.append(Spacer(1, 2 * mm))

    # Safe access: use getattr to avoid AttributeError if field doesn't exist
    patient_name = booking.patient.name if booking.patient else getattr(booking, 'patient_name', 'N/A')
    patient_phone = booking.patient.contact_number if booking.patient else getattr(booking, 'patient_phone', 'N/A')
    patient_age = booking.patient.age if booking.patient else getattr(booking, 'patient_age', 'N/A')

    # Gender – the Patient model may not have a 'gender' field, so use getattr safely
    patient_gender = getattr(booking.patient, 'gender', None) if booking.patient else None
    gender_display = patient_gender.capitalize() if patient_gender else 'N/A'

    service_display = 'Home Collection' if booking.service_type == 'home' else 'Visit Center'

    patient_data = [
        [
            Paragraph(f'<b>Name:</b> {patient_name}', styles['Normal']),
            Paragraph(f'<b>Phone:</b> {patient_phone or "N/A"}', styles['Normal']),
        ],
        [
            Paragraph(f'<b>Age:</b> {patient_age or "N/A"}', styles['Normal']),
            Paragraph(f'<b>Gender:</b> {gender_display}', styles['Normal']),
        ],
        [
            Paragraph(f'<b>Service:</b> {service_display}', styles['Normal']),
            Paragraph('', styles['Normal']),
        ],
    ]
    patient_table = Table(patient_data, colWidths=['50%', '50%'])
    patient_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 5 * mm))

    # ── Tests Table ──────────────────────────────────────────
    story.append(Paragraph(
        '<font size="9" color="#6b7280"><b>REQUESTED TESTS</b></font>',
        styles['Normal']
    ))
    story.append(Spacer(1, 2 * mm))

    test_rows = [[
        Paragraph('<b>#</b>', styles['Normal']),
        Paragraph('<b>Test Name</b>', styles['Normal']),
        Paragraph('<b>Price (৳)</b>', ParagraphStyle('th_right', alignment=TA_RIGHT)),
    ]]
    items = booking.items.all()
    for i, item in enumerate(items):
        test_rows.append([
            Paragraph(str(i + 1), styles['Normal']),
            Paragraph(item.test_name, styles['Normal']),
            Paragraph(f'{item.price:,.2f}', ParagraphStyle('td_right', alignment=TA_RIGHT)),
        ])

    col_widths = [10 * mm, None, 35 * mm]
    test_table = Table(test_rows, colWidths=col_widths, repeatRows=1)
    ts = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GREEN),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.2, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ])
    for i in range(1, len(test_rows)):
        if i % 2 == 0:
            ts.add('BACKGROUND', (0, i), (-1, i), TABLE_ALT)
    test_table.setStyle(ts)
    story.append(test_table)
    story.append(Spacer(1, 4 * mm))

    # ── Totals ───────────────────────────────────────────────
    totals = []
    totals.append([
        Paragraph('Subtotal:', ParagraphStyle('lbl', alignment=TA_RIGHT, textColor=TEXT_MUTED, fontSize=10)),
        Paragraph(f'৳{booking.subtotal:,.2f}', ParagraphStyle('val', alignment=TA_RIGHT, fontSize=10)),
    ])
    if booking.discount_amount > 0:
        disc_label = f'Discount ({booking.discount_value}{"%" if booking.discount_type == "percent" else "৳ flat"}):'
        totals.append([
            Paragraph(disc_label, ParagraphStyle('lbl', alignment=TA_RIGHT, textColor=TEXT_MUTED, fontSize=10)),
            Paragraph(
                f'<font color="#E24B4A">-৳{booking.discount_amount:,.2f}</font>',
                ParagraphStyle('val', alignment=TA_RIGHT, fontSize=10)
            ),
        ])
    if booking.delivery_charge > 0:
        totals.append([
            Paragraph('Home Collection Fee:', ParagraphStyle('lbl', alignment=TA_RIGHT, textColor=TEXT_MUTED, fontSize=10)),
            Paragraph(f'৳{booking.delivery_charge:,.2f}', ParagraphStyle('val', alignment=TA_RIGHT, fontSize=10)),
        ])
    totals.append([
        Paragraph('<b>Grand Total:</b>', ParagraphStyle('grand_lbl', alignment=TA_RIGHT, fontSize=12, textColor=BRAND_GREEN)),
        Paragraph(f'<b>৳{booking.grand_total:,.2f}</b>', ParagraphStyle('grand_val', alignment=TA_RIGHT, fontSize=12, textColor=BRAND_GREEN)),
    ])

    totals_table = Table(totals, colWidths=[None, 40 * mm], hAlign='RIGHT')
    totals_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, BRAND_GREEN),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 8 * mm))

    # ── Notes ────────────────────────────────────────────────
    if booking.notes:
        story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph(
            f'<font size="9" color="#6b7280"><b>NOTES:</b></font> '
            f'<font size="9">{booking.notes}</font>',
            styles['Normal']
        ))
        story.append(Spacer(1, 3 * mm))

    # ── Footer ───────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#e5e7eb')))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        '<font size="8" color="#9ca3af">This document is generated by DiagnosticHub Management System. '
        'Please present this receipt at the diagnostic center.</font>',
        ParagraphStyle('footer', alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer