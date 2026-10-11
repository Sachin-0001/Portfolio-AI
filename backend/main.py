import json

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal
from rag_engine import PortfolioRAG
from duel.pdf import MAX_BYTES
from duel.history import DuelHistory
from duel.service import DuelService, RateLimiter
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize RAG system lazily
portfolio_rag = None
duel_service = None
duel_history = DuelHistory(os.getenv('DATABASE_URL'))
duel_limiter = RateLimiter(limit=5, window_s=600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize RAG system after server starts"""
    global portfolio_rag, duel_service
    print("Initializing RAG system...")
    portfolio_rag = PortfolioRAG('portfolio_data.json')
    if duel_history.enabled:
        try:
            duel_history.ensure_schema()
            print("Duel history database ready")
        except Exception as e:  # the duel still works without the wall; don't fail boot
            print(f"Duel history database unavailable: {type(e).__name__}")
    duel_service = DuelService(portfolio_rag.portfolio_data, portfolio_rag.llm, history=duel_history)
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

def _client_key(request: Request) -> str:
    # The Next.js proxy forwards the visitor's address; spoofable, which is fine for a soft limit
    forwarded = request.headers.get('x-forwarded-for', '')
    return forwarded.split(',')[0].strip() or (request.client.host if request.client else 'unknown')


@app.post('/api/duel')
async def duel(request: Request, file: UploadFile = File(...), github: str = Form('')):
    """Streams NDJSON progress events, ending with a 'done' (result) or 'error' event."""
    if duel_service is None:
        raise HTTPException(status_code=503, detail='AI system is still initializing, please try again in a moment')
    if not duel_limiter.allow(_client_key(request)):
        raise HTTPException(status_code=429, detail='Easy, champ. That is a lot of duels; try again in a few minutes.')

    data = await file.read(MAX_BYTES + 1)  # read one byte past the cap so oversize files are detected
    await file.close()

    def events():
        # Every duel goes on the public wall (headline facts only; the page tells visitors before they upload)
        for event in duel_service.run(data, github[:60], share=True):
            yield json.dumps(event, ensure_ascii=False) + '\n'

    return StreamingResponse(events(), media_type='application/x-ndjson', headers={'Cache-Control': 'no-store'})


@app.get('/api/duels')
def recent_duels(limit: int = Query(24, ge=1, le=50)):
    """The public wall: recent duels plus Sachin's overall record."""
    if not duel_history.enabled:
        return {'enabled': False, 'duels': [], 'record': None}
    try:
        return duel_history.recent(limit)
    except Exception as e:
        print(f"Duel history read failed: {type(e).__name__}")
        raise HTTPException(status_code=503, detail='The duel wall is unavailable right now.')


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
