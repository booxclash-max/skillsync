import os
import shutil
import logging
import random
import json
import base64
import io
import fitz  # PyMuPDF
import numpy as np
from PIL import Image

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# --- AI & ML LIBRARIES ---
import erniebot
from paddleocr import PaddleOCR
from huggingface_hub import InferenceClient
from sentence_transformers import SentenceTransformer
import faiss

# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
load_dotenv()
AI_STUDIO_TOKEN = os.getenv("AI_STUDIO_TOKEN")
HF_TOKEN = os.getenv("HF_TOKEN")

if not AI_STUDIO_TOKEN or not HF_TOKEN:
    raise RuntimeError("Missing API Tokens in .env file")

erniebot.api_type = "aistudio"
erniebot.access_token = AI_STUDIO_TOKEN

# Initialize Hugging Face Client for Image Gen
hf_client = InferenceClient(token=HF_TOKEN)

# Initialize Embedding & OCR
embedder = SentenceTransformer('all-MiniLM-L6-v2')
logging.getLogger("ppocr").setLevel(logging.ERROR)
ocr = PaddleOCR(use_angle_cls=True, lang="ch") 

app = FastAPI(title="SkillSync: Universal Training OS")

# Create Static Directory
if not os.path.exists("static_images"):
    os.makedirs("static_images")

# Clean static folder on startup to prevent stale images
for f in os.listdir("static_images"):
    os.remove(os.path.join("static_images", f))

app.mount("/static", StaticFiles(directory="static_images"), name="static")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, 
    allow_methods=["*"], allow_headers=["*"]
)

# ==========================================
# 2. RAG ENGINE (Robust Image Extraction)
# ==========================================
class RAGEngine:
    def __init__(self):
        self.chunks = []      
        self.index = None     
        self.pdf_images = {}  # { page_num: [filename1, filename2] }
    
    def clear(self):
        self.chunks = []
        self.index = None
        self.pdf_images = {}
        # We don't delete files here anymore to avoid 404s during user session
        # We only clean on startup or new upload

    def ingest_pdf(self, pdf_path):
        self.clear()
        doc = fitz.open(pdf_path)
        all_texts = []
        
        print(f"📂 Processing PDF with {len(doc)} pages...")

        for page_num, page in enumerate(doc):
            # --- TASK A: TEXT EXTRACTION ---
            text = page.get_text()
            
            # OCR Fallback
            if len(text) < 50:
                print(f"⚠️ Page {page_num} seems scanned. Engaging OCR...")
                pix = page.get_pixmap()
                img_path = f"temp_ocr_{page_num}.png"
                pix.save(img_path)
                try:
                    result = ocr.ocr(img_path, cls=True)
                    if result and result[0]:
                        text = " ".join([line[1][0] for line in result[0]])
                except: pass
                if os.path.exists(img_path): os.remove(img_path)

            if len(text) > 20:
                self.chunks.append({"text": text, "page": page_num})
                all_texts.append(text)

            # --- TASK B: IMAGE EXTRACTION (CRITICAL) ---
            image_list = page.get_images(full=True)
            if image_list:
                self.pdf_images[page_num] = []
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        ext = base_image["ext"]
                        
                        # Filter: Ignore very small icons, but keep medium diagrams
                        # Lowered threshold to 3KB to catch smaller diagrams
                        if len(image_bytes) < 3072: continue

                        filename = f"p{page_num}_img{img_index}.{ext}"
                        filepath = os.path.join("static_images", filename)
                        
                        with open(filepath, "wb") as f:
                            f.write(image_bytes)
                        
                        self.pdf_images[page_num].append(filename)
                    except Exception as e:
                        print(f"❌ Image extract error on pg {page_num}: {e}")

        # 3. BUILD VECTOR INDEX
        if all_texts:
            embeddings = embedder.encode(all_texts)
            self.index = faiss.IndexFlatL2(embeddings.shape[1])
            self.index.add(np.array(embeddings).astype('float32'))
            
            msg = f"✅ RAG Ready: {len(all_texts)} chunks, Images found on {len(self.pdf_images)} pages."
            print(msg)
            return msg
        return "⚠️ Error: No text extracted."

    def get_random_context(self):
        if not self.chunks: 
            return {"text": "No content available.", "page": 0}
        return random.choice(self.chunks)

rag_engine = RAGEngine()

# ==========================================
# 3. HELPER FUNCTIONS
# ==========================================
def run_agent(role, prompt, context=""):
    try:
        response = erniebot.ChatCompletion.create(
            model="ernie-3.5",
            messages=[
                {"role": "user", "content": f"System: You are {role}. Context: {context}. Task: {prompt}"}
            ]
        )
        return response.get_result()
    except Exception as e: return str(e)

