
# ==========================================
# PRODUCTION READY CODE UNCOMMENT FOR DEPLOYMENT
# ==========================================



# import os
# import shutil
# import logging
# import random
# import json
# import base64
# import io
# import re
# import fitz  # PyMuPDF
# import numpy as np
# from PIL import Image

# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from pydantic import BaseModel
# from dotenv import load_dotenv

# # --- CAMEL-AI IMPORTS ---
# from camel.agents import ChatAgent
# from camel.messages import BaseMessage
# from camel.types import RoleType

# # --- UTILITY IMPORTS ---
# import erniebot
# from paddleocr import PaddleOCR
# from huggingface_hub import InferenceClient

# # ==========================================
# # 0. LOGGING & SETUP
# # ==========================================
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(message)s",
#     datefmt="%H:%M:%S"
# )
# logger = logging.getLogger("SkillSync")

# LAST_USED_LANGUAGE = "English" 

# load_dotenv()

# # --- CAMEL CONFIGURATION FIX ---
# # CAMEL requires an OpenAI key by default to start. We provide a dummy key
# # because we are routing traffic to Baidu Ernie manually via the Bridge.
# os.environ["OPENAI_API_KEY"] = "fake-key-bypass-for-camel-compliance"

# AI_STUDIO_TOKEN = os.getenv("AI_STUDIO_TOKEN")
# HF_TOKEN = os.getenv("HF_TOKEN")

# if not AI_STUDIO_TOKEN or not HF_TOKEN:
#     raise RuntimeError("⚠️ MISSING API TOKENS. Please check your .env file.")

# erniebot.api_type = "aistudio"
# erniebot.access_token = AI_STUDIO_TOKEN
# hf_client = InferenceClient(token=HF_TOKEN)

# app = FastAPI(title="SkillSync CAMEL Core")
# STATIC_DIR = "static_images"
# os.makedirs(STATIC_DIR, exist_ok=True)

# # Clean static folder
# for f in os.listdir(STATIC_DIR):
#     os.remove(os.path.join(STATIC_DIR, f))

# app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ==========================================
# # 1. AGENT 1: VISUAL PERCEPTION AGENT (PADDLE OCR)
# # ==========================================
# # Role: The "Eyes" of the system. Reads raw PDFs and Images.
# # Logic: Uses PaddleOCR and PyMuPDF to extract text and rip images.
# # ------------------------------------------------------------------
# logging.getLogger("ppocr").setLevel(logging.ERROR)
# ocr = PaddleOCR(use_angle_cls=True, lang="ch") 

# # ==========================================
# # 2. CAMEL BRIDGE (CONNECTION TO ERNIE)
# # ==========================================
# class ErnieCamelBackend:
#     """
#     Acts as the 'Brain' for the CAMEL Agents, routing thoughts to Baidu Ernie.
#     """
#     def __init__(self, model_name="ernie-3.5"):
#         self.model_name = model_name

#     def run(self, messages: list[BaseMessage]) -> str:
#         ernie_messages = []
#         system_content = ""

#         # Convert CAMEL messages to ERNIE format
#         for msg in messages:
#             if msg.role_name == "Assistant":
#                 ernie_messages.append({"role": "assistant", "content": msg.content})
#             elif msg.role_name == "User":
#                 ernie_messages.append({"role": "user", "content": msg.content})
#             elif msg.role_name == "System": 
#                 system_content += f"SYSTEM INSTRUCTION: {msg.content}\n\n"

#         # Inject System Prompt
#         if system_content and ernie_messages:
#             for m in ernie_messages:
#                 if m['role'] == 'user':
#                     m['content'] = system_content + "TASK:\n" + m['content']
#                     break
        
#         try:
#             response = erniebot.ChatCompletion.create(
#                 model=self.model_name,
#                 messages=ernie_messages,
#             )
#             return response.get_result()
#         except Exception as e:
#             logger.error(f"Ernie Bridge Error: {e}")
#             return '{"error": "Agent connection failed"}'

