"""
Front Page PDF Generator
Creates a cover page with student details (Name, ID, Date/Time)
This page will be merged as the FIRST page of the final document
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black


def create_frontpage(
    student_name: str,
    student_id: str,
    date_time: datetime = None
) -> bytes:
    """
    Create a front page PDF with student details.
    
    Args:
        student_name: Student's full name
        student_id: Student's IEM ID / Enrollment number
        date_time: Timestamp (defaults to current time if not provided)
    
    Returns:
        PDF as bytes
    """
    if date_time is None:
        date_time = datetime.now()
    
    # Create PDF in memory
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    
    # Page dimensions
    page_width, page_height = A4
    center_x = page_width / 2
    
    # Title - "PRINT ORDER"
    pdf.setFont("Helvetica-Bold", 36)
    pdf.setFillColor(black)
    pdf.drawCentredString(center_x, page_height - 2.5 * inch, "PRINT ORDER")
    
    # Horizontal line
    pdf.setStrokeColor(black)
    pdf.setLineWidth(2)
    pdf.line(1 * inch, page_height - 3 * inch, page_width - 1 * inch, page_height - 3 * inch)
    
    # Student Name
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(center_x, page_height - 4.5 * inch, "Student Name")
    pdf.setFont("Helvetica-Bold", 32)
    pdf.drawCentredString(center_x, page_height - 5.2 * inch, student_name.upper())
    
    # Student ID / Enrollment Number
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(center_x, page_height - 6.5 * inch, "Enrollment Number")
    pdf.setFont("Helvetica-Bold", 32)
    pdf.drawCentredString(center_x, page_height - 7.2 * inch, student_id)
    
    # Date and Time
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(center_x, page_height - 8.5 * inch, "Date & Time")
    
    # Format date and time
    formatted_date = date_time.strftime("%d %B %Y")  # e.g., "04 December 2025"
    formatted_time = date_time.strftime("%I:%M %p")  # e.g., "02:30 PM"
    
    pdf.setFont("Helvetica-Bold", 32)
    pdf.drawCentredString(center_x, page_height - 9.2 * inch, formatted_date)
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(center_x, page_height - 9.8 * inch, formatted_time)
    
    # Bottom line
    pdf.setLineWidth(2)
    pdf.line(1 * inch, 1.5 * inch, page_width - 1 * inch, 1.5 * inch)
    
    # Footer
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(center_x, 1 * inch, "IEM Print Scheduling System")
    
    # Finalize PDF
    pdf.save()
    
    # Get bytes
    buffer.seek(0)
    return buffer.getvalue()


if __name__ == "__main__":
    # Test the function
    pdf_bytes = create_frontpage(
        student_name="John Doe",
        student_id="12023052016044"
    )
    
    # Save to file for testing
    with open("test_frontpage.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("Test frontpage created: test_frontpage.pdf")
