import os
import base64
from io import BytesIO
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from ai_service.model_loader import load_spillguard_model

from ai_service.prediction import (
    preprocess_image,
    postprocess_prediction,
    create_overlay,
    calculate_spill_percentage,
    determine_risk_level,
)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
raw_model_path = os.getenv(
    "SPILLGUARD_MODEL_PATH",
    "../AI_SpillGuard_v1_final_CORRECTED.keras",
)
MODEL_PATH = Path(raw_model_path)
if not MODEL_PATH.is_absolute():
    MODEL_PATH = (BASE_DIR / MODEL_PATH).resolve()
MAX_FILE_SIZE = 20 * 1024 * 1024
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if not MODEL_PATH.is_file():
        raise RuntimeError(
            f"Model file not found: {MODEL_PATH}. Set SPILLGUARD_MODEL_PATH in ai_service/.env."
        )
    print(f"Loading model from {MODEL_PATH}")
    loaded_model, success = load_spillguard_model(str(MODEL_PATH))
    if not success or loaded_model is None:
        raise RuntimeError("Model loading failed. See the preceding TensorFlow error.")
    model = loaded_model
    print("AI SpillGuard model is ready.")
    yield
    model = None

app = FastAPI(
    title="AI SpillGuard API",
    description="Local image segmentation API for AI SpillGuard.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

def to_base64(image_array, mode="RGB"):
    if image_array.ndim == 2:
        image = Image.fromarray(image_array)
    else:
        image = Image.fromarray(image_array.astype(np.uint8), mode=mode)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")

@app.get("/")
def root():
    return {"message": "AI SpillGuard API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/api/detect")
async def detect(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=400, detail="Upload a JPG, JPEG, or PNG image")
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Image exceeds the 20 MB limit")
        try:
            with Image.open(BytesIO(contents)) as im:
                im.verify()
            with Image.open(BytesIO(contents)) as im:
                original_rgb = np.asarray(im.convert("RGB"))
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(status_code=400, detail="File is not a valid image")

        batch, resized = preprocess_image(original_rgb, target_size=256)
        prediction = model.predict(batch, verbose=0)
        probability_map, mask = postprocess_prediction(prediction, threshold=0.5)
        spill_percentage = calculate_spill_percentage(mask)
        risk_message, risk_level = determine_risk_level(spill_percentage)
        overlay = create_overlay(resized, mask, alpha=0.5)
        probability_u8 = np.clip(probability_map * 255, 0, 255).astype(np.uint8)
        mask_u8 = (mask * 255).astype(np.uint8)

        return {
            "success": True,
            "filename": Path(file.filename or "upload.png").name,
            "spill_percentage": round(float(spill_percentage), 2),
            "risk_message": risk_message,
            "risk_level": risk_level,
            "images": {
                "original": to_base64(resized),
                "probability_map": to_base64(probability_u8),
                "mask": to_base64(mask_u8),
                "overlay": to_base64(overlay),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Detection error: {exc}")
        raise HTTPException(status_code=500, detail="Image prediction failed. Check the API terminal.")
    finally:
        await file.close()
