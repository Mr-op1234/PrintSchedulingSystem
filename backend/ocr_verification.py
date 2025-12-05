"""
OCR-based UPI Payment Screenshot Verification

This module validates UPI payment screenshots by:
1. Extracting text from the image using OCR (pytesseract)
2. Detecting Transaction ID / UTR Number patterns
3. Verifying receiver's name matches the xerox manager
4. Verifying sender's phone number matches the xerox manager's phone

Only the Transaction ID is extracted and stored - not the image itself.
"""

import re
from typing import Tuple, Optional, Dict, List
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import io
import os

# Configure Tesseract path for Windows
# Update this path if Tesseract is installed elsewhere
if os.name == 'nt':  # Windows
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

# Import xerox manager configuration
from xerox_config import MANAGER_NAME, MANAGER_PHONE, MANAGER_NAME_VARIANTS


class OCRVerificationResult:
    """Result object for OCR verification"""
    def __init__(self, 
                 is_valid: bool, 
                 transaction_id: Optional[str] = None,
                 errors: Optional[List[str]] = None,
                 extracted_text: Optional[str] = None):
        self.is_valid = is_valid
        self.transaction_id = transaction_id
        self.errors = errors or []
        self.extracted_text = extracted_text  # For debugging
    
    def to_dict(self) -> Dict:
        return {
            "is_valid": self.is_valid,
            "transaction_id": self.transaction_id,
            "errors": self.errors
        }


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess image for better OCR accuracy
    - Convert to grayscale
    - Enhance contrast
    - Apply sharpening
    """
    # Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    
    # Sharpen the image
    image = image.filter(ImageFilter.SHARPEN)
    
    return image


def extract_text_from_image(image_data: bytes) -> str:
    """
    Extract text from image using pytesseract OCR
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Extracted text from the image
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_data))
        
        # Preprocess for better OCR
        processed_image = preprocess_image(image)
        
        # Extract text using pytesseract
        # Use English language, Page Segmentation Mode 6 (uniform block of text)
        text = pytesseract.image_to_string(
            processed_image, 
            lang='eng',
            config='--psm 6'
        )
        
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from image: {str(e)}")


