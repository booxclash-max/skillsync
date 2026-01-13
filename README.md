# 🧠 SkillSync  
### Autonomous Multi-Agent Training Platform  

**Transforming static technical manuals into interactive, multimodal, and audit-ready simulations.**

SkillSync is an intelligent orchestration engine that uses a swarm of specialized AI agents to autonomously convert dense technical documentation (PDFs) into immersive role-play training scenarios. It bridges the gap between theory and practice by combining **Computer Vision**, **Multimodal Reasoning**, and **Multi-Agent Debate** to ensure accuracy, compliance, and real-world applicability.

---

## 🚀 Live Demo  

👉 **Try the Lite Version Here**  
*(Live deployment running in **Lite Mode** for high availability during judging)*

> ⚠️ Note: The live demo focuses on **Agentic Logic (CAMEL + ERNIE)** rather than deep OCR, to remain stable on free-tier infrastructure.

---

## ✨ Key Features  

### 🤖 1. Autonomous Agent Swarm (CAMEL-AI)  
Unlike standard chatbots, SkillSync orchestrates **multiple specialized agents** that collaborate to build and validate training content:

- **Visual Perception Agent**  
  Scans documents for text, diagrams, charts, and blueprints using **PaddleOCR**.

- **Instructional Architect Agent**  
  Designs the training scenario, learning flow, and role-play logic using **ERNIE 4.0**.

- **Compliance Auditor Agent**  
  A strict, adversarial agent that validates every user answer **directly against the source document**, preventing hallucinations and ensuring regulatory accuracy.

---

### 👁️ 2. Multimodal Document Intelligence  
SkillSync doesn’t just read text.

Powered by **PaddleOCR** and **ERNIE Vision**, it:
- Extracts spatial and visual information from diagrams
- Identifies components (e.g., valves in schematics, organelles in biology diagrams)
- Generates **visual-centric, context-aware questions**

This enables training grounded in *what learners actually see in the real world*.

---

### 🌍 3. The “Babel Fish” Engine  
Instantly retrain global teams.

Upload a manual in English and generate **technically accurate simulations** in:
- Spanish
- Mandarin
- Bemba (and more)

Powered by **ERNIE’s cross-lingual reasoning**, not simple translation.

---

## 🏗️ Architecture  

SkillSync follows a **cloud-native, agentic architecture**:

| Component        | Technology        | Role |
|------------------|------------------|------|
| Orchestration    | CAMEL-AI         | Manages agent collaboration and debate |
| Cognitive Core   | ERNIE-4.0        | Multimodal reasoning and pedagogy |
| Vision Driver    | PaddleOCR        | OCR + layout & diagram extraction |
| Backend API      | FastAPI          | High-performance Python gateway |
| Frontend         | React + Vite     | Immersive cyberpunk-style UI |

---

## 🧠 Agent Workflow  

```mermaid
graph TD
    PDF[User Uploads PDF] --> Vision[Visual Perception Agent]
    Vision -->|Extracts Text & Diagrams| Context[Context Vector]

    Context --> Architect[Instructional Architect Agent]
    Architect -->|Generates Scenario| UserUI[User Interface]

    UserUI -->|Submits Answer| Auditor[Compliance Auditor Agent]
    Auditor -->|Verifies Against PDF| Feedback[Strict Feedback]
    Feedback --> UserUI
⚠️ Deployment Note: Enterprise vs Lite Mode
To balance capability and stability during judging, SkillSync supports two modes:

🟢 Production Mode (Full Capability – Seen in Video Demo)
Driver: PaddleOCR (Deep Learning) + PaddlePaddle-GPU

Features:

Full layout analysis

Diagram understanding

OCR for scanned documents

Requirements:

4GB+ RAM

CUDA-capable GPU

🟡 Live Demo Mode (Render Deployment)
Driver: PyMuPDF (Lightweight)

Features:

Standard text extraction

Image ripping

Why:
Ensures stability on 512MB RAM containers during live judging

ℹ️ The live demo highlights agent orchestration and reasoning, not deep OCR.

🛠️ Local Installation (Full Production Mode)
1️⃣ Clone & Setup Backend
bash
Copy code
git clone https://github.com/happi-web/SkillSync.git
cd SkillSync/backend

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install FULL requirements
pip install -r requirements-full.txt
Includes: paddlepaddle, paddleocr, camel-ai, fastapi

2️⃣ Configure Tokens
Create a .env file in /backend:

env
Copy code
AI_STUDIO_TOKEN="your_baidu_ernie_token"
HF_TOKEN="your_huggingface_token"
3️⃣ Run the Agent Swarm
bash
Copy code
python main.py
Server will start at:
👉 http://localhost:8000

🏆 Hackathon Tracks
SkillSync is submitted for:

🏅 Best Agent System (CAMEL-AI)
Multi-agent Architect vs Auditor debate architecture

🏅 Best ERNIE Multimodal Application
Deep integration of Text (ERNIE) + Vision (PaddleOCR) for real-world training

👤 Author
Chilongo Kondwani
Founder & Engineer

Developed for the Baidu ERNIE AI Developer Challenge

📜 License
MIT License

yaml
Copy code

---

If you want next:
- 🔥 **Shortened judge-friendly README (1-page)**
- 🎥 **README aligned to a demo video**
- 🧪 **API section + example requests**
- 🏆 **“Why we should win” section for judges**

Just say the word.