# FROM python:3.10

# # Prevent interactive prompts
# ENV DEBIAN_FRONTEND=noninteractive

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     libgl1 \
#     libglib2.0-0 \
#     libgomp1 \
#     libx11-6 \
#     libxext6 \
#     libxrender1 \
#     ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# COPY requirements.txt .
# RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# COPY . .

# # Pre-download PaddleOCR models
# RUN python - <<EOF
# from paddleocr import PaddleOCR
# PaddleOCR(use_angle_cls=False, lang='en')
# EOF

# CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]


# Use the "slim" version to keep the image small for Render Free Tier
FROM python:3.10-slim

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install only essential system dependencies for Image/PDF processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

# REMOVED: PaddleOCR model download block (Not needed for Lite mode)

# Start the application
# Note: Render provides the PORT env var automatically (usually 10000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]