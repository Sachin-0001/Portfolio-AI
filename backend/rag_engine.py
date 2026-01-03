import os
import json
from typing import List, Dict
import numpy as np
from groq import Groq
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

class PortfolioRAG:
    def __init__(self, portfolio_data_path: str):
        """Initialize the RAG system with portfolio data"""
        self.portfolio_data_path = portfolio_data_path
        self.vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
        self.groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        
        # Load and process portfolio data
        self.portfolio_data = self._load_portfolio_data()
        self.documents = self._create_documents()
        
        # Create vector store using TF-IDF (lightweight)
        self.doc_vectors = self._create_vector_store()
        
    def _load_portfolio_data(self) -> Dict:
        """Load portfolio data from JSON file"""
        with open(self.portfolio_data_path, 'r', encoding='utf-8') as f:
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
                'content': f"Company: {exp['company']}\nRole: {exp['role']}\nStart Date: {exp['start_date']}\nEnd Date: {exp.get('end_date', 'Present')}\nDescription: {exp['description']}",
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
        """Create TF-IDF vector store from documents (lightweight)"""
        texts = [doc['content'] for doc in self.documents]
        doc_vectors = self.vectorizer.fit_transform(texts)
        return doc_vectors
    
    def retrieve_context(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve relevant documents for the query"""
        # Vectorize query
        query_vector = self.vectorizer.transform([query])
        query_vector = self.vectorizer.transform([query])
        
        # Calculate similarity
        similarities = cosine_similarity(query_vector, self.doc_vectors)[0]
        
        # Get top k indices
        top_indices = np.argsort(similarities)[::-1][:min(top_k, len(self.documents))]
        
        # Get relevant documents
        relevant_docs = [self.documents[idx] for idx in top_indices if similarities[idx] > 0]
        return relevant_docs if relevant_docs else self.documents[:top_k]
    
    def generate_response(self, query: str, context_docs: List[Dict]) -> str:
        """Generate response using Groq LLM"""
        # Prepare context
        context = "\n\n".join([doc['content'] for doc in context_docs])
        
        # Create prompt with explicit formatting instructions
        prompt = f"""You are an AI assistant representing Sachin's portfolio. Use the following context to answer the user's question in a friendly, informative, and engaging manner.

Context:
{context}

User Question: {query}

CRITICAL FORMATTING INSTRUCTIONS - FOLLOW EXACTLY:
1. Start with a main header using ## followed by an emoji (e.g., ## 🚀 Hiring Sachin)
2. After the header, add a blank line, then write an engaging paragraph
3. Use ### for subsections with emojis (e.g., ### 📋 Contact Information)
4. Always add a blank line after headers before content
5. Use **bold text** for key terms and important information
6. Use bullet points (- ) for lists, with blank lines before and after the list
7. Add emojis throughout (🚀 💡 ⚡ 🎯 🏆 💻 🔧 🌟 ✨ 📊 🎨 📧 🌐 etc.)
8. Use > for blockquotes when highlighting achievements
9. Always add blank lines between different sections
10. For inline code or technical terms, use backticks: `React`

Example format (copy this structure exactly):

## 🚀 Hiring Sachin

To hire Sachin, you can follow these steps, highlighting his **technical skills** and *excellent work experience*.

### 📋 Contact Information

Visit his **LinkedIn** profile: [link here]

Check out his **GitHub** repository: [link here]

### 💡 Additional Information

Sachin has a strong background in **programming languages** such as Python, Java, C++, JavaScript, and TypeScript.

He is also experienced in **frameworks and libraries** like React, Next.js, Tailwind CSS, and MongoDB.

His expertise in **Machine Learning, LLMs, NLP, RAG, FAISS**, and **Streamlit** makes him a valuable asset to any team.

Now answer the question with this exact formatting style, ensuring blank lines between all sections:"""

        # Generate response using Groq
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": """You are a helpful AI assistant representing Sachin's portfolio. 

CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
1. Always start with ## followed by emoji and title (e.g., ## 🚀 My Skills)
2. Add a BLANK LINE after every header before content
3. Use ### for subheaders with emojis (e.g., ### 💻 Technical Stack)
4. Use **bold** for ALL important terms, skills, and key information
5. Add relevant emojis throughout (🚀 💡 ⚡ 🎯 🏆 💻 🔧 🌟 ✨ 📊 🎨 🎓 📱 🌐 📧 etc.)
6. Use - for bullet points, with blank lines before and after lists
7. Always add BLANK LINES between sections and paragraphs
8. For inline technical terms, use backticks: `React`, `Python`
9. Use > for blockquotes when quoting or highlighting
10. Write in short, clear paragraphs with blank lines between them

STRUCTURE EXAMPLE:
## 🚀 Title

First paragraph with **bold terms** here.

### 📋 Subsection

Another paragraph with **important info**.

- First bullet point
- Second bullet point
- Third bullet point

Next paragraph continues here.

You provide accurate, friendly, and engaging responses about Sachin's projects, skills, experience, and achievements."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=1000,
            )
            
            return chat_completion.choices[0].message.content
        
        except Exception as e:
            print(f"Error generating response: {str(e)}")
            return f"## ⚠️ Error\n\nI apologize, but I encountered an error processing your request. Please try again.\n\n*Error details: {str(e)}*"

    def query(self, user_query: str) -> Dict:
        """Main query method - retrieves context and generates response"""
        # Check if query is about specific topics that need special formatting
        query_lower = user_query.lower()
        
        # If asking about all projects, return all projects
        if any(keyword in query_lower for keyword in ['all projects', 'show projects', 'list projects', 'your projects', 'what projects', 'tell me about your projects']):
            return {
                'response': "## 🚀 My Projects\n\nHere are all the projects I've worked on:",
                'sources': [],
                'structured_data': {
                    'type': 'projects',
                    'data': self.portfolio_data.get('projects', [])
                }
            }
    
        if any(keyword in query_lower for keyword in ['skills', 'technologies', 'tech stack', 'what can you do', 'what do you know', 'programming languages']):
            return {
                'response': "## 💻 My Technical Skills\n\nHere's my comprehensive skill set:",
                'sources': [],
                'structured_data': {
                    'type': 'skills',
                    'data': self.portfolio_data.get('skills', [])
                }
            }
        
        if any(keyword in query_lower for keyword in ['achievements', 'accomplishments', 'awards', 'won', 'competitions', 'hackathon']):
            return {
                'response': "## 🏆 My Achievements\n\nHere are some of my notable accomplishments:",
                'sources': [],
                'structured_data': {
                    'type': 'achievements',
                    'data': self.portfolio_data.get('achievements', [])
                }
            }
        
        if any(keyword in query_lower for keyword in ['experience', 'work', 'job', 'internship', 'where have you worked', 'companies']):
            return {
                'response': "## 💼 My Professional Experience\n\nHere's an overview of my work history:",
                'sources': [],
                'structured_data': {
                    'type': 'experience',
                    'data': self.portfolio_data.get('experience', [])
                }
            }
        
        if any(keyword in query_lower for keyword in ['social', 'contact', 'github', 'linkedin', 'twitter', 'reach', 'connect', 'find you']):
            return {
                'response': "## 🌐 Connect With Me\n\nYou can reach me on these platforms:",
                'sources': [],
                'structured_data': {
                    'type': 'socials',
                    'data': self.portfolio_data.get('socials', [])
                }
            }
        
        if any(keyword in query_lower for keyword in ['resume', 'cv', 'curriculum vitae', 'download resume', 'your resume', 'see resume', 'view resume']):
            return {
                'response': "## 📄 My Resume\n\nYou can download my resume to learn more about my professional background, skills, and experience.",
                'sources': [],
                'structured_data': {
                    'type': 'resume',
                    'data': {
                        'filename': 'Sachin.pdf',
                        'url': '/Sachin.pdf'
                    }
                }
            }
        
        # For other queries, use RAG
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