"""
EcoTwin AI — Physical Webcam & Virtual Campus Cameras FastAPI Service
Phase 1 Implementation:
- Single physical webcam capture manager
- Four selectable logical cameras mapped to campus buildings
- Safe session switching and attribution isolation
- Truthful connection and AI model availability statuses
"""

import os
import time
import base64
import logging
from typing import Optional, Dict, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import cv2
import numpy as np

from .config import CAMERA_MAPPINGS, EVIDENCE_DIR, settings
from .capture_manager import capture_manager
from .model_adapter import model_adapter
from .event_store import event_store
from .visual_memory import visual_memory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ecotwin.api")

app = FastAPI(
    title="EcoTwin AI — Camera & Vision Intelligence Service",
    description="Physical Webcam Adapter and Virtual Camera Surveillance Service for Campus Decarbonization",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount evidence directory for authenticated static inspection
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=str(EVIDENCE_DIR)), name="evidence")

# Connect capture manager detection callback to event store
def handle_detection(detection, frame):
    logger.info("Persisting verified detection: class=%s, conf=%.2f on %s (%s)",
                detection.class_name, detection.confidence, detection.camera_id, detection.building_id)
    event_store.record_event(
        camera_id=detection.camera_id,
        detected_class=detection.class_name,
        confidence=detection.confidence,
        frame_bgr=frame,
        model_name=model_adapter.model_name,
        model_version=model_adapter.model_version,
        item_name=detection.class_name,
        waste_category=getattr(detection, 'category', 'visible_litter'),
        bbox=detection.bbox,
        polygon=getattr(detection, 'polygon', None),
        notes=f"Confirmed visual memory match for '{detection.class_name}'"
    )

capture_manager.on_detection_callback = handle_detection

# Request / Response Schemas
class SelectCameraRequest(BaseModel):
    camera_id: str = Field(..., description="Target logical camera ID (camera-1, camera-2, camera-3, camera-4)")

class TestDeviceRequest(BaseModel):
    device_index: int = Field(0, description="Physical webcam hardware index to probe")

class ManualDetectionRequest(BaseModel):
    camera_id: str
    detected_class: str
    confidence: float
    item_name: Optional[str] = None
    waste_category: Optional[str] = None

class ReviewEventRequest(BaseModel):
    review_status: str = Field(..., description="verified_waste, false_positive, or resolved")
    notes: Optional[str] = None

start_time = time.time()

ADMIN_UI_FILE = Path(__file__).parent / "admin_ui" / "index.html"

@app.get("/")
@app.get("/admin")
def serve_admin_console():
    """Serves the standalone Camera Admin Panel (Application 1)."""
    if ADMIN_UI_FILE.exists():
        return FileResponse(str(ADMIN_UI_FILE), media_type="text/html")
    return {"message": "EcoTwin AI Camera Service Running. Admin UI file not found."}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ecotwin-camera-service",
        "uptime_seconds": round(time.time() - start_time, 1),
        "webcam_status": capture_manager.webcam_status,
        "active_camera_id": capture_manager.active_camera_id,
        "is_monitoring": capture_manager.is_monitoring
    }

@app.get("/devices")
def list_devices():
    """Discovers available physical webcam capture devices."""
    devices = capture_manager.discover_devices(max_indices=4)
    return {
        "devices": devices,
        "active_index": capture_manager.device_index,
        "count": len(devices)
    }

@app.post("/test-camera")
def test_camera(req: TestDeviceRequest):
    """Tests opening and capturing from a physical webcam index."""
    result = capture_manager.test_device(req.device_index)
    return result

@app.get("/status")
def get_service_status():
    """Returns the operational status of the service, hardware, and all 4 logical camera profiles."""
    return capture_manager.get_status()

@app.post("/select-camera")
def select_camera(req: SelectCameraRequest):
    """
    Selects one of the 4 logical camera profiles.
    Advances session ID to invalidate previous camera frames.
    """
    if req.camera_id not in CAMERA_MAPPINGS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid camera ID '{req.camera_id}'. Supported: {list(CAMERA_MAPPINGS.keys())}"
        )
    result = capture_manager.select_camera(req.camera_id)
    return result

@app.post("/start-monitoring")
def start_monitoring(req: Optional[SelectCameraRequest] = None):
    """Starts the capture and AI monitoring loop for the selected camera."""
    cam_id = req.camera_id if req else None
    result = capture_manager.start_monitoring(cam_id)
    return result

@app.post("/stop-monitoring")
def stop_monitoring():
    """Safely stops monitoring and releases the physical webcam device."""
    result = capture_manager.stop_monitoring()
    return result

@app.get("/latest-frame")
def get_latest_frame():
    """Returns the latest captured JPEG frame."""
    jpeg_bytes, frame_time, cam_id = capture_manager.get_latest_frame()
    if jpeg_bytes is None:
        raise HTTPException(status_code=404, detail="No frame available. Camera is not currently capturing.")
    return Response(content=jpeg_bytes, media_type="image/jpeg")

