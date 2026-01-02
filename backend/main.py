from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from rag_engine import PortfolioRAG
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Portfolio AI API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system
portfolio_rag = PortfolioRAG('portfolio_data.json')

# Pydantic models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: list
    structured_data: Optional[dict] = None

@app.post('/api/chat', response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests from frontend"""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail='No message provided')
        
        # Get response from RAG system
        result = portfolio_rag.query(request.message)
        
        return ChatResponse(
            response=result['response'],
            sources=result['sources'],
            structured_data=result.get('structured_data')
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f'An error occurred processing your request: {str(e)}'
        )

@app.get('/')
async def root():
    """Root endpoint"""
    return {'message': 'Portfolio AI API is running', 'status': 'healthy'}

@app.get('/api/health')
async def health():
    """Health check endpoint"""
    return {'status': 'healthy'}

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host='0.0.0.0', port=port, log_level="info")
