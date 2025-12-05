"""
PDF Merging Utility
Streams PDFs directly to merger without intermediate storage
Supports adding a front page as the first page
"""

from io import BytesIO
from PyPDF2 import PdfMerger, PdfReader
from typing import List, Tuple, Optional


def merge_pdfs(pdf_bytes_list: List[bytes], frontpage_bytes: Optional[bytes] = None) -> bytes:
    """
    Merge multiple PDFs into one.
    If frontpage_bytes is provided, it will be the FIRST page.
    
    Args:
        pdf_bytes_list: List of PDF file contents as bytes (in order)
        frontpage_bytes: Optional front page PDF to prepend as first page
    
    Returns:
        Merged PDF as bytes
    """
    merger = PdfMerger()
    
    # Add front page FIRST if provided
    if frontpage_bytes:
        merger.append(BytesIO(frontpage_bytes))
    
    # Add rest of the PDFs in order
    for pdf_bytes in pdf_bytes_list:
        merger.append(BytesIO(pdf_bytes))
    
    output = BytesIO()
    merger.write(output)
    merger.close()
    
    return output.getvalue()


def get_page_count(pdf_bytes: bytes) -> int:
    """Get the number of pages in a PDF"""
    reader = PdfReader(BytesIO(pdf_bytes))
    return len(reader.pages)


def get_total_pages(pdf_bytes_list: List[bytes]) -> int:
    """Get total page count across all PDFs"""
    total = 0
    for pdf_bytes in pdf_bytes_list:
        total += get_page_count(pdf_bytes)
    return total


def validate_pdf(pdf_bytes: bytes, max_pages: int = 500) -> Tuple[bool, str]:
    """
    Validate that the bytes represent a valid PDF.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        max_pages: Maximum allowed pages per file (default 500)
    
    Returns:
        (is_valid, error_message)
    """
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        page_count = len(reader.pages)
        
        if page_count == 0:
            return False, "PDF has no pages"
        
        if page_count > max_pages:
            return False, f"PDF exceeds maximum of {max_pages} pages (has {page_count} pages)"
        
        return True, ""
    except Exception as e:
        return False, f"Invalid PDF: {str(e)}"
