from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal
from rag_engine import PortfolioRAG
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize RAG system lazily
portfolio_rag = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize RAG system after server starts"""
    global portfolio_rag
    print("Initializing RAG system...")
    portfolio_rag = PortfolioRAG('portfolio_data.json')
    print("RAG system initialized successfully!")
    yield

app = FastAPI(title="Portfolio AI API", version="2.0.0", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatTurn(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(max_length=4000)

class ChatRequest(BaseModel):
    message: str = Field(max_length=2000)
    history: List[ChatTurn] = Field(default_factory=list, max_length=20)

class Source(BaseModel):
    id: str
    type: str
    title: str

class ChatResponse(BaseModel):
    response: str
    sources: List[Source]
    cards: List[dict]

@app.post('/api/chat', response_model=ChatResponse)
def chat(request: ChatRequest):
    """Handle chat requests from frontend"""
    try:
        if portfolio_rag is None:
            raise HTTPException(status_code=503, detail='AI system is still initializing, please try again in a moment')
        
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail='No message provided')
        
        result = portfolio_rag.query(
            request.message.strip(),
            history=[turn.model_dump() for turn in request.history],
        )
        return ChatResponse(**result)
    
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
