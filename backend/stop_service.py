"""
Service Status Module
Controls whether the xerox service is accepting new orders
"""

import json
import os
from datetime import datetime

# Status file path
STATUS_FILE = os.path.join(os.path.dirname(__file__), "service_status.json")

def get_service_status() -> dict:
    """Get current service status"""
    if not os.path.exists(STATUS_FILE):
        # Default: service is active
        return {
            "is_active": True,
            "message": "",
            "stopped_at": None,
            "stopped_by": None
        }
    
    with open(STATUS_FILE, "r") as f:
        return json.load(f)


def stop_service(message: str = "Xerox service is temporarily unavailable") -> dict:
    """Stop the service from accepting new orders"""
    status = {
        "is_active": False,
        "message": message,
        "stopped_at": datetime.utcnow().isoformat(),
        "stopped_by": "xerox_admin"
    }
    
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)
    
    return status


def start_service() -> dict:
    """Resume the service to accept orders"""
    status = {
        "is_active": True,
        "message": "",
        "stopped_at": None,
        "stopped_by": None
    }
    
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)
    
    return status


def is_service_active() -> bool:
    """Check if service is currently accepting orders"""
    status = get_service_status()
    return status.get("is_active", True)
