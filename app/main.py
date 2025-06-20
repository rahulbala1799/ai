from fastapi import FastAPI, HTTPException
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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint for Railway
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "PDF Extraction API is running"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to PDF Data Extraction API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Basic PDF upload endpoint (without database)
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