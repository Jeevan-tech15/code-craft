"""
EcoTwin AI — Environmental AI Model Adapter
Strictly adheres to Phase 1 requirement:
"If no suitable trained model is installed, display MODEL UNAVAILABLE. 
The system may show an actual webcam preview, but it must not generate 
environmental detections without a real inference result. 
Never hardcode successful detections, confidence percentages or timestamps."
"""

import os
import time
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict

import cv2
import numpy as np

from .config import settings
from .visual_memory import visual_memory, VisualMatchResult

logger = logging.getLogger("ecotwin.model")

@dataclass
class DetectionResult:
    class_name: str
    confidence: float # Actual geometric similarity score [0.0, 1.0]
    bbox: List[int] # [x, y, w, h]
    detected_at: float
    camera_id: str
    building_id: str
    polygon: Optional[List[List[int]]] = None
    item_id: Optional[str] = None
    sample_id: Optional[str] = None
    category: Optional[str] = None

class EnvironmentalModelAdapter:
    """
    Object-detection adapter for genuine environmental classifications.
    Supports:
    1. Live Teach-and-Remember Visual Memory Engine (OpenCV SIFT + RANSAC Homography)
    2. Configured ONNX/PyTorch detectors if present.
    """

    SUPPORTED_CLASSES = [
        "visible_litter",
        "overflowing_bins",
        "plastic_waste",
        "paper_waste",
        "food_waste",
    ]

    def __init__(self):
        self.model_path = Path(settings.MODEL_PATH)
        self.model_version = "2.1.0"
        self.model_name = "EcoTwin Visual Memory & Vision Engine"
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD
        self.cooldown_seconds = settings.COOLDOWN_SECONDS

        self.net = None
        self.is_available = False
        self.status = "TEACHING MODE (NO ITEMS TAUGHT)"
        self.error_reason = ""

        # Cooldown ledger specifically for RECORDING persistence events (not visual overlay)
        # (camera_id, class_name) -> last_event_epoch
        self._event_cooldown_ledger: Dict[Tuple[str, str], float] = {}

        self.load_model()

    def load_model(self):
        """
        Loads the configured vision model if present.
        If file does not exist, sets status to MODEL NOT TRAINED.
        """
        target_path = self.model_path
        if not target_path.exists():
            onnx_alt = target_path.with_suffix(".onnx")
            pt_alt = target_path.with_suffix(".pt")
            if onnx_alt.exists():
                target_path = onnx_alt
            elif pt_alt.exists():
                target_path = pt_alt

        if not target_path.exists():
            self.is_available = False
            self.status = "MODEL NOT TRAINED"
            self.error_reason = f"Model weights not found at '{target_path}'. Follow model_training/ guide to label data and train weights."
            logger.info(self.error_reason)
            return

        self.model_path = target_path
        try:
            suffix = self.model_path.suffix.lower()
            if suffix == ".onnx":
                self.net = cv2.dnn.readNetFromONNX(str(self.model_path))
                self.is_available = True
                self.status = "MODEL ACTIVE"
                self.error_reason = ""
                logger.info("Successfully loaded ONNX model from %s", self.model_path)
            elif suffix in [".pt", ".pth"]:
                try:
                    from ultralytics import YOLO
                    self.net = YOLO(str(self.model_path))
                    self.is_available = True
                    self.status = "MODEL ACTIVE"
                    self.error_reason = ""
                    logger.info("Successfully loaded YOLO model from %s", self.model_path)
                except ImportError:
                    try:
                        import torch
                        self.net = torch.load(str(self.model_path), map_location="cpu")
                        self.is_available = True
                        self.status = "MODEL ACTIVE"
                        self.error_reason = ""
                        logger.info("Successfully loaded PyTorch weights from %s", self.model_path)
                    except ImportError:
                        self.is_available = False
                        self.status = "MODEL UNAVAILABLE"
                        self.error_reason = "Neither ultralytics nor PyTorch installed to parse .pt weights. Export to .onnx for native OpenCV DNN."
                        logger.warning(self.error_reason)
            else:
                self.is_available = False
                self.status = "MODEL UNAVAILABLE"
                self.error_reason = f"Unsupported model format '{suffix}'. Supported: .onnx, .pt"
                logger.warning(self.error_reason)

        except Exception as e:
            self.is_available = False
            self.status = "MODEL UNAVAILABLE"
            self.error_reason = f"Failed to initialize model: {str(e)}"
            logger.error(self.error_reason, exc_info=True)

    def should_record_event(self, camera_id: str, class_name: str) -> bool:
        """
        Determines if an event should be saved to database based on cooldown interval.
        This does NOT affect the live visual overlay.
        """
        now = time.time()
        last_time = self._event_cooldown_ledger.get((camera_id, class_name), 0)
        if (now - last_time) >= self.cooldown_seconds:
            self._event_cooldown_ledger[(camera_id, class_name)] = now
            return True
        return False

    def detect(self, frame: np.ndarray, camera_id: str, building_id: str) -> List[DetectionResult]:
        """
        Performs genuine inference on the input frame.
        1. Checks Teach-and-Remember visual memory (SIFT RANSAC feature matching).
        2. If no visual memory matches, checks traditional trained detector if loaded.
        3. Never returns fake detections.
        """
        if frame is None or frame.size == 0:
            return []

        now = time.time()
        detections: List[DetectionResult] = []

        # 1. Teach-and-Remember Visual Memory Matching
        if visual_memory.items:
            try:
                # Minimum geometric similarity threshold (0.45 default)
                match = visual_memory.match_frame(frame, min_similarity=self.confidence_threshold)
                if match is not None:
                    detections.append(
                        DetectionResult(
                            class_name=match.name,
                            confidence=round(match.similarity, 4),
                            bbox=match.bbox,
                            detected_at=now,
                            camera_id=camera_id,
                            building_id=building_id,
                            polygon=match.polygon,
                            item_id=match.item_id,
                            sample_id=match.sample_id,
                            category=match.category,
                        )
                    )
                    return detections
            except Exception as e:
                logger.error("Visual memory matching error: %s", str(e))

        # 2. Fallback to conventional weights (if trained weights file was installed)
        if not self.is_available or self.net is None:
            return []

        img_h, img_w = frame.shape[:2]

        try:
            # OpenCV DNN ONNX Execution
            if isinstance(self.net, cv2.dnn.Net):
                blob = cv2.dnn.blobFromImage(frame, 1 / 255.0, (640, 640), swapRB=True, crop=False)
                self.net.setInput(blob)
                layer_outputs = self.net.forward()

                if len(layer_outputs.shape) == 3:
                    output = layer_outputs[0]
                    predictions = output.T
                    boxes, confidences, class_ids = [], [], []

                    x_factor = img_w / 640.0
                    y_factor = img_h / 640.0

                    for pred in predictions:
                        scores = pred[4:]
                        class_id = int(np.argmax(scores))
                        confidence = float(scores[class_id])
                        if confidence >= self.confidence_threshold and class_id < len(self.SUPPORTED_CLASSES):
                            xc, yc, w, h = pred[0:4]
                            left = int((xc - 0.5 * w) * x_factor)
                            top = int((yc - 0.5 * h) * y_factor)
                            width = int(w * x_factor)
                            height = int(h * y_factor)

                            left = max(0, min(left, img_w - 1))
                            top = max(0, min(top, img_h - 1))
                            width = max(1, min(width, img_w - left))
                            height = max(1, min(height, img_h - top))

                            boxes.append([left, top, width, height])
                            confidences.append(confidence)
                            class_ids.append(class_id)

                    if boxes:
                        indices = cv2.dnn.NMSBoxes(boxes, confidences, self.confidence_threshold, 0.45)
                        if len(indices) > 0:
                            for idx in indices.flatten():
                                cid = class_ids[idx]
                                class_name = self.SUPPORTED_CLASSES[cid]
                                conf = confidences[idx]
                                bbox = boxes[idx]
                                detections.append(
                                    DetectionResult(
                                        class_name=class_name,
                                        confidence=round(conf, 4),
                                        bbox=bbox,
                                        detected_at=now,
                                        camera_id=camera_id,
                                        building_id=building_id,
                                    )
                                )

            # Ultralytics YOLO execution (if .pt model is loaded)
            elif hasattr(self.net, "predict"):
                results = self.net.predict(source=frame, conf=self.confidence_threshold, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_idx = int(box.cls[0])
                        conf = float(box.conf[0])
                        if cls_idx < len(self.SUPPORTED_CLASSES):
                            class_name = self.SUPPORTED_CLASSES[cls_idx]
                            xywh = box.xywh[0].cpu().numpy()
                            xc, yc, w, h = xywh
                            left = max(0, int(xc - w / 2))
                            top = max(0, int(yc - h / 2))
                            bbox = [left, top, int(w), int(h)]
                            detections.append(
                                DetectionResult(
                                    class_name=class_name,
                                    confidence=round(conf, 4),
                                    bbox=bbox,
                                    detected_at=now,
                                    camera_id=camera_id,
                                    building_id=building_id,
                                )
                            )

        except Exception as e:
            logger.error("Inference execution error: %s", str(e))

        return detections

    def get_status(self) -> Dict:
        taught_items_count = len(visual_memory.items)
        taught_samples_count = len(visual_memory._feature_cache)

        if taught_items_count > 0:
            return {
                "engine_type": "VISUAL_MEMORY_SIFT",
                "model_name": "Teach-and-Remember Visual Memory",
                "model_version": self.model_version,
                "model_path": str(visual_memory.memory_file),
                "is_available": True,
                "status": f"VISUAL MEMORY ACTIVE ({taught_items_count} items taught)",
                "taught_items_count": taught_items_count,
                "taught_samples_count": taught_samples_count,
                "error_reason": "",
                "supported_classes": [item.name for item in visual_memory.items.values()],
                "confidence_threshold": self.confidence_threshold,
                "cooldown_seconds": self.cooldown_seconds,
            }

        if self.is_available:
            return {
                "engine_type": "CONVENTIONAL_DETECTOR",
                "model_name": self.model_name,
                "model_version": self.model_version,
                "model_path": str(self.model_path),
                "is_available": True,
                "status": self.status,
                "taught_items_count": 0,
                "taught_samples_count": 0,
                "error_reason": self.error_reason,
                "supported_classes": self.SUPPORTED_CLASSES,
                "confidence_threshold": self.confidence_threshold,
                "cooldown_seconds": self.cooldown_seconds,
            }

        return {
            "engine_type": "TEACH_AND_REMEMBER",
            "model_name": "Teach-and-Remember Visual Memory",
            "model_version": self.model_version,
            "model_path": str(visual_memory.memory_file),
            "is_available": False,
            "status": "TEACHING MODE (0 ITEMS TAUGHT)",
            "taught_items_count": 0,
            "taught_samples_count": 0,
            "error_reason": "No items have been taught yet. Click 'Freeze & Teach Waste' to remember your first waste item.",
            "supported_classes": self.SUPPORTED_CLASSES,
            "confidence_threshold": self.confidence_threshold,
            "cooldown_seconds": self.cooldown_seconds,
        }

model_adapter = EnvironmentalModelAdapter()
