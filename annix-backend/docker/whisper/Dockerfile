FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    faster-whisper==1.0.3 \
    fastapi==0.109.2 \
    uvicorn==0.27.1 \
    python-multipart==0.0.9

COPY whisper_server.py .

EXPOSE 8000

CMD ["uvicorn", "whisper_server:app", "--host", "0.0.0.0", "--port", "8000"]
