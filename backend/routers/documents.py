"""
Professional Banking Documents API Router
Generates authentic bank documents with logos, QR codes, and security features
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import os

from services.document_service import (
    ProfessionalDocumentService,
    DocumentRequest,
    GeneratedDocument,
    create_document_service
)
from dependencies import get_database, verify_token
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/documents", tags=["Professional Documents"])
logger = logging.getLogger(__name__)

# Service instance (will be initialized)
_document_service = None

async def get_document_service() -> ProfessionalDocumentService:
    """Get document service instance."""
    global _document_service
    
    if _document_service is None:
        from dependencies import client, db_name
        _document_service = await create_document_service(client, db_name)
    
    return _document_service

@router.get("/health")
async def health_check():
    """Document service health check."""
    return {
        "status": "healthy",
        "service": "professional-documents",
        "supported_banks": ["DEUTDEFFXXX", "CHASUS33XXX"],
        "supported_documents": ["balance_sheet", "swift_mt103", "remittance_advice"],
        "timestamp": datetime.utcnow()
    }

@router.get("/supported-banks")
async def get_supported_banks(
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """Get list of supported banks and their templates."""
    return {
        "supported_banks": [
            {
                "bank_code": "DEUTDEFFXXX",
                "bank_name": "Deutsche Bank AG", 
                "country": "Germany",
                "supported_documents": ["balance_sheet", "swift_mt103", "remittance_advice", "debit_note"]
            },
            {
                "bank_code": "CHASUS33XXX",
                "bank_name": "JPMorgan Chase Bank N.A.",
                "country": "United States",
                "supported_documents": ["balance_sheet", "swift_mt103", "remittance_advice", "debit_note"]
            }
        ],
        "document_types": [
            {
                "type": "balance_sheet",
                "name": "Balance Sheet",
                "description": "Account balance and transaction history"
            },
            {
                "type": "swift_mt103",
                "name": "SWIFT MT103 Transfer",
                "description": "Official SWIFT wire transfer document"
            },
            {
                "type": "remittance_advice",
                "name": "Remittance Advice",
                "description": "Payment confirmation and details"
            },
            {
                "type": "debit_note",
                "name": "Debit Note",
                "description": "Account debit notification"
            }
        ]
    }

@router.post("/generate/{document_type}")
async def generate_document(
    document_type: str,
    request_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """
    Generate a professional banking document.
    
    Supports various document types with authentic bank formatting,
    logos, QR codes, barcodes, and security features.
    """
    try:
        # Validate document type
        supported_types = ["balance_sheet", "swift_mt103", "remittance_advice", "debit_note"]
        if document_type not in supported_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported document type. Supported: {supported_types}"
            )
        
        # Extract required data
        transfer_data = request_data.get("transfer_data", {})
        bank_code = request_data.get("bank_code", "DEUTDEFFXXX")
        additional_data = request_data.get("additional_data", {})
        
        if not transfer_data:
            raise HTTPException(status_code=400, detail="Transfer data is required")
        
        # Create document request
        doc_request = DocumentRequest(
            document_type=document_type,
            bank_code=bank_code,
            transfer_data=transfer_data,
            additional_data=additional_data,
            include_qr_code=request_data.get("include_qr_code", True),
            include_barcode=request_data.get("include_barcode", True),
            watermark=request_data.get("watermark", "EDUCATIONAL SIMULATION")
        )
        
        # Generate document
        if document_type == "balance_sheet":
            document = await document_service.generate_balance_sheet(doc_request)
        else:
            raise HTTPException(
                status_code=501, 
                detail=f"Document type {document_type} not yet implemented"
            )
        
        # Schedule cleanup in background
        background_tasks.add_task(
            document_service.cleanup_expired_documents
        )
        
        return {
            "success": True,
            "document_id": document.document_id,
            "document_type": document.document_type,
            "bank_code": document.bank_code,
            "transfer_id": document.transfer_id,
            "file_size": document.file_size,
            "generated_at": document.generated_at,
            "expires_at": document.expires_at,
            "download_url": f"/api/documents/download/{document.document_id}",
            "preview_url": f"/api/documents/preview/{document.document_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating {document_type}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate document")

@router.post("/generate-package")
async def generate_document_package(
    request_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """
    Generate complete document package for a transfer.
    
    Creates all relevant documents (balance sheet, MT103, remittance advice)
    for a single transfer with consistent styling and data.
    """
    try:
        transfer_data = request_data.get("transfer_data", {})
        bank_code = request_data.get("bank_code", "DEUTDEFFXXX")
        
        if not transfer_data:
            raise HTTPException(status_code=400, detail="Transfer data is required")
        
        # Create document request
        doc_request = DocumentRequest(
            document_type="package",
            bank_code=bank_code,
            transfer_data=transfer_data,
            additional_data=request_data.get("additional_data", {}),
            include_qr_code=request_data.get("include_qr_code", True),
            include_barcode=request_data.get("include_barcode", True),
            watermark=request_data.get("watermark", "EDUCATIONAL SIMULATION")
        )
        
        # Generate document package
        documents = await document_service.generate_document_package(doc_request)
        
        # Schedule cleanup in background
        background_tasks.add_task(
            document_service.cleanup_expired_documents
        )
        
        return {
            "success": True,
            "package_id": f"pkg_{transfer_data.get('transfer_id', 'unknown')}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "transfer_id": transfer_data.get('transfer_id'),
            "bank_code": bank_code,
            "documents": [
                {
                    "document_id": doc.document_id,
                    "document_type": doc.document_type,
                    "file_size": doc.file_size,
                    "download_url": f"/api/documents/download/{doc.document_id}",
                    "preview_url": f"/api/documents/preview/{doc.document_id}"
                }
                for doc in documents
            ],
            "total_documents": len(documents),
            "generated_at": datetime.utcnow(),
            "expires_at": documents[0].expires_at if documents else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating document package: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate document package")

@router.get("/download/{document_id}")
async def download_document(
    document_id: str,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """
    Download a generated document.
    
    Returns the PDF file for download with appropriate headers
    and increments the download counter.
    """
    try:
        # Get document info
        document = await document_service.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if file exists
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="Document file not found")
        
        # Check if expired
        if datetime.utcnow() > document.expires_at:
            raise HTTPException(status_code=410, detail="Document has expired")
        
        # Increment download count
        await document_service.increment_download_count(document_id)
        
        # Generate filename
        filename = f"{document.bank_code}_{document.document_type}_{document.transfer_id[:8]}.pdf"
        
        return FileResponse(
            path=document.file_path,
            media_type='application/pdf',
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Document-ID": document.document_id,
                "X-Bank-Code": document.bank_code,
                "X-Transfer-ID": document.transfer_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download document")

@router.get("/preview/{document_id}")
async def preview_document(
    document_id: str,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """
    Preview a generated document in browser.
    
    Returns the PDF file for inline viewing without download.
    """
    try:
        # Get document info
        document = await document_service.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if file exists
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="Document file not found")
        
        # Check if expired
        if datetime.utcnow() > document.expires_at:
            raise HTTPException(status_code=410, detail="Document has expired")
        
        return FileResponse(
            path=document.file_path,
            media_type='application/pdf',
            headers={
                "Content-Disposition": "inline",
                "X-Document-ID": document.document_id,
                "X-Bank-Code": document.bank_code,
                "X-Transfer-ID": document.transfer_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview document")

@router.get("/info/{document_id}")
async def get_document_info(
    document_id: str,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """Get information about a generated document."""
    try:
        document = await document_service.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "document_id": document.document_id,
            "document_type": document.document_type,
            "bank_code": document.bank_code,
            "transfer_id": document.transfer_id,
            "file_size": document.file_size,
            "generated_at": document.generated_at,
            "expires_at": document.expires_at,
            "download_count": document.download_count,
            "is_expired": datetime.utcnow() > document.expires_at,
            "file_exists": os.path.exists(document.file_path) if hasattr(document, 'file_path') else False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document info {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get document info")

@router.delete("/cleanup")
async def cleanup_expired_documents(
    background_tasks: BackgroundTasks,
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """Manually trigger cleanup of expired documents."""
    try:
        if current_user["role"] not in ["admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Run cleanup in background
        background_tasks.add_task(document_service.cleanup_expired_documents)
        
        return {
            "success": True,
            "message": "Document cleanup initiated",
            "timestamp": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating document cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate cleanup")

@router.get("/statistics")
async def get_document_statistics(
    document_service: ProfessionalDocumentService = Depends(get_document_service),
    current_user: dict = Depends(verify_token)
):
    """Get document generation statistics."""
    try:
        # Get statistics from database
        total_docs = await document_service.db.generated_documents.count_documents({})
        
        # Documents by type
        type_pipeline = [
            {"$group": {"_id": "$document_type", "count": {"$sum": 1}}}
        ]
        type_stats = await document_service.db.generated_documents.aggregate(type_pipeline).to_list(None)
        
        # Documents by bank
        bank_pipeline = [
            {"$group": {"_id": "$bank_code", "count": {"$sum": 1}}}
        ]
        bank_stats = await document_service.db.generated_documents.aggregate(bank_pipeline).to_list(None)
        
        # Recent documents (last 24 hours)
        recent_docs = await document_service.db.generated_documents.count_documents({
            "generated_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        })
        
        # Total downloads
        download_pipeline = [
            {"$group": {"_id": None, "total_downloads": {"$sum": "$download_count"}}}
        ]
        download_stats = await document_service.db.generated_documents.aggregate(download_pipeline).to_list(None)
        total_downloads = download_stats[0]["total_downloads"] if download_stats else 0
        
        return {
            "total_documents": total_docs,
            "recent_documents_24h": recent_docs,
            "total_downloads": total_downloads,
            "documents_by_type": {stat["_id"]: stat["count"] for stat in type_stats},
            "documents_by_bank": {stat["_id"]: stat["count"] for stat in bank_stats},
            "avg_downloads_per_document": round(total_downloads / total_docs, 2) if total_docs > 0 else 0,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error getting document statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")