# Function to generate high-quality technical image via Hugging Face
def generate_technical_image(query):
    try:
        # Prompt engineering for schematic look
        enhanced_prompt = f"technical schematic drawing of {query}, blueprint style, white on blue background, high detail, engineering diagram, no text"
        
        image = hf_client.text_to_image(
            prompt=enhanced_prompt,
            model="stabilityai/stable-diffusion-xl-base-1.0"
        )
        
        # Convert to Base64 to send to frontend without saving to disk
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"HF Generation Failed: {e}")
        return None

# --- DATA MODELS ---
class QuizRequest(BaseModel):
    topic: str = "General"
    target_language: str = "English" 

class AnswerRequest(BaseModel):
    question: str
    selected_option: str
    context: str
    target_language: str = "English"

# ==========================================
# 4. API ENDPOINTS
# ==========================================

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    temp = f"temp_{file.filename}"
    with open(temp, "wb") as b: shutil.copyfileobj(file.file, b)
    
    status_message = rag_engine.ingest_pdf(temp) 
    
    if os.path.exists(temp): os.remove(temp)
    return {"status": "success", "info": status_message}

@app.post("/generate_quiz")
async def generate_quiz(req: QuizRequest):
    # 1. Agent A: Context & Text Generation
    context_data = rag_engine.get_random_context()
    text_context = context_data["text"]
    page_num = context_data["page"]
    
    # Multilingual Prompt
    prompt = f"""
    Analyze the text below (Source Material).
    1. Create a relevant multiple-choice training scenario based on the text.
    2. IMPORTANT: The output must be completely translated into {req.target_language}.
    3. Even if the source text is different, your output JSON must be in {req.target_language}.
    
    Output strictly valid JSON (no markdown):
    {{
        "scenario": "Description of the situation (in {req.target_language}).",
        "question": "The specific question (in {req.target_language}).",
        "options": ["Option A (in {req.target_language})", "Option B", "Option C", "Option D"],
        "visual_query": "A precise English description of the object or equipment for a technical diagram."
    }}
    
    Source Text Segment: {text_context[:1500]}...
    """
    
    raw_response = run_agent("Expert Instructor", prompt, text_context)
    clean_json = raw_response.replace("```json", "").replace("```", "").strip()
    
    try:
        quiz_data = json.loads(clean_json)
    except:
        quiz_data = {
            "scenario": f"System Analysis (Translation failed for {req.target_language}).",
            "question": "Select protocol:",
            "options": ["Proceed", "Hold", "Restart", "Abort"],
            "visual_query": "schematic diagram"
        }

    # 2. Agent C (Visual Logic): STRICT PRIORITY -> PDF > HF > Placeholder
    
    # Step A: Check strictly for images on the same page
    real_images = rag_engine.pdf_images.get(page_num, [])
    
    image_url = ""
    image_source = ""
    
    if real_images:
        # ✅ FOUND REAL EVIDENCE
        selected_image = random.choice(real_images)
        image_url = f"http://localhost:8000/static/{selected_image}"
        image_source = f"MANUAL EVIDENCE (PG {page_num + 1})"
    else:
        # ⚠️ NO PDF IMAGE -> GENERATE VIA HUGGING FACE
        print(f"🎨 Generating AI Image for: {quiz_data['visual_query']}")
        generated_b64 = generate_technical_image(quiz_data.get("visual_query", "structure"))
        
        if generated_b64:
            image_url = generated_b64
            image_source = "AI RECONSTRUCTION (Stable Diffusion)"
        else:
            # Last resort fallback if HF fails
            image_url = "https://placehold.co/600x400?text=No+Image+Available"
            image_source = "IMAGE DATA MISSING"

    return {
        "data": quiz_data,
        "context": text_context,
        "image_url": image_url,
        "image_source": image_source
    }

@app.post("/evaluate_answer")
async def evaluate_answer(req: AnswerRequest):
    # 3. Agent B (Auditor)
    prompt = f"""
    Context: {req.context}
    Question: {req.question}
    User Answer: {req.selected_option}
    
    Evaluate correctness based strictly on the context.
    Respond strictly in {req.target_language}.
    
    Output JSON:
    {{
        "is_correct": true/false,
        "feedback": "Explanation (in {req.target_language}).",
        "citation": "Relevant quote from text (keep original language)."
    }}
    """
    raw = run_agent("Compliance Auditor", prompt, req.context)
    try:
        return json.loads(raw.replace("```json", "").replace("```", "").strip())
    except:
        return {"is_correct": False, "feedback": raw, "citation": "Reference Manual"}