# PDF Data Extraction API

AI-powered PDF data extraction and analysis tool built with FastAPI and OpenAI.

## Features

- 🔍 **Smart PDF Processing**: Extract text, tables, and data from PDFs
- 🤖 **AI-Powered Analysis**: Use OpenAI to understand and structure extracted data
- 📊 **Data Export**: Export extracted data to JSON, CSV, or Excel
- 🚀 **Fast & Scalable**: Built with FastAPI for high performance
- 🐘 **PostgreSQL Database**: Robust data storage and retrieval
- ☁️ **Railway Deployment**: One-click deployment to Railway

## Project Structure

```
ai/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app entry point
│   ├── database.py       # Database configuration
│   ├── models/           # SQLAlchemy models (to be created)
│   ├── routers/          # API route handlers (to be created)
│   ├── services/         # Business logic (to be created)
│   └── utils/            # Utility functions (to be created)
├── requirements.txt      # Python dependencies
├── Procfile             # Railway deployment configuration
├── railway.toml         # Railway settings
├── env.example          # Environment variables template
└── README.md           # This file
```

## Setup Instructions

### 1. Local Development

1. **Clone and install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Run the application:**
   ```bash
   uvicorn app.main:app --reload
   ```

4. **Visit the API docs:**
   - Open http://localhost:8000/docs

### 2. Railway Deployment

1. **Create a Railway account** at https://railway.app

2. **Set up PostgreSQL database:**
   - In Railway dashboard, click "New Project"
   - Add PostgreSQL service
   - Railway will provide `DATABASE_URL` automatically

3. **Deploy the application:**
   - Connect your GitHub repository
   - Railway will automatically detect Python and deploy
   - Set environment variables in Railway dashboard:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `SECRET_KEY`: A random secret key
     - `DATABASE_URL`: (provided by Railway PostgreSQL)

4. **Environment Variables to Set in Railway:**
   ```
   OPENAI_API_KEY=your_openai_api_key
   SECRET_KEY=your_secret_key_here
   DEBUG=False
   ENVIRONMENT=production
   MAX_FILE_SIZE=50
   ```

## Database Setup

The app uses **PostgreSQL** as the primary database. Railway provides managed PostgreSQL:

1. In your Railway project, add PostgreSQL service
2. Railway automatically sets `DATABASE_URL`
3. Database tables will be created automatically when the app starts

## Next Steps

After basic setup, we'll add:
1. 📁 PDF upload endpoints
2. 🔍 PDF processing services
3. 🤖 OpenAI integration
4. 📊 Data export functionality
5. 🎨 React frontend
6. 🔐 Authentication system

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /docs` - API documentation

More endpoints will be added as we develop the features.

## Dependencies

- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Primary database
- **OpenAI**: AI integration
- **pdfplumber**: PDF text extraction
- **pytesseract**: OCR for scanned PDFs 