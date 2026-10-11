"""Builds a fictional résumé PDF for tests and live checks. Everyone and everything in it is made up.

Run:  python tests/synthetic_resume.py out.pdf
"""
import io
import sys

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

LINES = [
    ('Aarav Mehta', 18),
    ('aarav.mehta@example.com | github.com/aarav-mehta-demo | Pune, India', 9),
    ('EDUCATION', 12),
    ('Northfield Institute of Technology, B.Tech in Computer Science, CGPA 9.1/10, 2022 - 2026', 10),
    ('EXPERIENCE', 12),
    ('Machine Learning Intern, Nimbus Analytics (Jan 2025 - Dec 2025)', 10),
    ('- Built a demand-forecasting model with LightGBM that cut stock-outs by 18% across 40 stores.', 9),
    ('- Deployed the model as a FastAPI service on AWS Lambda with daily retraining in Airflow.', 9),
    ('Research Assistant, Northfield Vision Lab (Jun 2024 - Dec 2024)', 10),
    ('- Fine-tuned a ViT image classifier in PyTorch for crop-disease detection, reaching 94% accuracy.', 9),
    ('PROJECTS', 12),
    ('DocuMind: RAG assistant over university handbooks using LangChain, FAISS and Llama 3; 1,200 student users.', 9),
    ('TrafficSense: real-time vehicle counting with YOLOv8 and OpenCV on a Raspberry Pi.', 9),
    ('SKILLS', 12),
    ('Python, PyTorch, TensorFlow, Scikit-learn, LightGBM, LangChain, FAISS, FastAPI, Docker, AWS, SQL, React', 9),
    ('ACHIEVEMENTS', 12),
    ('Winner, Smart India Hackathon 2024 (software edition). Kaggle Notebooks Expert.', 9),
]


def build(github_url: str = 'https://github.com/aarav-mehta-demo', pages: int = 1, text: bool = True) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    for _ in range(pages):
        if text:
            y = height - 60
            for line, size in LINES:
                c.setFont('Helvetica-Bold' if size >= 12 else 'Helvetica', size)
                c.drawString(50, y, line)
                y -= size + 10
            c.linkURL(github_url, (50, height - 90, 300, height - 75))
        c.showPage()
    c.save()
    return buf.getvalue()


if __name__ == '__main__':
    with open(sys.argv[1] if len(sys.argv) > 1 else 'synthetic_resume.pdf', 'wb') as f:
        f.write(build())