def extract_transaction_id(text: str) -> Optional[str]:
    """
    Extract Transaction ID / UTR Number from OCR text
    
    Supports multiple UPI app formats:
    - Google Pay: "UPI Ref No. 123456789012" or "UPI reference number"
    - PhonePe: "UTR: XXXXXXXXXXX" or "Transaction ID"
    - Paytm: "Transaction ID: XXXXXXX" or "Txn ID"
    - Generic: "UPI Ref", "Ref No", "Reference Number"
    
    Args:
        text: OCR extracted text
        
    Returns:
        Transaction ID if found, None otherwise
    """
    # Normalize text - remove extra whitespace, convert to uppercase for matching
    normalized_text = ' '.join(text.split())
    
    # Regex patterns for different transaction ID formats
    patterns = [
        # UPI Reference Number (12 digits typical)
        r'(?:UPI\s*(?:Ref(?:erence)?\.?\s*(?:No\.?|Number)?|ID))\s*[:\-]?\s*(\d{10,14})',
        
        # UTR Number (typically 12-22 alphanumeric)
        r'(?:UTR\s*(?:No\.?|Number)?)\s*[:\-]?\s*([A-Z0-9]{10,22})',
        
        # Transaction ID
        r'(?:Transaction\s*ID|Txn\s*ID|TXN\s*ID)\s*[:\-]?\s*([A-Z0-9]{8,22})',
        
        # Reference Number
        r'(?:Ref(?:erence)?\s*(?:No\.?|Number|ID)?)\s*[:\-]?\s*(\d{10,14})',
        
        # Google Pay specific format
        r'(?:UPI\s*transaction\s*ID)\s*[:\-]?\s*([A-Z0-9]{10,22})',
        
        # Generic alphanumeric ID after common keywords
        r'(?:Order\s*ID|Payment\s*ID)\s*[:\-]?\s*([A-Z0-9]{8,22})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # Fallback: Look for standalone 12-digit numbers (common UPI ref format)
    # Only if text contains payment-related keywords
    payment_keywords = ['paid', 'payment', 'successful', 'completed', 'transferred', 'sent']
    if any(keyword in normalized_text.lower() for keyword in payment_keywords):
        standalone_ref = re.search(r'\b(\d{12})\b', normalized_text)
        if standalone_ref:
            return standalone_ref.group(1)
    
    return None


def verify_receiver_name(text: str) -> Tuple[bool, Optional[str]]:
    """
    Verify that the receiver's name in the screenshot matches the xerox manager
    
    Args:
        text: OCR extracted text
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    normalized_text = text.lower()
    
    # Check if any variant of the manager's name appears in the text
    for name_variant in MANAGER_NAME_VARIANTS:
        if name_variant.lower() in normalized_text:
            return True, None
    
    # Also check the primary name
    if MANAGER_NAME.lower() in normalized_text:
        return True, None
    
    return False, f"Receiver name '{MANAGER_NAME}' not found in screenshot"


def verify_phone_number(text: str) -> Tuple[bool, Optional[str]]:
    """
    Verify that the xerox manager's phone number appears in the screenshot
    This confirms payment was sent to the correct recipient
    
    Args:
        text: OCR extracted text
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Remove all non-digit characters from the manager's phone
    clean_manager_phone = re.sub(r'\D', '', MANAGER_PHONE)
    
    # Extract all phone-like numbers from text (10 digits)
    # Also handle formats like +91 XXXXX XXXXX, 91-XXXXXXXXXX
    phone_patterns = [
        clean_manager_phone,  # Exact match
        f"91{clean_manager_phone}",  # With country code
        f"+91{clean_manager_phone}",  # With + country code
    ]
    
    # Remove all non-digit characters from text for comparison
    text_digits = re.sub(r'\D', '', text)
    
    for phone in phone_patterns:
        clean_phone = re.sub(r'\D', '', phone)
        if clean_phone in text_digits:
            return True, None
    
    # Also check if the last 10 digits appear (phone number without country code)
    if len(clean_manager_phone) >= 10:
        last_10 = clean_manager_phone[-10:]
        if last_10 in text_digits:
            return True, None
    
    return False, f"Payment recipient phone number not verified"


def verify_payment_screenshot(image_data: bytes) -> OCRVerificationResult:
    """
    Main verification function - validates a UPI payment screenshot
    
    Performs three checks:
    1. Transaction ID presence and extraction
    2. Receiver name verification (xerox manager)
    3. Phone number verification (xerox manager's phone)
    
    Args:
        image_data: Raw image bytes of the payment screenshot
        
    Returns:
        OCRVerificationResult with validation status and extracted transaction ID
    """
    errors = []
    
    # Step 1: Extract text from image
    try:
        extracted_text = extract_text_from_image(image_data)
    except ValueError as e:
        return OCRVerificationResult(
            is_valid=False,
            errors=[str(e)]
        )
    
    if not extracted_text or len(extracted_text.strip()) < 20:
        return OCRVerificationResult(
            is_valid=False,
            errors=["Could not extract sufficient text from image. Please upload a clear screenshot."],
            extracted_text=extracted_text
        )
    
    # Step 2: Extract Transaction ID
    transaction_id = extract_transaction_id(extracted_text)
    if not transaction_id:
        errors.append("Transaction ID / UPI Reference Number not found in screenshot")
    
    # Step 3: Verify receiver name
    name_valid, name_error = verify_receiver_name(extracted_text)
    if not name_valid and name_error:
        errors.append(name_error)
    
    # Step 4: Verify phone number
    phone_valid, phone_error = verify_phone_number(extracted_text)
    if not phone_valid and phone_error:
        errors.append(phone_error)
    
    # Determine overall validity
    # Must have: Transaction ID AND (receiver name OR phone number)
    # This allows flexibility while maintaining security
    is_valid = (
        transaction_id is not None and 
        (name_valid or phone_valid)
    )
    
    # If we have transaction ID but neither name nor phone matched, still fail
    if transaction_id and not name_valid and not phone_valid:
        is_valid = False
    
    return OCRVerificationResult(
        is_valid=is_valid,
        transaction_id=transaction_id if is_valid else None,
        errors=errors if not is_valid else [],
        extracted_text=extracted_text  # For debugging, remove in production
    )


# Convenience function for quick validation check
def is_valid_payment_screenshot(image_data: bytes) -> bool:
    """Quick check if screenshot is valid"""
    result = verify_payment_screenshot(image_data)
    return result.is_valid
