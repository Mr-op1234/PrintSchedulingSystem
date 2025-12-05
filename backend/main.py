"""
Print Scheduling System - Main Backend Server
Single server with direct streaming (no microservice, no temp storage)
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from typing import List, Optional
import json

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from merge_pdf import merge_pdfs, get_total_pages, validate_pdf
from store_merged_pdf import (
    create_order,
    get_order,
    get_pending_orders,
    get_all_orders,
    get_queue_stats,
    is_first_in_queue,
    get_first_in_queue,
    mark_as_complete,
    mark_as_not_complete_and_delete,
    delete_order
)
from create_frontpage import create_frontpage
from stop_service import get_service_status, stop_service, start_service, is_service_active
from ocr_verification import verify_payment_screenshot
from xerox_config import MANAGER_UPI_ID
from clear_dB import clear_all_orders
from security import (
    sanitize_string,
    validate_student_id,
    validate_student_name,
    validate_transaction_id,
    validate_color_mode,
    validate_print_sides,
    validate_copies,
    create_access_token,
    verify_xerox_credentials,
    require_auth,
    require_xerox_staff
)
from datetime import datetime

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Print Scheduling API",
    description="Backend for student print scheduling system",
    version="1.0.0"
)

# Attach limiter to app state
app.state.limiter = limiter

# Custom rate limit error handler
@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a moment and try again."}
    )

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per file
MAX_FILES = 10
MAX_TOTAL_SIZE = 1024 * 1024 * 1024  # 1GB total
MAX_PAGES_PER_FILE = 500  # Maximum pages per PDF file


@app.get("/")
async def root():
    return {"message": "Print Scheduling API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    """
    Authenticate xerox staff and return JWT token.
    Rate limited to 10 requests per minute to prevent brute force attacks.
    """
    if not verify_xerox_credentials(username, password):
        raise HTTPException(401, "Invalid username or password")
    
    token = create_access_token(username, role="staff")
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 24 * 60 * 60  # 24 hours in seconds
    }


@app.get("/api/auth/verify")
async def verify_auth(user: dict = Depends(require_auth)):
    """
    Verify if the current token is valid.
    """
    return {
        "valid": True,
        "username": user.get("sub"),
        "role": user.get("role")
    }


@app.post("/api/orders")
@limiter.limit("50/minute")
async def create_print_order(
    request: Request,
    files: List[UploadFile] = File(...),
    student_name: str = Form(...),
    student_id: str = Form(...),
    color_mode: str = Form(default="bw"),
    print_sides: str = Form(default="single"),
    copies: int = Form(default=1),
    instructions: str = Form(default=""),
    transaction_id: str = Form(default="")
):
    """
    Create a new print order.
    Rate limited to 50 requests per minute per IP.
    
    Flow:
    1. Receive PDF files (streamed, not stored)
    2. Validate each PDF
    3. Create front page with student details
    4. Merge all PDFs (front page FIRST, then user files in order)
    5. Store only the merged PDF in database
    """
    
    # Input validation
    name_valid, name_result = validate_student_name(student_name)
    if not name_valid:
        raise HTTPException(400, name_result)
    student_name = name_result
    
    id_valid, id_result = validate_student_id(student_id)
    if not id_valid:
        raise HTTPException(400, id_result)
    student_id = id_result
    
    color_valid, color_result = validate_color_mode(color_mode)
    if not color_valid:
        raise HTTPException(400, color_result)
    color_mode = color_result
    
    sides_valid, sides_result = validate_print_sides(print_sides)
    if not sides_valid:
        raise HTTPException(400, sides_result)
    print_sides = sides_result
    
    copies_valid, copies_result = validate_copies(copies)
    if not copies_valid:
        raise HTTPException(400, copies_result)
    copies = copies_result
    
    # Sanitize instructions
    instructions = sanitize_string(instructions, max_length=500, allow_newlines=True)
    
    # Validate transaction ID if provided
    if transaction_id:
        txn_valid, txn_result = validate_transaction_id(transaction_id)
        if not txn_valid:
            raise HTTPException(400, txn_result)
        transaction_id = txn_result
    
    # Check if service is accepting orders
    if not is_service_active():
        status = get_service_status()
        raise HTTPException(
            503, 
            detail=status.get("message", "Xerox service is temporarily unavailable. Please try again later.")
        )
    
    # Validate file count
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"Maximum {MAX_FILES} files allowed")
    
    if len(files) == 0:
        raise HTTPException(400, "At least one file is required")
    
    # Read and validate files (streaming - one at a time)
    pdf_bytes_list = []
    filenames = []
    total_size = 0
    
    for file in files:
        # Check file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(400, f"Only PDF files allowed: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Check individual file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(400, f"File {file.filename} exceeds 50MB limit")
        
        # Check total size
        total_size += len(content)
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(400, "Total file size exceeds 1GB limit")
        
        # Validate PDF (includes 500-page limit check)
        is_valid, error = validate_pdf(content, max_pages=MAX_PAGES_PER_FILE)
        if not is_valid:
            raise HTTPException(400, f"Invalid PDF file {file.filename}: {error}")
        
        pdf_bytes_list.append(content)
        filenames.append(file.filename)
    
    # Get total page count from user's files
    total_pages = get_total_pages(pdf_bytes_list)
    
    # Create front page with student details (Name, ID, Date/Time)
    try:
        frontpage_pdf = create_frontpage(
            student_name=student_name,
            student_id=student_id,
            date_time=datetime.now()
        )
        total_pages += 1  # Add front page to count
    except Exception as e:
        raise HTTPException(500, f"Failed to create front page: {str(e)}")
    
    # Merge PDFs: Front page FIRST, then user files in order
    try:
        merged_pdf = merge_pdfs(pdf_bytes_list, frontpage_bytes=frontpage_pdf)
    except Exception as e:
        raise HTTPException(500, f"Failed to merge PDFs: {str(e)}")
    
    # Clear the list to free memory immediately
    pdf_bytes_list.clear()
    
    # Store in database
    try:
        order = create_order(
            student_name=student_name,
            student_id=student_id,
            merged_pdf=merged_pdf,
            total_pages=total_pages,
            color_mode=color_mode,
            print_sides=print_sides,
            copies=copies,
            instructions=instructions,
            original_filenames=json.dumps(filenames),
            transaction_id=transaction_id
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to save order: {str(e)}")
    
    return {
        "success": True,
        "order_id": order.id,
        "total_pages": total_pages,
        "estimated_cost": order.estimated_cost,
        "status": order.status
    }


@app.get("/api/orders")
async def list_orders(status: Optional[str] = None, user: dict = Depends(require_xerox_staff)):
    """Get all orders, optionally filtered by status - returns queue with position (Xerox staff only)"""
    if status == "pending":
        orders = get_pending_orders()
    else:
        orders = get_all_orders()
    
    # Get the first order in queue to mark it
    first_order = get_first_in_queue()
    first_order_id = first_order.id if first_order else None
    
    return {
        "orders": [
            {
                "id": order.id,
                "queue_position": order.queue_position,
                "is_first": order.id == first_order_id,
                "student_name": order.student_name,
                "student_id": order.student_id,
                "total_pages": order.total_pages,
                "copies": order.copies,
                "color_mode": order.color_mode,
                "print_sides": order.print_sides,
                "estimated_cost": order.estimated_cost,
                "file_size": order.file_size,
                "status": order.status,
                "created_at": order.created_at.isoformat() + "Z",
                "instructions": order.instructions,
                "original_filenames": json.loads(order.original_filenames or "[]"),
                "transaction_id": order.transaction_id
            }
            for order in orders
        ]
    }


@app.get("/api/orders/{order_id}")
async def get_order_details(order_id: str):
    """Get order details by ID"""
    order = get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    
    return {
        "id": order.id,
        "student_name": order.student_name,
        "student_id": order.student_id,
        "total_pages": order.total_pages,
        "copies": order.copies,
        "color_mode": order.color_mode,
        "print_sides": order.print_sides,
        "estimated_cost": order.estimated_cost,
        "status": order.status,
        "created_at": order.created_at.isoformat() + "Z",
        "instructions": order.instructions,
        "original_filenames": json.loads(order.original_filenames or "[]")
    }


@app.get("/api/orders/{order_id}/download")
async def download_order_pdf(order_id: str, user: dict = Depends(require_xerox_staff)):
    """Download the merged PDF for an order - ONLY if it's first in queue (Xerox staff only)"""
    # FIFO enforcement: only first order can be downloaded
    if not is_first_in_queue(order_id):
        raise HTTPException(
            403, 
            "Can only download the first order in queue. Please process orders in order."
        )
    
    order = get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    
    return Response(
        content=order.merged_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=order_{order_id}.pdf"
        }
    )


