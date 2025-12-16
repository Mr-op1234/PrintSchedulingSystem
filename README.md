# Print Scheduling System - Codebase Index

## Overview
The Print Scheduling System is a web application that allows students to schedule print jobs and xerox staff to manage and process these jobs in a FIFO (First-In-First-Out) queue. The system consists of a Python/FastAPI backend and a Next.js/React frontend.

## Project Structure
```
PrintSchedulingSystem/
├── backend/
│   ├── main.py                  # Main FastAPI application
│   ├── store_merged_pdf.py      # Database operations
│   ├── merge_pdf.py             # PDF merging utilities
│   ├── create_frontpage.py      # Front page generation
│   ├── ocr_verification.py      # Payment verification via OCR
│   ├── security.py              # Authentication and input validation
│   ├── xerox_config.py          # Xerox manager configuration
│   ├── stop_service.py          # Service status management
│   ├── clear_dB.py              # Database clearing utilities
│   ├── service_status.json      # Service status persistence
│   └── requirements.txt         # Python dependencies
└── frontend/
    ├── app/
    │   ├── page.tsx             # Main landing page
    │   ├── student/             # Student dashboard
    │   │   └── page.tsx
    │   ├── configure/           # Print configuration
    │   │   └── page.tsx
    │   ├── details/             # Student details and payment
    │   │   └── page.tsx
    │   ├── payment/             # Payment verification
    │   │   └── page.tsx
    │   ├── xerox_auth/          # Xerox staff login
    │   │   └── page.tsx
    │   ├── xerox_dashboard/     # Xerox staff dashboard
    │   │   └── page.tsx
    │   ├── context/             # Global state management
    │   │   └── OrderContext.tsx
    │   └── lib/
    │       └── api.ts           # Backend API client
    ├── package.json             # Node.js dependencies
    └── ...
```

## Backend Components

### Main Application (`backend/main.py`)
- FastAPI server implementation
- RESTful API endpoints for:
  - Student print order submission
  - Xerox staff authentication and dashboard
  - Payment verification via OCR
  - Service status management
- Features:
  - Rate limiting
  - CORS configuration
  - Input validation
  - JWT-based authentication
  - FIFO queue enforcement

### Database Layer (`backend/store_merged_pdf.py`)
- SQLAlchemy ORM models
- SQLite database for storing print orders
- PrintOrder model with fields:
  - Student information (name, ID)
  - Print settings (color, paper type, copies, etc.)
  - PDF data and metadata
  - Status tracking (pending, completed, cancelled)
  - Payment information
- Queue management functions
- Cost calculation logic

### PDF Processing (`backend/merge_pdf.py`, `backend/create_frontpage.py`)
- PDF merging utilities using PyPDF2
- Front page generation with ReportLab
- Page counting and validation functions
- Support for prepending front page to merged documents

### Security (`backend/security.py`)
- JWT token-based authentication
- Input sanitization to prevent XSS
- Password hashing for xerox staff
- Input validation for all user inputs
- Rate limiting implementation

### Payment Verification (`backend/ocr_verification.py`)
- OCR-based UPI payment screenshot verification
- Text extraction using pytesseract
- Transaction ID pattern matching
- Receiver name and phone number verification
- Support for multiple UPI app formats

### Configuration (`backend/xerox_config.py`)
- Xerox manager details (name, phone, UPI ID)
- Payment settings
- OCR configuration

### Service Management (`backend/stop_service.py`, `backend/service_status.json`)
- Service status control (active/inactive)
- Message customization for service downtime
- Status persistence in JSON file

### Database Management (`backend/clear_dB.py`)
- Functions to clear all orders from database
- Order counting utilities

## Frontend Components

### Main Pages
- **Landing Page** (`frontend/app/page.tsx`): Entry point with links to student and xerox dashboards
- **Student Dashboard** (`frontend/app/student/page.tsx`): File upload interface with drag-and-drop reordering
- **Configuration** (`frontend/app/configure/page.tsx`): Print settings selection (color, paper type, copies, binding)
- **Details** (`frontend/app/details/page.tsx`): Student information collection
- **Payment** (`frontend/app/payment/page.tsx`): Payment verification interface
- **Xerox Auth** (`frontend/app/xerox_auth/page.tsx`): Staff login page
- **Xerox Dashboard** (`frontend/app/xerox_dashboard/page.tsx`): Queue management interface

### State Management
- **Order Context** (`frontend/app/context/OrderContext.tsx`): Global state for managing:
  - Uploaded files and page counts
  - Print configuration settings
  - Student information
  - Cost estimation
  - Order reset functionality

### API Integration
- **API Client** (`frontend/app/lib/api.ts`): TypeScript wrapper for all backend endpoints
- Authentication token management
- File upload/download handling
- Error handling and timeout management

## Key Features

### Student Workflow
1. Upload PDF files (drag-and-drop with reordering)
2. Configure print settings (color, paper type, copies, binding)
3. Enter personal details
4. Verify payment via UPI screenshot
5. Submit print order to queue

### Xerox Staff Workflow
1. Authenticate with credentials
2. View print queue in FIFO order
3. Download PDFs (only first in queue)
4. Mark orders as complete/not complete
5. Manage service status (start/stop)
6. Clear database when needed

### Security Measures
- JWT token authentication
- Role-based access control
- Input sanitization and validation
- Rate limiting
- FIFO enforcement (only first order downloadable)
- Secure password handling

### Payment Verification
- OCR-based UPI screenshot validation
- Transaction ID extraction
- Receiver verification (name and phone)
- Support for multiple UPI app formats

## Dependencies

### Backend
- FastAPI: Web framework
- SQLAlchemy: Database ORM
- PyPDF2: PDF manipulation
- ReportLab: PDF generation
- pytesseract: OCR processing
- Pillow: Image processing
- PyJWT: JWT token handling
- slowapi: Rate limiting

### Frontend
- Next.js: React framework
- React: UI library
- TypeScript: Type safety

## Data Flow
1. Students upload files and configure settings
2. Frontend sends order to backend API
3. Backend validates inputs and creates front page
4. PDFs are merged with front page as first page
5. Order is stored in database with queue position
6. Xerox staff view queue in dashboard
7. Only first order can be downloaded/processed
8. Orders are marked complete or deleted
9. Queue positions automatically adjust

## Configuration
- Xerox manager details in `xerox_config.py`
- Service status in `service_status.json`
- JWT secret key in environment variables
- Database file: `print_orders.db` (SQLite)
