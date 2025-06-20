from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

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

# PDF extraction endpoint
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
        import io
        
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