# def create_camel_agent(system_role: str):
#     """Factory to create a CAMEL agent with the Ernie Brain."""
#     sys_msg = BaseMessage.make_assistant_message(
#         role_name="Assistant",
#         content=system_role
#     )
#     # We pass model=None to bypass OpenAI connection, and return our custom backend
#     agent = ChatAgent(system_message=sys_msg, model=None)
#     backend = ErnieCamelBackend(model_name="ernie-3.5")
#     return agent, backend

# # ==========================================
# # 3. RAG LOGIC (EXISTING LOGIC)
# # ==========================================
# def clean_text_for_json(text: str):
#     if not text: return ""
#     text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
#     return text.replace('\\', '\\\\')

# def extract_json_from_ai_response(raw_text: str):
#     try:
#         match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
#         if match:
#             return json.loads(match.group(1))
#         return json.loads(raw_text)
#     except:
#         return None

# class RAGEngine:
#     def __init__(self):
#         self.chunks = []
#         self.pdf_images = {}

#     def ingest_pdf(self, path):
#         self.chunks = []
#         self.pdf_images = {}
#         try:
#             doc = fitz.open(path)
#         except Exception as e:
#             return f"Error: {e}"

#         logger.info(f"📂 [AGENT 1: VISUAL] Scanning {len(doc)} pages...")

#         for pg_num, page in enumerate(doc):
#             txt = page.get_text()
            
#             # OCR Fallback
#             if len(txt) < 50:
#                 pix = page.get_pixmap()
#                 img_path = f"temp_ocr_{pg_num}.png"
#                 pix.save(img_path)
#                 try:
#                     res = ocr.ocr(img_path, cls=True)
#                     if res and res[0]: 
#                         txt = " ".join([line[1][0] for line in res[0]])
#                 except: pass
#                 finally:
#                     if os.path.exists(img_path): os.remove(img_path)
            
#             if txt.strip():
#                 self.chunks.append({
#                     "text": clean_text_for_json(txt.replace("\n", " ").strip()), 
#                     "page": pg_num
#                 })

#             # Image Rip
#             for img_idx, img in enumerate(page.get_images(full=True)):
#                 try:
#                     xref = img[0]
#                     base = doc.extract_image(xref)
#                     if len(base["image"]) < 5120: continue
#                     fname = f"p{pg_num}_{img_idx}.{base['ext']}"
#                     full_path = os.path.join(STATIC_DIR, fname)
#                     with open(full_path, "wb") as f: f.write(base["image"])
                    
#                     if pg_num not in self.pdf_images: self.pdf_images[pg_num] = []
#                     self.pdf_images[pg_num].append(fname)
#                 except: pass

#         return f"✅ Visual Agent Indexed {len(self.chunks)} chunks."

# rag = RAGEngine()

# # ==========================================
# # 4. API & AGENT WORKFLOWS
# # ==========================================

# class QuizRequest(BaseModel):
#     topic: str = "General"
#     target_language: str = "English"

# class EvaluateRequest(BaseModel):
#     question: str
#     selected_option: str
#     context: str
#     target_language: str = "English"

# @app.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     temp_path = f"temp_{file.filename}"
#     try:
#         with open(temp_path, "wb") as f:
#             shutil.copyfileobj(file.file, f)
#         return {"status": "success", "info": rag.ingest_pdf(temp_path)}
#     finally:
#         if os.path.exists(temp_path): os.remove(temp_path)

# @app.post("/generate_quiz")
# async def generate_quiz(req: QuizRequest):
#     global LAST_USED_LANGUAGE
#     if req.target_language != LAST_USED_LANGUAGE:
#         logger.info(f"🌐 Switching Lang: {LAST_USED_LANGUAGE} -> {req.target_language}")
#         LAST_USED_LANGUAGE = req.target_language

#     # Context Selection
#     if not rag.chunks:
#         context_text = "Standard safety protocols for industrial machinery."
#         page_num = 0
#     else:
#         ctx = random.choice(rag.chunks)
#         context_text = ctx['text']
#         page_num = ctx['page']

