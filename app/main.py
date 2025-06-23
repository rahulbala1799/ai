from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from typing import List
import os
from dotenv import load_dotenv
import io
import asyncio

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="PDF Data Extraction API",
    description="AI-powered PDF data extraction and analysis tool",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
if not os.path.exists("uploads"):
    os.makedirs("uploads")
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint for Railway
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "PDF Extraction API is running"}

# Root endpoint - serve the frontend
@app.get("/")
async def root():
    from fastapi.responses import FileResponse
    return FileResponse("static/index.html")

# API info endpoint
@app.get("/api")
async def api_info():
    return {
        "message": "Welcome to PDF Data Extraction API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Batch PDF processing endpoint - NEW
@app.post("/api/v1/batch-extract")
async def batch_extract_invoices(files: List[UploadFile] = File(...)):
    """Process multiple PDF invoices for Excel export"""
    try:
        if len(files) > 50:  # Limit batch size
            raise HTTPException(status_code=400, detail="Maximum 50 files allowed per batch")
        
        # Validate all files are PDFs
        for file in files:
            if file.content_type != "application/pdf":
                raise HTTPException(
                    status_code=400, 
                    detail=f"File {file.filename} is not a PDF. Only PDF files are allowed."
                )
        
        from app.services.openai_service import OpenAIService
        ai_service = OpenAIService()
        
        # Process all PDFs
        processed_invoices = []
        
        for file in files:
            try:
                # Read file content
                content = await file.read()
                
                # Extract text with pdfplumber
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    full_text = ""
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            full_text += text + "\n"
                
                # Extract structured invoice data for Excel
                filename = file.filename or "unknown_file.pdf"
                invoice_data = await ai_service.extract_invoice_for_excel(full_text, filename)
                processed_invoices.append(invoice_data)
                
            except Exception as e:
                # Add error record for failed files
                filename = file.filename or "unknown_file.pdf"
                processed_invoices.append({
                    "error": f"Failed to process {filename}: {str(e)}",
                    "invoice_summary": ai_service._get_empty_invoice_summary(filename),
                    "line_items": []
                })
        
        return {
            "status": "success",
            "processed_count": len(processed_invoices),
            "invoices": processed_invoices,
            "message": f"Successfully processed {len(processed_invoices)} invoice(s)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing error: {str(e)}")

# Excel export endpoint - NEW
@app.post("/api/v1/export-excel")
async def export_to_excel(invoice_data: dict):
    """Export processed invoice data to Excel format"""
    try:
        from app.services.excel_service import ExcelService
        
        excel_service = ExcelService()
        invoice_list = invoice_data.get('invoices', [])
        
        if not invoice_list:
            raise HTTPException(status_code=400, detail="No invoice data provided")
        
        # Generate Excel file
        excel_bytes = excel_service.create_excel_from_invoices(invoice_list)
        
        # Create filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"invoice_batch_{timestamp}.xlsx"
        
        # Return Excel file as download
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel export error: {str(e)}")

# PDF extraction endpoint (keep existing for compatibility)
@app.post("/api/v1/extract")
async def extract_pdf_data(
    file: UploadFile = File(...),
    extraction_type: str = Form("general")
):
    """Extract data from uploaded PDF"""
    try:
        # Validate file type
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read file content
        content = await file.read()
        
        # Process PDF with pdfplumber
        import pdfplumber
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            # Extract text from all pages
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # Use OpenAI for intelligent analysis
        from app.services.openai_service import OpenAIService
        import time
        
        start_time = time.time()
        ai_service = OpenAIService()
        
        # Get AI analysis
        structured_data = await ai_service.analyze_pdf_content(full_text, extraction_type)
        ai_summary = await ai_service.generate_summary(full_text, extraction_type)
        entities = await ai_service.extract_entities(full_text)
        
        processing_time = f"{time.time() - start_time:.1f} seconds"
        
        results = {
            "filename": file.filename,
            "file_size": len(content),
            "extraction_type": extraction_type,
            "page_count": len(pdf.pages) if 'pdf' in locals() else 1,
            "processing_time": processing_time,
            "structured_data": structured_data,
            "raw_text": full_text[:3000] + "..." if len(full_text) > 3000 else full_text,
            "ai_summary": ai_summary,
            "extracted_entities": entities
        }
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

# Basic upload endpoint for compatibility
@app.post("/api/v1/upload")
async def upload_pdf():
    return {"message": "PDF upload endpoint ready", "status": "success"}

# Include routers when we create them
# from app.routers import pdf_router, auth_router
# app.include_router(pdf_router.router, prefix="/api/v1/pdf", tags=["pdf"])
# app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["auth"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 