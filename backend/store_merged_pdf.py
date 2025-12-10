"""
Database operations for storing merged PDFs and order details
Uses SQLite for simplicity - can be swapped for PostgreSQL in production
"""

from sqlalchemy import create_engine, Column, String, Integer, Float, LargeBinary, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Optional, List, Tuple
import uuid

# Database setup
DATABASE_URL = "sqlite:///./print_orders.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PrintOrder(Base):
    """Model for storing print orders with merged PDFs"""
    __tablename__ = "print_orders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    queue_position = Column(Integer, nullable=False)  # Position in queue (1 = first)
    
    # Student info
    student_name = Column(String, nullable=False)
    student_id = Column(String, nullable=False)
    instructions = Column(String, nullable=True)
    
    # Print settings
    color_mode = Column(String, default="bw")  # "bw" or "color"
    paper_type = Column(String, default="normal")  # "normal" or "photopaper"
    print_sides = Column(String, default="single")  # "single" or "double"
    copies = Column(Integer, default=1)
    page_size = Column(String, default="A4")  # "A4" or "A3"
    binding = Column(String, default="none")  # "none", "spiral", or "soft"
    total_pages = Column(Integer, default=0)
    
    # Cost
    estimated_cost = Column(Float, default=0.0)
    
    # PDF data
    merged_pdf = Column(LargeBinary, nullable=False)
    file_size = Column(Integer, default=0)  # Size in bytes
    original_filenames = Column(String, nullable=True)  # JSON list of filenames
    
    # Status
    status = Column(String, default="pending")  # pending, completed, cancelled
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Payment
    transaction_id = Column(String, nullable=True)  # Extracted from UPI screenshot via OCR
    payment_verified = Column(Boolean, default=False)  # Verified by xerox staff
    payment_status = Column(String, default="pending")  # pending, verified, completed


# Create tables
Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_next_queue_position() -> int:
    """Get the next queue position number"""
    db = SessionLocal()
    try:
        last_order = db.query(PrintOrder).filter(
            PrintOrder.status == "pending"
        ).order_by(PrintOrder.queue_position.desc()).first()
        return (last_order.queue_position + 1) if last_order else 1
    finally:
        db.close()


def create_order(
    student_name: str,
    student_id: str,
    merged_pdf: bytes,
    total_pages: int,
    color_mode: str = "bw",
    paper_type: str = "normal",
    print_sides: str = "single",
    copies: int = 1,
    page_size: str = "A4",
    binding: str = "none",
    instructions: str = "",
    original_filenames: str = "[]",
    transaction_id: str = ""
) -> PrintOrder:
    """Create a new print order with merged PDF"""
    
    # Calculate cost with new pricing structure
    # Front page is always ₹2, uploaded pages use configured pricing
    # Double-sided: each sheet counts as 2 pages
    uploaded_pages = total_pages
    if print_sides == "double":
        uploaded_pages = (uploaded_pages + 1) // 2 * 2  # Round up to even number
    
    # Pricing based on paper type and page size (for uploaded pages only)
    # Photo paper has fixed pricing regardless of color
    if paper_type == "photopaper":
        if page_size == "A4":
            price_per_page = 20.0
        else:  # A3
            price_per_page = 40.0
    else:  # normal paper
        if page_size == "A4":
            if color_mode == "bw":
                price_per_page = 2.0
            else:  # color
                price_per_page = 5.0
        else:  # A3
            if color_mode == "bw":
                price_per_page = 4.0
            else:  # color
                price_per_page = 20.0
    
    # Calculate cost: 1 print copy + (n-1) xerox copies if copies > 1
    front_page_cost = 2.0  # Front page is always ₹2
    
    if copies == 1:
        # Single copy: front page (₹2) + uploaded pages at configured price
        estimated_cost = front_page_cost + (uploaded_pages * price_per_page)
    else:
        # Multiple copies: 1 print + (n-1) xerox
        # Print cost for 1 copy: front page (₹2) + uploaded pages
        estimated_cost = front_page_cost + (uploaded_pages * price_per_page)
        
        # Xerox cost for remaining copies (only uploaded pages, NOT front page)
        # Front page is only printed once in the original, not xeroxed
        # Xerox pricing: ₹1.5/page for B&W, ₹5/page for color
        xerox_price_per_page = 1.5 if color_mode == "bw" else 5.0
        xerox_copies = copies - 1
        estimated_cost += uploaded_pages * xerox_price_per_page * xerox_copies
    
    # Add binding cost
    if binding == "spiral":
        estimated_cost += 25
    elif binding == "soft":
        estimated_cost += 100
    
    # Get file size
    file_size = len(merged_pdf)
    
    # Get next queue position
    queue_position = get_next_queue_position()
    
    db = SessionLocal()
    try:
        order = PrintOrder(
            queue_position=queue_position,
            student_name=student_name,
            student_id=student_id,
            instructions=instructions,
            color_mode=color_mode,
            paper_type=paper_type,
            print_sides=print_sides,
            copies=copies,
            page_size=page_size,
            binding=binding,
            total_pages=total_pages,
            estimated_cost=estimated_cost,
            merged_pdf=merged_pdf,
            file_size=file_size,
            original_filenames=original_filenames,
            transaction_id=transaction_id
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return order
    finally:
        db.close()


def get_order(order_id: str) -> Optional[PrintOrder]:
    """Get order by ID"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).filter(PrintOrder.id == order_id).first()
    finally:
        db.close()


def get_first_in_queue() -> Optional[PrintOrder]:
    """Get the first order in the queue (lowest queue_position with pending status)"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).filter(
            PrintOrder.status == "pending"
        ).order_by(PrintOrder.queue_position.asc()).first()
    finally:
        db.close()