#     # ==========================================
#     # AGENT 2: INSTRUCTIONAL ARCHITECT AGENT
#     # ==========================================
#     # Role: "The Teacher". Creates scenarios and quizzes.
#     # Logic: Uses CAMEL to prompt Ernie for JSON quiz data.
#     # ---------------------------------------------------------
#     logger.info("🧠 [AGENT 2: INSTRUCTOR] Designing Scenario...")
    
#     instructor_agent, backend = create_camel_agent(
#         "You are an Expert Technical Instructor. You output strictly valid JSON."
#     )
    
#     prompt_content = f"""
#     TASK: Create a technical scenario based on source material.
#     TARGET LANGUAGE: {req.target_language}
    
#     OUTPUT JSON FORMAT:
#     {{
#         "scenario": "Scenario description in {req.target_language}...",
#         "question": "Question in {req.target_language}...",
#         "options": ["Option A", "Option B", "Option C", "Option D"],
#         "visual_query": "3 keywords in ENGLISH for a diagram"
#     }}

#     SOURCE MATERIAL:
#     {context_text[:2000]}
#     """
    
#     # CAMEL Message Construction
#     messages = [
#         instructor_agent.system_message,
#         BaseMessage.make_user_message(role_name="User", content=prompt_content)
#     ]
    
#     # Execute Agent Thinking
#     raw_response = backend.run(messages)
#     quiz_data = extract_json_from_ai_response(raw_response)

#     # Fallback if Agent fails
#     if not quiz_data:
#         quiz_data = {
#             "scenario": "Error generating scenario.",
#             "question": "Please retry.",
#             "options": ["Retry"],
#             "visual_query": "error"
#         }

#     # ==========================================
#     # AGENT 4: GENERATIVE ARTIST AGENT (SDXL)
#     # ==========================================
#     # Role: "The Artist". Creates visuals if no real evidence exists.
#     # Logic: Uses HuggingFace Inference Client.
#     # ---------------------------------------------------------
#     image_url = ""
#     image_source = ""
    
#     # Check Visual Agent's cache first (Real Evidence)
#     real_images = rag.pdf_images.get(page_num, [])
    
#     if real_images:
#         logger.info("👁️ [AGENT 1] Retrieving specific evidence from PDF.")
#         selected_img = random.choice(real_images)
#         image_url = f"http://localhost:8000/static/{selected_img}"
#         image_source = f"MANUAL EVIDENCE (PG {page_num + 1})"
#     else:
#         logger.info("🎨 [AGENT 4: ARTIST] Generating synthetic diagram...")
#         visual_query = quiz_data.get("visual_query", "schematic diagram")
#         try:
#             hf_prompt = f"technical schematic of {visual_query}, blueprint style, white on blue, high detail"
#             image = hf_client.text_to_image(prompt=hf_prompt, model="stabilityai/stable-diffusion-xl-base-1.0")
            
#             buf = io.BytesIO()
#             image.save(buf, format="PNG")
#             b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")
#             image_url = f"data:image/png;base64,{b64_img}"
#             image_source = "AI RECONSTRUCTION (SDXL)"
#         except Exception as e:
#             image_url = "https://placehold.co/600x400?text=No+Image"
#             image_source = "IMAGE UNAVAILABLE"

#     return {
#         "data": quiz_data,
#         "context": context_text,
#         "image_url": image_url,
#         "image_source": image_source
#     }

# @app.post("/evaluate_answer")
# async def evaluate_answer(req: EvaluateRequest):
#     # ==========================================
#     # AGENT 3: COMPLIANCE AUDITOR AGENT
#     # ==========================================
#     # Role: "The Judge". Verifies answers against the text.
#     # Logic: Strict evaluation using CAMEL + Ernie.
#     # ---------------------------------------------------------
#     logger.info("⚖️ [AGENT 3: AUDITOR] Verifying compliance...")
    
#     auditor_agent, backend = create_camel_agent(
#         "You are a Strict Compliance Auditor. Verify actions against text."
#     )
    
#     prompt_content = f"""
#     CONTEXT: {req.context}
#     QUESTION: {req.question}
#     USER ANSWER: {req.selected_option}
    