@app.post("/api/orders/{order_id}/complete")
async def complete_order(order_id: str, user: dict = Depends(require_xerox_staff)):
    """Mark order as complete - ONLY if it's first in queue (Xerox staff only)"""
    success, message = mark_as_complete(order_id)
    if not success:
        raise HTTPException(403, message)
    
    return {"success": True, "message": message}


@app.post("/api/orders/{order_id}/not-complete")
async def not_complete_order(order_id: str, user: dict = Depends(require_xerox_staff)):
    """Mark order as not complete (cancelled) - ONLY if it's first in queue (Xerox staff only)"""
    success, message = mark_as_not_complete_and_delete(order_id)
    if not success:
        raise HTTPException(403, message)
    
    return {"success": True, "message": message}


@app.delete("/api/orders/{order_id}")
async def remove_order(order_id: str, user: dict = Depends(require_xerox_staff)):
    """Delete an order - ONLY if it's first in queue (Xerox staff only)"""
    success, message = delete_order(order_id)
    if not success:
        raise HTTPException(403, message)
    
    return {"success": True, "message": message}


@app.get("/api/stats")
async def get_stats():
    """Get dashboard statistics"""
    stats = get_queue_stats()
    
    return {
        "pending_count": stats["pending_count"],
        "completed_today": stats["completed_today"]
    }


