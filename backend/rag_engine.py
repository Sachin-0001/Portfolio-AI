import os
import json
from typing import List, Dict
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from groq import Groq

class PortfolioRAG:
    def __init__(self, portfolio_data_path: str):
        """Initialize the RAG system with portfolio data"""
        self.portfolio_data_path = portfolio_data_path
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        
        # Load and process portfolio data
        self.portfolio_data = self._load_portfolio_data()
        self.documents = self._create_documents()
        
        # Create vector store
        self.index, self.doc_store = self._create_vector_store()
        
    def _load_portfolio_data(self) -> Dict:
        """Load portfolio data from JSON file"""
        with open(self.portfolio_data_path, 'r') as f:
            return json.load(f)
    
    def _create_documents(self) -> List[Dict]:
        """Convert portfolio data into searchable documents"""
        documents = []
        
        # Projects
        for project in self.portfolio_data.get('projects', []):
            doc = {
                'type': 'project',
                'content': f"Project: {project['name']}\nDescription: {project['description']}\nTechnologies: {', '.join(project['tags'])}\nLink: {project.get('link', 'N/A')}",
                'metadata': project
            }
            documents.append(doc)
        
        # Skills
        skills = self.portfolio_data.get('skills', [])
        if skills:
            doc = {
                'type': 'skills',
                'content': f"Technical Skills: {', '.join(skills)}",
                'metadata': {'skills': skills}
            }
            documents.append(doc)
        
        # Experience
        for exp in self.portfolio_data.get('experience', []):
            doc = {
                'type': 'experience',
                'content': f"Company: {exp['company']}\nRole: {exp['role']}\nStart Date: {exp['start_date']}\nDescription: {exp['description']}",
                'metadata': exp
            }
            documents.append(doc)
        
        # Achievements
        for achievement in self.portfolio_data.get('achievements', []):
            doc = {
                'type': 'achievement',
                'content': f"Achievement: {achievement['title']}\nDescription: {achievement['description']}\nDate: {achievement['date']}",
                'metadata': achievement
            }
            documents.append(doc)
        
        # Socials
        socials = self.portfolio_data.get('socials', [])
        if socials:
            social_links = '\n'.join([f"{s['platform']}: {s['link']}" for s in socials])
            doc = {
                'type': 'socials',
                'content': f"Social Media Links:\n{social_links}",
                'metadata': {'socials': socials}
            }
            documents.append(doc)
        
        return documents
    
    def _create_vector_store(self):
        """Create FAISS vector store from documents"""
        # Generate embeddings
        texts = [doc['content'] for doc in self.documents]
        embeddings = self.embedding_model.encode(texts)
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype('float32'))
        
        return index, self.documents
    
    def retrieve_context(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve relevant documents for the query"""
        # Encode query
        query_embedding = self.embedding_model.encode([query])
        
        # Search in FAISS
        distances, indices = self.index.search(np.array(query_embedding).astype('float32'), top_k)
        
        # Get relevant documents
        relevant_docs = [self.doc_store[idx] for idx in indices[0]]
        return relevant_docs
    
    def generate_response(self, query: str, context_docs: List[Dict]) -> str:
        """Generate response using Groq LLM"""
        # Prepare context
        context = "\n\n".join([doc['content'] for doc in context_docs])
        
        # Create prompt
        prompt = f"""You are an AI assistant representing Sachin's portfolio. Use the following context to answer the user's question in a friendly, informative, and engaging manner.

Context:
{context}

User Question: {query}

Instructions:
- Provide accurate information based on the context
- Be enthusiastic and professional
- If asked about projects, highlight key features and technologies
- If asked about skills, provide a comprehensive list
- If asked about experience, provide details about roles and responsibilities
- If asked about achievements, showcase accomplishments with pride
- If the question cannot be answered from the context, politely say so and offer to help with something else
- Keep responses concise but informative
- Use markdown formatting for better readability when appropriate

Answer:"""

        # Generate response using Groq
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful AI assistant representing Sachin's portfolio. You provide accurate, friendly, and engaging responses about Sachin's projects, skills, experience, and achievements."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=1000,
            )
            
            return chat_completion.choices[0].message.content
        
        except Exception as e:
            return f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}"
    
    def query(self, user_query: str) -> Dict:
        """Main query method - retrieves context and generates response"""
        # Check if query is about specific topics that need special formatting
        query_lower = user_query.lower()
        
        # If asking about all projects, return all projects
        if any(keyword in query_lower for keyword in ['all projects', 'show projects', 'list projects', 'your projects', 'what projects', 'tell me about your projects']):
            return {
                'response': "Here are all my projects:",
                'sources': [],
                'structured_data': {
                    'type': 'projects',
                    'data': self.portfolio_data.get('projects', [])
                }
            }
    
        if any(keyword in query_lower for keyword in ['skills', 'technologies', 'tech stack', 'what can you do', 'what do you know', 'programming languages']):
            return {
                'response': "Here are my technical skills:",
                'sources': [],
                'structured_data': {
                    'type': 'skills',
                    'data': self.portfolio_data.get('skills', [])
                }
            }
        
    
        if any(keyword in query_lower for keyword in ['achievements', 'accomplishments', 'awards', 'won', 'competitions', 'hackathon']):
            return {
                'response': "Here are my achievements:",
                'sources': [],
                'structured_data': {
                    'type': 'achievements',
                    'data': self.portfolio_data.get('achievements', [])
                }
            }
        

        if any(keyword in query_lower for keyword in ['experience', 'work', 'job', 'internship', 'where have you worked', 'companies']):
            return {
                'response': "Here's my professional experience:",
                'sources': [],
                'structured_data': {
                    'type': 'experience',
                    'data': self.portfolio_data.get('experience', [])
                }
            }
        
        if any(keyword in query_lower for keyword in ['social', 'contact', 'github', 'linkedin', 'twitter', 'reach', 'connect']):
            return {
                'response': "You can connect with me on:",
                'sources': [],
                'structured_data': {
                    'type': 'socials',
                    'data': self.portfolio_data.get('socials', [])
                }
            }
        

        relevant_docs = self.retrieve_context(user_query, top_k=5)
        
        response = self.generate_response(user_query, relevant_docs)
        
        return {
            'response': response,
            'sources': [
                {
                    'type': doc['type'],
                    'metadata': doc['metadata']
                } for doc in relevant_docs
            ],
            'structured_data': None
        }