#     TASK:
#     1. Evaluate correctness based strictly on context.
#     2. Provide feedback in {req.target_language}.
    
#     OUTPUT JSON:
#     {{
#         "is_correct": true/false,
#         "feedback": "Explanation in {req.target_language}...",
#         "citation": "Quote from text..."
#     }}
#     """
    
#     messages = [
#         auditor_agent.system_message,
#         BaseMessage.make_user_message(role_name="User", content=prompt_content)
#     ]
    
#     raw_response = backend.run(messages)
#     result = extract_json_from_ai_response(raw_response)
    
#     if not result:
#         return {"is_correct": False, "feedback": "Auditor Error", "citation": "N/A"}
        
#     return result

# if __name__ == "__main__":
#     import uvicorn
#     logger.info("🚀 SkillSync CAMEL-Powered Core Starting...")
#     uvicorn.run(app, host="0.0.0.0", port=8000)


import os
import shutil
import logging
import random
import json
import base64
import io
import re
import fitz  # PyMuPDF
import numpy as np
from PIL import Image

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# --- CAMEL-AI IMPORTS ---
from camel.agents import ChatAgent
from camel.messages import BaseMessage
from camel.types import RoleType

# --- UTILITY IMPORTS ---
import erniebot
# from paddleocr import PaddleOCR  <-- REMOVED FOR LITE VERSION
from huggingface_hub import InferenceClient

# ==========================================
# 0. LOGGING & SETUP
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("SkillSync")

LAST_USED_LANGUAGE = "English" 

load_dotenv()

# --- CAMEL CONFIGURATION FIX ---
# CAMEL requires an OpenAI key by default. We use a dummy key to bypass this check
# since we are manually routing to Baidu ERNIE.
os.environ["OPENAI_API_KEY"] = "fake-key-bypass-for-camel-compliance"

AI_STUDIO_TOKEN = os.getenv("AI_STUDIO_TOKEN")
HF_TOKEN = os.getenv("HF_TOKEN")

# Simple check to ensure keys exist (prevents crash on startup if missing)
if not AI_STUDIO_TOKEN:
    logger.warning("⚠️ AI_STUDIO_TOKEN is missing. ERNIE features will fail.")
if not HF_TOKEN:
    logger.warning("⚠️ HF_TOKEN is missing. Image generation will fail.")

erniebot.api_type = "aistudio"
erniebot.access_token = AI_STUDIO_TOKEN
hf_client = InferenceClient(token=HF_TOKEN)

app = FastAPI(title="SkillSync CAMEL Core (Lite)")
STATIC_DIR = "static_images"
os.makedirs(STATIC_DIR, exist_ok=True)

# Clean static folder
for f in os.listdir(STATIC_DIR):
    try:
        os.remove(os.path.join(STATIC_DIR, f))
    except: pass

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. AGENT 1: VISUAL PERCEPTION AGENT (LITE)
# ==========================================
# Role: Reads PDFs using lightweight extraction.
# Note: PaddleOCR is removed to save memory.
# ------------------------------------------------------------------
# ocr = PaddleOCR(...) <-- REMOVED

# ==========================================
# 2. CAMEL BRIDGE (CONNECTION TO ERNIE)
# ==========================================
class ErnieCamelBackend:
    """
    Acts as the 'Brain' for the CAMEL Agents, routing thoughts to Baidu Ernie.
    """
    def __init__(self, model_name="ernie-3.5"):
        self.model_name = model_name

    def run(self, messages: list[BaseMessage]) -> str:
        ernie_messages = []
        system_content = ""

        # Convert CAMEL messages to ERNIE format
        for msg in messages:
            if msg.role_name == "Assistant":
                ernie_messages.append({"role": "assistant", "content": msg.content})
            elif msg.role_name == "User":
                ernie_messages.append({"role": "user", "content": msg.content})
            elif msg.role_name == "System": 
                system_content += f"SYSTEM INSTRUCTION: {msg.content}\n\n"

        # Inject System Prompt into the first user message
        if system_content and ernie_messages:
            for m in ernie_messages:
                if m['role'] == 'user':
                    m['content'] = system_content + "TASK:\n" + m['content']
                    break
        
        try:
            response = erniebot.ChatCompletion.create(
                model=self.model_name,
                messages=ernie_messages,
            )
            return response.get_result()
        except Exception as e:
            logger.error(f"Ernie Bridge Error: {e}")
            return '{"error": "Agent connection failed"}'

