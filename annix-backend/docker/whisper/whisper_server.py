import os
import tempfile
import time
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel

app = FastAPI(title="Whisper Transcription API", version="1.0.0")

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

model: Optional[WhisperModel] = None


class TranscriptSegment(BaseModel):
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None


class TranscriptionResult(BaseModel):
    text: str
    segments: List[TranscriptSegment]
    language: str
    language_probability: float
    duration: float
    processing_time_ms: int
    model: str


@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} with {COMPUTE_TYPE}")
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    print("Model loaded successfully")


@app.get("/health")
async def health():
    return {"status": "healthy", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/transcribe", response_model=TranscriptionResult)
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    initial_prompt: Optional[str] = Form(None),
    word_timestamps: bool = Form(False),
):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac", ".mp4"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed: {allowed_extensions}"
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        start_time = time.time()

        segments_iter, info = model.transcribe(
            tmp_path,
            language=language,
            initial_prompt=initial_prompt,
            word_timestamps=word_timestamps,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )

        segments = []
        full_text_parts = []

        for segment in segments_iter:
            segments.append(
                TranscriptSegment(
                    start_time=segment.start,
                    end_time=segment.end,
                    text=segment.text.strip(),
                    confidence=segment.avg_logprob if hasattr(segment, "avg_logprob") else None,
                )
            )
            full_text_parts.append(segment.text.strip())

        processing_time_ms = int((time.time() - start_time) * 1000)

        return TranscriptionResult(
            text=" ".join(full_text_parts),
            segments=segments,
            language=info.language,
            language_probability=info.language_probability,
            duration=info.duration,
            processing_time_ms=processing_time_ms,
            model=MODEL_SIZE,
        )

    finally:
        os.unlink(tmp_path)


@app.post("/transcribe/url")
async def transcribe_from_url(
    url: str = Form(...),
    language: Optional[str] = Form(None),
    initial_prompt: Optional[str] = Form(None),
):
    raise HTTPException(status_code=501, detail="URL transcription not implemented")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
