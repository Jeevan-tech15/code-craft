"""
EcoTwin AI — Camera Service Configuration
"""

import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Load .env.local first, then fallback to .env
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")
load_dotenv()

# Fixed Camera to Building mappings required by Hackathon specification
CAMERA_MAPPINGS = {
    "camera-1": {
        "id": "camera-1",
        "name": "Camera 1 — Engineering Block",
        "building_id": "engineering",
        "building_name": "Engineering Block",
        "zone": "North Rooftop & Prototyping Lab",
        "default_physical_device": 0,
    },
    "camera-2": {
        "id": "camera-2",
        "name": "Camera 2 — Central Library",
        "building_id": "library",
        "building_name": "Central Library",
        "zone": "Basement Hydronic Loop & Restrooms",
        "default_physical_device": 0,
    },
    "camera-3": {
        "id": "camera-3",
        "name": "Camera 3 — Advanced Science Laboratory",
        "building_id": "laboratory",
        "building_name": "Advanced Science Laboratory",
        "zone": "West Wet Lab & Cleanroom Sector",
        "default_physical_device": 0,
    },
    "camera-4": {
        "id": "camera-4",
        "name": "Camera 4 — Campus Dining Commons",
        "building_id": "cafeteria",
        "building_name": "Campus Dining Commons",
        "zone": "South Kitchen & Bio-Digester Hub",
        "default_physical_device": 0,
    },
}

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EVIDENCE_DIR = BASE_DIR / "evidence"
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    HOST: str = os.getenv("CAMERA_SERVICE_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("CAMERA_SERVICE_PORT", "8000"))
    CAMERA_INDEX: int = int(os.getenv("PHYSICAL_CAMERA_INDEX", "0"))
    MODEL_PATH: str = os.getenv("VISION_MODEL_PATH", str(MODELS_DIR / "environmental_model.pt"))
    CONFIDENCE_THRESHOLD: float = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.65"))
    COOLDOWN_SECONDS: int = int(os.getenv("EVENT_COOLDOWN_SECONDS", "20"))
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

settings = Settings()