def get_queue() -> List[PrintOrder]:
    """Get all pending orders in queue order (FIFO)"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).filter(
            PrintOrder.status == "pending"
        ).order_by(PrintOrder.queue_position.asc()).all()
    finally:
        db.close()


def get_pending_orders() -> List[PrintOrder]:
    """Get all pending orders for xerox dashboard"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).filter(
            PrintOrder.status == "pending"
        ).order_by(PrintOrder.queue_position.asc()).all()
    finally:
        db.close()


def get_all_orders() -> List[PrintOrder]:
    """Get all orders"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).order_by(PrintOrder.created_at.desc()).all()
    finally:
        db.close()


def is_first_in_queue(order_id: str) -> bool:
    """Check if the given order is first in queue"""
    first = get_first_in_queue()
    return first is not None and first.id == order_id


def mark_as_complete(order_id: str) -> Tuple[bool, str]:
    """Mark the first order in queue as complete and remove it"""
    if not is_first_in_queue(order_id):
        return False, "Can only complete the first order in queue"
    
    db = SessionLocal()
    try:
        order = db.query(PrintOrder).filter(PrintOrder.id == order_id).first()
        if order:
            order.status = "completed"
            order.completed_at = datetime.utcnow()
            db.commit()
            return True, "Order marked as complete"
        return False, "Order not found"
    finally:
        db.close()


def mark_as_not_complete_and_delete(order_id: str) -> Tuple[bool, str]:
    """Mark order as not complete (cancelled) and remove from queue"""
    if not is_first_in_queue(order_id):
        return False, "Can only process the first order in queue"
    
    db = SessionLocal()
    try:
        order = db.query(PrintOrder).filter(PrintOrder.id == order_id).first()
        if order:
            order.status = "cancelled"
            db.commit()
            return True, "Order cancelled and removed from queue"
        return False, "Order not found"
    finally:
        db.close()


def delete_order(order_id: str) -> Tuple[bool, str]:
    """Delete the first order in queue"""
    if not is_first_in_queue(order_id):
        return False, "Can only delete the first order in queue"
    
    db = SessionLocal()
    try:
        order = db.query(PrintOrder).filter(PrintOrder.id == order_id).first()
        if order:
            db.delete(order)
            db.commit()
            return True, "Order deleted"
        return False, "Order not found"
    finally:
        db.close()


def get_completed_today_count() -> int:
    """Get count of orders completed today"""
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        return db.query(PrintOrder).filter(
            PrintOrder.status == "completed",
            PrintOrder.completed_at >= datetime.combine(today, datetime.min.time())
        ).count()
    finally:
        db.close()


def get_queue_stats() -> dict:
    """Get queue statistics"""
    db = SessionLocal()
    try:
        pending = db.query(PrintOrder).filter(PrintOrder.status == "pending").count()
        today = datetime.utcnow().date()
        completed_today = db.query(PrintOrder).filter(
            PrintOrder.status == "completed",
            PrintOrder.completed_at >= datetime.combine(today, datetime.min.time())
        ).count()
        return {
            "pending_count": pending,
            "completed_today": completed_today
        }
    finally:
        db.close()
