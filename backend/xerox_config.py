"""
Xerox Manager Configuration

This file contains the fixed details of the xerox shop manager.
These values are used to verify UPI payment screenshots:
- MANAGER_NAME: The receiver's name as it appears in UPI apps
- MANAGER_PHONE: The phone number linked to the UPI account
- MANAGER_UPI_ID: The UPI ID for display to students (optional)

Update these values according to your xerox shop details.
"""

# =============================================================================
# XEROX MANAGER DETAILS - UPDATE THESE VALUES
# =============================================================================

# The exact name as it appears on UPI payment confirmations
# This is typically the account holder's name or business name
MANAGER_NAME = "UNMAN CHAUDHURI"

# Alternative name variants that might appear in UPI apps
# Add all possible variations of how the name might be displayed
MANAGER_NAME_VARIANTS = [
    "UNMAN CHAUDHURI",
    "Unman Chaudhuri",
    "UNMAN  CHAUDHURI",  # Double space variant
]

# Phone number linked to the xerox manager's UPI account
# This is used to verify the payment was sent to the correct recipient
# Format: 10 digits without country code, or with +91/91 prefix
MANAGER_PHONE = "9876543210"

# UPI ID for display to students (shown on payment page)
# This is what students will pay to
MANAGER_UPI_ID = "unman2017@upi"

# =============================================================================
# PAYMENT SETTINGS
# =============================================================================

# Minimum amount for a valid payment (in INR)
MIN_PAYMENT_AMOUNT = 1.0

# Currency symbol for display
CURRENCY_SYMBOL = "₹"

# =============================================================================
# OCR SETTINGS
# =============================================================================

# Minimum text length required from OCR extraction
# Screenshots with less text than this are rejected
MIN_OCR_TEXT_LENGTH = 20

# Enable debug mode to include extracted text in response
# Set to False in production
OCR_DEBUG_MODE = True