# ==================== PAYMENT VERIFICATION ENDPOINTS ====================

@app.post("/api/verify-payment")
@limiter.limit("100/minute")
async def verify_payment(request: Request, screenshot: UploadFile = File(...)):
    """
    Verify a UPI payment screenshot using OCR.
    Rate limited to 100 requests per minute per IP.
    
    Extracts and validates:
    1. Transaction ID / UPI Reference Number
    2. Receiver's name (must match xerox manager)
    3. Phone number (must match xerox manager's phone)
    
    Returns the extracted transaction ID if valid, or error messages if not.
    """
    # Check file type (images only)
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if screenshot.content_type not in allowed_types:
        raise HTTPException(400, "Only image files (JPEG, PNG, WebP) are allowed")
    
    # Read image content
    try:
        image_data = await screenshot.read()
    except Exception as e:
        raise HTTPException(400, f"Failed to read image: {str(e)}")
    
    # Check file size (max 10MB for screenshots)
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Screenshot size exceeds 10MB limit")
    
    # Verify using OCR
    try:
        result = verify_payment_screenshot(image_data)
    except Exception as e:
        raise HTTPException(500, f"OCR verification failed: {str(e)}")
    
    if result.is_valid:
        return {
            "success": True,
            "transaction_id": result.transaction_id,
            "message": "Payment verified successfully"
        }
    else:
        return {
            "success": False,
            "transaction_id": None,
            "errors": result.errors,
            "message": "Payment verification failed"
        }


@app.get("/api/payment/upi-id")
async def get_payment_upi_id():
    """Get the xerox manager's UPI ID for students to pay to"""
    return {
        "upi_id": MANAGER_UPI_ID
    }


# ==================== SERVICE STATUS ENDPOINTS ====================

@app.get("/api/service/status")
async def service_status():
    """Get current service status"""
    status = get_service_status()
    return status


@app.post("/api/service/stop")
async def stop_xerox_service(message: str = Form(default="Xerox service is temporarily unavailable. Please try again later."), user: dict = Depends(require_xerox_staff)):
    """Stop the service from accepting new orders (Xerox staff only)"""
    status = stop_service(message)
    return {"success": True, "status": status}


@app.post("/api/service/start")
async def start_xerox_service(user: dict = Depends(require_xerox_staff)):
    """Resume the service to accept orders (Xerox staff only)"""
    status = start_service()
    return {"success": True, "status": status}


@app.delete("/api/database/clear")
async def clear_database(user: dict = Depends(require_xerox_staff)):
    """Clear all orders from the database (Xerox staff only)"""
    result = clear_all_orders()
    if not result["success"]:
        raise HTTPException(500, result["message"])
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
