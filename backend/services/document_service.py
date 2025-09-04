"""
Professional Banking Document Generation Service
Creates authentic bank documents with logos, QR codes, barcodes, and security features
Based on real bank templates for educational/training purposes
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import io
import os
import uuid
import base64
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import json

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode import qr
from reportlab.graphics.barcode import code128
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

class BankTemplate(BaseModel):
    """Bank template configuration."""
    bank_name: str
    bank_code: str  # e.g., DEUTDEFFXXX
    logo_path: Optional[str] = None
    primary_color: str = "#1f4e79"  # Deutsche Bank blue
    secondary_color: str = "#ffffff"
    header_height: float = 80
    footer_height: float = 60
    address_lines: List[str] = []
    contact_info: Dict[str, str] = {}

class DocumentTemplate(BaseModel):
    """Document template configuration."""
    template_id: str
    template_name: str
    document_type: str  # balance_sheet, swift_mt103, remittance_advice, debit_note
    bank_template: BankTemplate
    layout_config: Dict[str, Any] = {}

class DocumentRequest(BaseModel):
    """Document generation request."""
    document_type: str
    bank_code: str
    transfer_data: Dict[str, Any]
    additional_data: Optional[Dict[str, Any]] = {}
    include_qr_code: bool = True
    include_barcode: bool = True
    watermark: Optional[str] = "EDUCATIONAL SIMULATION"

class GeneratedDocument(BaseModel):
    """Generated document response."""
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: str
    bank_code: str
    transfer_id: str
    file_path: str
    file_size: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    download_count: int = 0

class ProfessionalDocumentService:
    """Professional banking document generation service."""
    
    def __init__(self, db_client: AsyncIOMotorClient, db_name: str):
        self.db = db_client[db_name]
        self.logger = logging.getLogger(__name__)
        self.documents_dir = "/app/generated_documents"
        self.templates_dir = "/app/document_templates"
        
        # Ensure directories exist
        os.makedirs(self.documents_dir, exist_ok=True)
        os.makedirs(self.templates_dir, exist_ok=True)
        
        # Initialize bank templates
        self.bank_templates = self._initialize_bank_templates()
        
        # Document expiry (24 hours)
        self.document_expiry_hours = 24
    
    def _initialize_bank_templates(self) -> Dict[str, BankTemplate]:
        """Initialize bank templates based on provided references."""
        templates = {}
        
        # Deutsche Bank Template (based on provided documents)
        deutsche_bank = BankTemplate(
            bank_name="Deutsche Bank AG",
            bank_code="DEUTDEFFXXX",
            primary_color="#1f4e79",  # Deutsche Bank blue
            secondary_color="#ffffff",
            header_height=100,
            footer_height=80,
            address_lines=[
                "TAUNUSANLAGE 12,60254 FRANKFURT AM MAIN GERMANY",
                "TEL: +49699100  FAX: +49699103425"
            ],
            contact_info={
                "phone": "+49699100",
                "fax": "+49699103425",
                "email": "info@db.com",
                "website": "www.deutsche-bank.de"
            }
        )
        templates["DEUTDEFFXXX"] = deutsche_bank
        templates["DEUTDEFF"] = deutsche_bank  # Short code
        
        # Add more bank templates as needed
        # Chase Bank Template (example)
        chase_bank = BankTemplate(
            bank_name="JPMorgan Chase Bank N.A.",
            bank_code="CHASUS33XXX",
            primary_color="#004879",  # Chase blue
            secondary_color="#ffffff",
            header_height=90,
            footer_height=70,
            address_lines=[
                "270 PARK AVENUE, NEW YORK, NY 10017, USA",
                "TEL: +1-212-270-6000  FAX: +1-212-270-1648"
            ],
            contact_info={
                "phone": "+1-212-270-6000",
                "fax": "+1-212-270-1648",
                "email": "info@chase.com",
                "website": "www.chase.com"
            }
        )
        templates["CHASUS33XXX"] = chase_bank
        templates["CHASUS33"] = chase_bank
        
        return templates
    
    def _generate_qr_code(self, data: str, size: int = 100) -> io.BytesIO:
        """Generate QR code for document verification."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size))
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    
    def _generate_barcode(self, data: str, width: int = 300) -> io.BytesIO:
        """Generate barcode for document tracking."""
        code = Code128(data, writer=ImageWriter())
        buffer = io.BytesIO()
        code.write(buffer)
        buffer.seek(0)
        return buffer
    
    def _create_document_header(self, canvas_obj, bank_template: BankTemplate, 
                               document_type: str, page_width: float, page_height: float):
        """Create professional document header."""
        # Header background
        canvas_obj.setFillColor(colors.Color(
            int(bank_template.primary_color[1:3], 16)/255,
            int(bank_template.primary_color[3:5], 16)/255,
            int(bank_template.primary_color[5:7], 16)/255
        ))
        canvas_obj.rect(0, page_height - bank_template.header_height, 
                       page_width, bank_template.header_height, fill=1)
        
        # Bank name
        canvas_obj.setFillColor(colors.white)
        canvas_obj.setFont("Helvetica-Bold", 24)
        canvas_obj.drawString(50, page_height - 40, bank_template.bank_name)
        
        # Document type
        canvas_obj.setFont("Helvetica-Bold", 14)
        canvas_obj.drawString(50, page_height - 65, document_type.upper().replace("_", " "))
        
        # SWIFT logo placeholder (right side)
        canvas_obj.setFillColor(colors.white)
        canvas_obj.circle(page_width - 80, page_height - 40, 25, fill=1)
        canvas_obj.setFillColor(colors.Color(
            int(bank_template.primary_color[1:3], 16)/255,
            int(bank_template.primary_color[3:5], 16)/255,
            int(bank_template.primary_color[5:7], 16)/255
        ))
        canvas_obj.setFont("Helvetica-Bold", 10)
        canvas_obj.drawString(page_width - 95, page_height - 45, "SWIFT")
    
    def _create_document_footer(self, canvas_obj, bank_template: BankTemplate, 
                               page_width: float, page_height: float, 
                               transfer_data: Dict[str, Any]):
        """Create professional document footer with signatures and security."""
        footer_y = 80
        
        # Footer line
        canvas_obj.setStrokeColor(colors.grey)
        canvas_obj.line(50, footer_y + 40, page_width - 50, footer_y + 40)
        
        # Bank address
        canvas_obj.setFillColor(colors.black)
        canvas_obj.setFont("Helvetica", 8)
        y_pos = footer_y + 25
        for line in bank_template.address_lines:
            canvas_obj.drawString(50, y_pos, line)
            y_pos -= 12
        
        # Authorized signature section
        canvas_obj.setFont("Helvetica-Bold", 10)
        canvas_obj.drawString(350, footer_y + 25, "AUTHORIZED SIGNATURE")
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.drawString(350, footer_y + 10, "OFFICER NAME: ERIC MARTIN")
        canvas_obj.drawString(350, footer_y - 5, "TITLE: CHIEF EXECUTIVE OFFICER")
        
        # Official seal/stamp placeholder
        canvas_obj.setStrokeColor(colors.blue)
        canvas_obj.circle(450, footer_y, 30, fill=0)
        canvas_obj.setFont("Helvetica-Bold", 6)
        canvas_obj.drawString(435, footer_y + 5, bank_template.bank_name.split()[0])
        canvas_obj.drawString(440, footer_y - 5, "OFFICIAL")
        
        # Print date
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.drawRightString(page_width - 50, 30, 
                                 f"Printed at {datetime.utcnow().strftime('%d/%m/%Y')}")
    
    async def generate_balance_sheet(self, request: DocumentRequest) -> GeneratedDocument:
        """Generate professional balance sheet document."""
        transfer_data = request.transfer_data
        bank_template = self.bank_templates.get(request.bank_code)
        
        if not bank_template:
            raise ValueError(f"Bank template not found for {request.bank_code}")
        
        # Create PDF
        filename = f"balance_sheet_{transfer_data['transfer_id'][:8]}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(self.documents_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            textColor=colors.Color(
                int(bank_template.primary_color[1:3], 16)/255,
                int(bank_template.primary_color[3:5], 16)/255,
                int(bank_template.primary_color[5:7], 16)/255
            ),
            alignment=TA_CENTER
        )
        
        # Document content
        story.append(Spacer(1, 50))  # Space for header
        
        # Title with red border (like Deutsche Bank format)
        title_table = Table([["BALANCE SHEET"]], colWidths=[6*inch])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.red),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('BOX', (0, 0), (-1, -1), 2, colors.red),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(title_table)
        story.append(Spacer(1, 20))
        
        # Transaction reference and date
        ref_data = [
            [f"Transaction Ref No.: {transfer_data['transfer_id']}", f"DEUT{transfer_data['transfer_id'][-10:]}"],
            ["Statement Date:", datetime.utcnow().strftime("%d/%m/%Y")]
        ]
        ref_table = Table(ref_data, colWidths=[3*inch, 3*inch])
        ref_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(ref_table)
        story.append(Spacer(1, 20))
        
        # Account information
        account_data = [
            ["ACCOUNT NAME:", transfer_data.get('sender_name', 'STERLING INTERNATIONAL GMBH')],
            ["SWIFT:", request.bank_code],
            ["IBAN:", f"DE31500700107818852334"]  # Simulated IBAN
        ]
        account_table = Table(account_data, colWidths=[2*inch, 4*inch])
        account_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(account_table)
        story.append(Spacer(1, 30))
        
        # Balance information
        current_balance = Decimal('255896399.24')  # Simulated balance
        transfer_amount = Decimal(str(transfer_data.get('amount', 0)))
        previous_balance = current_balance + transfer_amount
        
        balance_data = [
            ["Currency:", f"{transfer_data.get('currency', 'EUR')} (€)"],
            ["Available Funds:", f"€{current_balance:,.2f}"],
            ["Last Payment Out:", f"{transfer_amount:,.2f}"],
            ["Total Balance:", f"€{current_balance:,.2f}"],
            ["Overdraft Limit:", "€12.00"]
        ]
        
        balance_table = Table(balance_data, colWidths=[2*inch, 2*inch])
        balance_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(balance_table)
        story.append(Spacer(1, 30))
        
        # Transaction details section
        story.append(Paragraph("DETAILS OF LAST TRANSACTION", styles['Heading3']))
        story.append(Spacer(1, 10))
        
        transaction_details = [
            ["MT103 CASH WIRE TRANSFER", ""],
            ["BANK NAME", f": {transfer_data.get('receiver_name', 'BANK OF BARODA MAURITIUS LTD')}"],
            ["BANK ADDRESS", ": SIR WILLIAM NEWTON STREET, PORT LOUIS, MAURITIUS"],
            ["SWIFT CODE", f": {transfer_data.get('receiver_bic', 'BARBMUMUXXX')}"],
            ["ACCOUNT NAME", f": {transfer_data.get('receiver_name', 'YASHICA INVESTMENT LTD')}"],
            ["ACCOUNT NUMBER", ": 9031019015729"],
            ["AMOUNT", f": {transfer_amount:,.2f} #{transfer_data.get('currency', 'EUR')}#"],
            ["UETR", f": 7gh482k1-29lm-34np-hr88-f3j940ee3h2"],
            ["TRANSACTION CODE", f": STINTCH-YASMNTD-{datetime.utcnow().strftime('%d%m%Y')}"],
            ["SWIFT CHARGES", f": €1,899.00 #{transfer_data.get('currency', 'EUR')}#"],
            ["TIME", f": {datetime.utcnow().strftime('%d/%m/%Y - %H:%M:%S')}"]
        ]
        
        details_table = Table(transaction_details, colWidths=[2*inch, 4*inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(details_table)
        story.append(Spacer(1, 50))  # Space for footer
        
        # Generate QR code if requested
        if request.include_qr_code:
            qr_data = json.dumps({
                "bank": bank_template.bank_name,
                "transfer_id": transfer_data['transfer_id'],
                "amount": str(transfer_amount),
                "currency": transfer_data.get('currency', 'EUR'),
                "date": datetime.utcnow().isoformat(),
                "type": "balance_sheet"
            })
            qr_buffer = self._generate_qr_code(qr_data)
            qr_img = RLImage(qr_buffer, width=1*inch, height=1*inch)
            story.append(qr_img)
        
        # Custom page template with header and footer
        def add_page_elements(canvas_obj, doc):
            self._create_document_header(canvas_obj, bank_template, "Balance Sheet", 
                                       doc.pagesize[0], doc.pagesize[1])
            self._create_document_footer(canvas_obj, bank_template, 
                                       doc.pagesize[0], doc.pagesize[1], transfer_data)
            
            # Add barcode at top
            if request.include_barcode:
                barcode_data = f"DEUT{transfer_data['transfer_id'][-12:]}"
                canvas_obj.setFont("Helvetica", 8)
                canvas_obj.drawString(doc.pagesize[0]/2 - 50, doc.pagesize[1] - 15, barcode_data)
        
        doc.build(story, onFirstPage=add_page_elements, onLaterPages=add_page_elements)
        
        # Create document record
        file_size = os.path.getsize(filepath)
        expires_at = datetime.utcnow() + timedelta(hours=self.document_expiry_hours)
        
        document = GeneratedDocument(
            document_type="balance_sheet",
            bank_code=request.bank_code,
            transfer_id=transfer_data['transfer_id'],
            file_path=filepath,
            file_size=file_size,
            expires_at=expires_at
        )
        
        # Store in database
        await self.db.generated_documents.insert_one(document.dict())
        
        return document
    
    async def generate_swift_mt103(self, request: DocumentRequest) -> GeneratedDocument:
        """Generate professional SWIFT MT103 document."""
        # Similar implementation for MT103 format
        # This would follow the same pattern but with MT103-specific layout
        pass
    
    async def generate_remittance_advice(self, request: DocumentRequest) -> GeneratedDocument:
        """Generate professional remittance advice document."""
        # Implementation for remittance advice format
        pass
    
    async def generate_document_package(self, request: DocumentRequest) -> List[GeneratedDocument]:
        """Generate complete document package for a transfer."""
        documents = []
        
        # Generate all document types
        document_types = [
            ("balance_sheet", self.generate_balance_sheet),
            ("swift_mt103", self.generate_swift_mt103),
            ("remittance_advice", self.generate_remittance_advice)
        ]
        
        for doc_type, generator_func in document_types:
            try:
                if generator_func != self.generate_balance_sheet:  # Only balance sheet implemented for now
                    continue
                    
                doc_request = DocumentRequest(
                    document_type=doc_type,
                    bank_code=request.bank_code,
                    transfer_data=request.transfer_data,
                    additional_data=request.additional_data,
                    include_qr_code=request.include_qr_code,
                    include_barcode=request.include_barcode,
                    watermark=request.watermark
                )
                
                document = await generator_func(doc_request)
                documents.append(document)
                
            except Exception as e:
                self.logger.error(f"Failed to generate {doc_type}: {e}")
        
        return documents
    
    async def get_document(self, document_id: str) -> Optional[GeneratedDocument]:
        """Retrieve document by ID."""
        doc_data = await self.db.generated_documents.find_one({"document_id": document_id})
        if doc_data:
            return GeneratedDocument(**doc_data)
        return None
    
    async def increment_download_count(self, document_id: str) -> bool:
        """Increment download count for a document."""
        result = await self.db.generated_documents.update_one(
            {"document_id": document_id},
            {"$inc": {"download_count": 1}}
        )
        return result.modified_count > 0
    
    async def cleanup_expired_documents(self):
        """Clean up expired documents."""
        try:
            expired_docs = await self.db.generated_documents.find({
                "expires_at": {"$lt": datetime.utcnow()}
            }).to_list(None)
            
            for doc in expired_docs:
                # Delete file
                try:
                    if os.path.exists(doc["file_path"]):
                        os.remove(doc["file_path"])
                except Exception as e:
                    self.logger.error(f"Failed to delete file {doc['file_path']}: {e}")
                
                # Remove from database
                await self.db.generated_documents.delete_one({"document_id": doc["document_id"]})
            
            self.logger.info(f"Cleaned up {len(expired_docs)} expired documents")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup expired documents: {e}")

# Service factory
async def create_document_service(db_client: AsyncIOMotorClient, db_name: str) -> ProfessionalDocumentService:
    """Create document service instance."""
    return ProfessionalDocumentService(db_client, db_name)