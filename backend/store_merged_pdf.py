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
    print_sides = Column(String, default="single")  # "single" or "double"
    copies = Column(Integer, default=1)
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
    print_sides: str = "single",
    copies: int = 1,
    instructions: str = "",
    original_filenames: str = "[]",
    transaction_id: str = ""
) -> PrintOrder:
    """Create a new print order with merged PDF"""
    
    # Calculate cost
    base_cost = 5.0 if color_mode == "color" else 3.0
    side_multiplier = 0.8 if print_sides == "double" else 1.0
    estimated_cost = total_pages * base_cost * copies * side_multiplier
    
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
            print_sides=print_sides,
            copies=copies,
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
