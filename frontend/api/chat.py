from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Add parent directory to path to import rag_engine
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from rag_engine import PortfolioRAG

# Initialize RAG system (will be cached by Vercel)
portfolio_data_path = os.path.join(os.path.dirname(__file__), 'portfolio_data.json')
portfolio_rag = PortfolioRAG(portfolio_data_path)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Get request body
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            message = data.get('message', '').strip()
            
            if not message:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No message provided'}).encode())
                return
            
            # Get response from RAG system
            result = portfolio_rag.query(message)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'response': result['response'],
                'sources': result['sources'],
                'structured_data': result.get('structured_data')
            }
            
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {
                'error': 'An error occurred processing your request',
                'details': str(e)
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