@app.get("/stream")
def stream_video():
    """MJPEG live stream for direct browser rendering."""
    return StreamingResponse(
        capture_manager.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/events")
def get_events(
    camera_id: Optional[str] = Query(None, description="Filter by logical camera ID"),
    building_id: Optional[str] = Query(None, description="Filter by campus building ID"),
    category: Optional[str] = Query(None, description="Filter by waste category"),
    review_status: Optional[str] = Query(None, description="Filter by review status"),
    limit: int = Query(50, description="Max records to return")
):
    """
    Returns verified detection events filtered strictly by camera, building, category, or review status.
    """
    events = event_store.get_events(
        camera_id=camera_id,
        building_id=building_id,
        category=category,
        review_status=review_status,
        limit=limit
    )
    return {
        "events": events,
        "count": len(events),
        "camera_filter": camera_id or "all",
        "building_filter": building_id or "all",
        "category_filter": category or "all",
        "review_status_filter": review_status or "all"
    }

@app.patch("/events/{event_id}/review")
def update_event_review(event_id: str, req: ReviewEventRequest):
    """
    Updates the review status ('verified_waste', 'false_positive', 'resolved')
    of a camera detection event.
    """
    success = event_store.update_review_status(event_id, req.review_status, req.notes)
    if not success:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found or could not be updated.")
    return {"success": True, "event_id": event_id, "review_status": req.review_status}

@app.post("/events/record-detection")
def record_test_detection(req: ManualDetectionRequest):
    """
    Allows recording a validated detection (useful for demonstration validation).
    Enforces server-side mapping to ensure building attribution matches the registered camera.
    """
    if req.camera_id not in CAMERA_MAPPINGS:
        raise HTTPException(status_code=400, detail=f"Invalid camera ID: {req.camera_id}")

    # Use current webcam frame if available
    frame = capture_manager.latest_frame
    result = event_store.record_event(
        camera_id=req.camera_id,
        detected_class=req.detected_class,
        confidence=req.confidence,
        frame_bgr=frame,
        model_name=model_adapter.model_name,
        model_version=model_adapter.model_version,
        item_name=req.item_name or req.detected_class,
        waste_category=req.waste_category or "visible_litter"
    )
    return result

# -------------------------------------------------------------
# Live Teach-and-Remember Visual Memory Endpoints
# -------------------------------------------------------------

class TeachItemRequest(BaseModel):
    name: str = Field(..., description="Name of the waste item (e.g. plastic_bottle, paper_cup)")
    category: str = Field("plastic_waste", description="Environmental waste category")
    box: List[int] = Field(..., description="[x, y, w, h] bounding box on the frozen frame")
    image_base64: Optional[str] = Field(None, description="Base64 image data URL from canvas")

class RenameItemRequest(BaseModel):
    new_name: str = Field(..., description="New name for the taught item")

@app.get("/freeze-frame")
def freeze_frame():
    """Captures the current clean webcam frame and returns as base64 JPEG for the teaching canvas."""
    import cv2
    frame, cam_id = capture_manager.get_raw_frame()
    if frame is None:
        # Fallback card if webcam inactive
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(frame, "WEBCAM INACTIVE — CLICK START MONITORING", (80, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1, cv2.LINE_AA)

    ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode webcam frame.")

    b64 = base64.b64encode(jpeg.tobytes()).decode('utf-8')
    h, w = frame.shape[:2]
    return {
        "camera_id": cam_id,
        "width": w,
        "height": h,
        "image_data": f"data:image/jpeg;base64,{b64}"
    }

@app.post("/memory/teach")
def teach_item(req: TeachItemRequest):
    """
    Teaches a new visual item or adds another view to an existing item name.
    Crops the object from the provided frame and computes SIFT visual features.
    """
    import cv2
    import numpy as np

    frame = None
    if req.image_base64:
        try:
            b64_str = req.image_base64
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_bytes = base64.b64decode(b64_str)
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    if frame is None:
        frame, _ = capture_manager.get_raw_frame()

    if frame is None:
        raise HTTPException(status_code=400, detail="No active webcam frame available to crop.")

    img_h, img_w = frame.shape[:2]
    x, y, w, h = req.box
    x = max(0, min(int(x), img_w - 1))
    y = max(0, min(int(y), img_h - 1))
    w = max(15, min(int(w), img_w - x))
    h = max(15, min(int(h), img_h - y))

    crop = frame[y:y+h, x:x+w]
    if crop.size == 0 or crop.shape[0] < 15 or crop.shape[1] < 15:
        raise HTTPException(status_code=400, detail="Selected crop area is too small. Please select a larger region.")

    try:
        result = visual_memory.teach_item(
            name=req.name,
            category=req.category,
            crop_bgr=crop,
            box=[x, y, w, h]
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/memory/items")
def list_taught_items():
    """Lists all taught items and their reference sample views."""
    return {
        "items": visual_memory.get_items_summary(),
        "total_items": len(visual_memory.items),
        "total_views": len(visual_memory._feature_cache)
    }

@app.put("/memory/items/{item_id}/rename")
def rename_taught_item(item_id: str, req: RenameItemRequest):
    """Renames an existing taught item."""
    success = visual_memory.rename_item(item_id, req.new_name)
    if not success:
        raise HTTPException(status_code=404, detail="Taught item not found.")
    return {"success": True, "item_id": item_id, "new_name": req.new_name}

@app.delete("/memory/items/{item_id}")
def delete_taught_item(item_id: str):
    """Deletes an item and its saved crop reference images from persistent memory."""
    success = visual_memory.delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Taught item not found.")
    return {"success": True, "deleted_item_id": item_id}

@app.delete("/memory/items/{item_id}/samples/{sample_id}")
def delete_item_sample_view(item_id: str, sample_id: str):
    """Deletes a specific reference view of an item."""
    success = visual_memory.delete_sample(item_id, sample_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sample view or item not found.")
    return {"success": True, "deleted_sample_id": sample_id}

@app.get("/memory/crops/{sample_id}")
def get_sample_crop_image(sample_id: str):
    """Serves the cropped reference image."""
    crop_path = visual_memory.crops_dir / f"crop_{sample_id}.jpg"
    if not crop_path.exists():
        raise HTTPException(status_code=404, detail="Crop reference image not found.")
    return FileResponse(str(crop_path), media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("camera_service.main:app", host=settings.HOST, port=settings.PORT, reload=False)