def create_camel_agent(system_role: str):
    """Factory to create a CAMEL agent with the Ernie Brain."""
    sys_msg = BaseMessage.make_assistant_message(
        role_name="Assistant",
        content=system_role
    )
    # Pass model=None to bypass OpenAI connection
    agent = ChatAgent(system_message=sys_msg, model=None)
    backend = ErnieCamelBackend(model_name="ernie-3.5")
    return agent, backend

# ==========================================
# 3. RAG LOGIC (LITE VERSION)
# ==========================================
def clean_text_for_json(text: str):
    if not text: return ""
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    return text.replace('\\', '\\\\')

def extract_json_from_ai_response(raw_text: str):
    try:
        match = re.search(r'(\{.*\})', raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        return json.loads(raw_text)
    except:
        return None

class RAGEngine:
    def __init__(self):
        self.chunks = []
        self.pdf_images = {}

    def ingest_pdf(self, path):
        self.chunks = []
        self.pdf_images = {}
        try:
            doc = fitz.open(path)
        except Exception as e:
            return f"Error: {e}"

        logger.info(f"📂 [AGENT 1: VISUAL LITE] Scanning {len(doc)} pages...")

        for pg_num, page in enumerate(doc):
            # 1. TEXT EXTRACTION (Standard)
            txt = page.get_text()
            
            # Note: Heavy OCR fallback removed for Lite version.
            # If pdf is an image scan, txt will be empty.
            
            if txt.strip():
                self.chunks.append({
                    "text": clean_text_for_json(txt.replace("\n", " ").strip()), 
                    "page": pg_num
                })

            # 2. IMAGE RIP (Works fine in Lite)
            for img_idx, img in enumerate(page.get_images(full=True)):
                try:
                    xref = img[0]
                    base = doc.extract_image(xref)
                    if len(base["image"]) < 5120: continue
                    fname = f"p{pg_num}_{img_idx}.{base['ext']}"
                    full_path = os.path.join(STATIC_DIR, fname)
                    with open(full_path, "wb") as f: f.write(base["image"])
                    
                    if pg_num not in self.pdf_images: self.pdf_images[pg_num] = []
                    self.pdf_images[pg_num].append(fname)
                except: pass

        return f"✅ Visual Agent (Lite) Indexed {len(self.chunks)} chunks."

rag = RAGEngine()

# ==========================================
# 4. API & AGENT WORKFLOWS
# ==========================================

class QuizRequest(BaseModel):
    topic: str = "General"
    target_language: str = "English"

class EvaluateRequest(BaseModel):
    question: str
    selected_option: str
    context: str
    target_language: str = "English"

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"status": "success", "info": rag.ingest_pdf(temp_path)}
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@app.post("/generate_quiz")
async def generate_quiz(req: QuizRequest):
    global LAST_USED_LANGUAGE
    if req.target_language != LAST_USED_LANGUAGE:
        logger.info(f"🌐 Switching Lang: {LAST_USED_LANGUAGE} -> {req.target_language}")
        LAST_USED_LANGUAGE = req.target_language

    # Context Selection
    if not rag.chunks:
        context_text = "Standard safety protocols for industrial machinery."
        page_num = 0
    else:
        ctx = random.choice(rag.chunks)
        context_text = ctx['text']
        page_num = ctx['page']

    # ==========================================
    # AGENT 2: INSTRUCTIONAL ARCHITECT AGENT
    # ==========================================
    logger.info("🧠 [AGENT 2: INSTRUCTOR] Designing Scenario...")
    
    instructor_agent, backend = create_camel_agent(
        "You are an Expert Technical Instructor. You output strictly valid JSON."
    )
    
    prompt_content = f"""
    TASK: Create a technical scenario based on source material.
    TARGET LANGUAGE: {req.target_language}
    
    OUTPUT JSON FORMAT:
    {{
        "scenario": "Scenario description in {req.target_language}...",
        "question": "Question in {req.target_language}...",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "visual_query": "3 keywords in ENGLISH for a diagram"
    }}

    SOURCE MATERIAL:
    {context_text[:2000]}
    """
    
    messages = [
        instructor_agent.system_message,
        BaseMessage.make_user_message(role_name="User", content=prompt_content)
    ]
    
    raw_response = backend.run(messages)
    quiz_data = extract_json_from_ai_response(raw_response)

    if not quiz_data:
        quiz_data = {
            "scenario": "Error generating scenario.",
            "question": "Please retry.",
            "options": ["Retry"],
            "visual_query": "error"
        }

    # ==========================================
    # AGENT 4: GENERATIVE ARTIST AGENT
    # ==========================================
    image_url = ""
    image_source = ""
    
    real_images = rag.pdf_images.get(page_num, [])
    
    # NOTE: IMPORTANT FIX FOR DEPLOYMENT URL
    # Replace 'localhost' with your Render URL if needed, or keep relative.
    # We use relative /static/ path for simplicity in the API response.
    
    if real_images:
        logger.info("👁️ [AGENT 1] Retrieving specific evidence from PDF.")
        selected_img = random.choice(real_images)
        # Use full URL if deployed, or just path if frontend handles it
        # Assuming your frontend appends BACKEND_URL, sending just the path is safer:
        image_url = f"/static/{selected_img}" 
        image_source = f"MANUAL EVIDENCE (PG {page_num + 1})"
    else:
        logger.info("🎨 [AGENT 4: ARTIST] Generating synthetic diagram...")
        visual_query = quiz_data.get("visual_query", "schematic diagram")
        try:
            hf_prompt = f"technical schematic of {visual_query}, blueprint style, white on blue, high detail"
            image = hf_client.text_to_image(prompt=hf_prompt, model="stabilityai/stable-diffusion-xl-base-1.0")
            
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")
            image_url = f"data:image/png;base64,{b64_img}"
            image_source = "AI RECONSTRUCTION (SDXL)"
        except Exception as e:
            image_url = "https://placehold.co/600x400?text=No+Image"
            image_source = "IMAGE UNAVAILABLE"

    # If the image_url is a local path (starts with /static), prepend the Render URL in production
    # But for now, we return it as is, and the frontend should handle the base URL.
    # To be safe for your specific frontend, let's include the full path based on request if possible,
    # or just assume the frontend will attach its BACKEND_URL variable to the path.

    return {
        "data": quiz_data,
        "context": context_text,
        "image_url": image_url,
        "image_source": image_source
    }

