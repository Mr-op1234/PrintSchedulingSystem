"""
Database Clear Module

Provides functionality to clear all orders from the database
while preserving the table structure (storage).
"""

from store_merged_pdf import SessionLocal, PrintOrder


def clear_all_orders() -> dict:
    """
    Clear all orders from the database.
    Preserves the table structure, only deletes data.
    
    Returns:
        Dictionary with success status and count of deleted orders
    """
    db = SessionLocal()
    try:
        # Count orders before deletion
        count = db.query(PrintOrder).count()
        
        # Delete all orders
        db.query(PrintOrder).delete()
        db.commit()
        
        return {
            "success": True,
            "deleted_count": count,
            "message": f"Successfully cleared {count} orders from database"
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "deleted_count": 0,
            "message": f"Failed to clear database: {str(e)}"
        }
    finally:
        db.close()


def get_order_count() -> int:
    """Get the current number of orders in the database"""
    db = SessionLocal()
    try:
        return db.query(PrintOrder).count()
    finally:
        db.close()