@app.post("/evaluate_answer")
async def evaluate_answer(req: EvaluateRequest):
    # ==========================================
    # AGENT 3: COMPLIANCE AUDITOR AGENT
    # ==========================================
    logger.info("⚖️ [AGENT 3: AUDITOR] Verifying compliance...")
    
    auditor_agent, backend = create_camel_agent(
        "You are a Strict Compliance Auditor. Verify actions against text."
    )
    
    prompt_content = f"""
    CONTEXT: {req.context}
    QUESTION: {req.question}
    USER ANSWER: {req.selected_option}
    
    TASK:
    1. Evaluate correctness based strictly on context.
    2. Provide feedback in {req.target_language}.
    
    OUTPUT JSON:
    {{
        "is_correct": true/false,
        "feedback": "Explanation in {req.target_language}...",
        "citation": "Quote from text..."
    }}
    """
    
    messages = [
        auditor_agent.system_message,
        BaseMessage.make_user_message(role_name="User", content=prompt_content)
    ]
    
    raw_response = backend.run(messages)
    result = extract_json_from_ai_response(raw_response)
    
    if not result:
        return {"is_correct": False, "feedback": "Auditor Error", "citation": "N/A"}
        
    return result

if __name__ == "__main__":
    import uvicorn
    # Use port 10000 for Render
    port = int(os.environ.get("PORT", 10000))
    logger.info(f"🚀 SkillSync LITE Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)