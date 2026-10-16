"""
EcoTwin AI — Shared Physical Webcam Capture & Vision Manager
Guarantees:
1. Exactly ONE physical webcam session at a time on Windows (using cv2.CAP_DSHOW).
2. Four selectable logical camera profiles (Camera 1..4) mapped to separate campus facilities.
3. Decoupled capture and inference threads: high-FPS video streaming without UI/capture stuttering.
4. Temporal confirmation and smoothed bounding-box overlay tracker.
5. Safe session switching: invalidates session_id on switch to prevent stale frame attribution.
6. Truthful statuses: CONNECTED, OFFLINE, NOT CONFIGURED, INACTIVE IN DEMO MODE.
"""

import time
import uuid
import logging
import threading
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from .config import CAMERA_MAPPINGS, settings
from .model_adapter import model_adapter, DetectionResult
from .tracker import TemporalOverlayTracker, TrackedDetection

logger = logging.getLogger("ecotwin.capture")

class WebcamCaptureManager:
    _instance = None
    _lock = threading.RLock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(WebcamCaptureManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self._lock = threading.RLock()
        self.device_index: int = settings.CAMERA_INDEX
        self.active_camera_id: str = "camera-1"
        self.session_id: str = uuid.uuid4().hex
        self.is_monitoring: bool = False
        self.webcam_status: str = "NOT CONFIGURED" # Initial state per specification

        self._cap: Optional[cv2.VideoCapture] = None
        self._capture_thread: Optional[threading.Thread] = None
        self._inference_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Decoupled frame buffers
        self.latest_frame: Optional[np.ndarray] = None
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_frame_jpeg: Optional[bytes] = None
        self.latest_frame_time: Optional[float] = None
        self.latest_session_id: str = self.session_id

        # Temporal Overlay Tracker for multi-frame confirmation & EMA smoothing
        self.tracker = TemporalOverlayTracker(
            confirmation_hits=2,
            grace_period_seconds=1.3,
            checking_threshold_seconds=0.5,
            smoothing_alpha=0.65
        )

        # Attribution timestamps per camera
        self.camera_last_frame_times: Dict[str, Optional[float]] = {k: None for k in CAMERA_MAPPINGS}
        self.camera_last_detection_times: Dict[str, Optional[float]] = {k: None for k in CAMERA_MAPPINGS}

        # Event listener callback (for persisting detections)
        self.on_detection_callback = None

        self._initialized = True
        logger.info("WebcamCaptureManager initialized with device_index=%s, active_camera=%s", 
                    self.device_index, self.active_camera_id)

    def discover_devices(self, max_indices: int = 4) -> List[Dict]:
        """
        Scans physical webcam indices on Windows using DirectShow.
        Safely opens and immediately closes each index to prevent lockups.
        """
        devices = []
        with self._lock:
            was_monitoring = self.is_monitoring
            if self._cap is not None and self._cap.isOpened():
                self._cap.release()
                self._cap = None

            try:
                for idx in range(max_indices):
                    cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                    if cap.isOpened():
                        ret, frame = cap.read()
                        if ret and frame is not None:
                            h, w = frame.shape[:2]
                            devices.append({
                                "index": idx,
                                "name": f"Physical Webcam Device {idx}",
                                "resolution": f"{w}x{h}",
                                "is_default": (idx == self.device_index),
                                "status": "AVAILABLE"
                            })
                        cap.release()
                    else:
                        cap.release()
            except Exception as e:
                logger.error("Error during device discovery: %s", str(e))

            if was_monitoring:
                self._open_webcam()

        return devices

    def test_device(self, device_index: int) -> Dict:
        """
        Tests whether a physical webcam index can be opened and captured from.
        """
        with self._lock:
            logger.info("Testing webcam index %s", device_index)
            if self._cap is not None and self._cap.isOpened():
                self._cap.release()
                self._cap = None

            cap = cv2.VideoCapture(device_index, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap.release()
                self.webcam_status = "OFFLINE"
                return {
                    "success": False,
                    "device_index": device_index,
                    "status": "OFFLINE",
                    "error": f"Failed to open physical video capture on device index {device_index}."
                }

            ret, frame = cap.read()
            if not ret or frame is None:
                cap.release()
                self.webcam_status = "OFFLINE"
                return {
                    "success": False,
                    "device_index": device_index,
                    "status": "OFFLINE",
                    "error": f"Device index {device_index} opened but failed to read video frame."
                }

            h, w = frame.shape[:2]
            cap.release()

            self.device_index = device_index
            self.webcam_status = "CONNECTED"

            if self.is_monitoring:
                self._open_webcam()

            return {
                "success": True,
                "device_index": device_index,
                "status": "CONNECTED",
                "resolution": f"{w}x{h}",
                "message": f"Successfully verified physical webcam index {device_index} ({w}x{h})."
            }

    def select_camera(self, camera_id: str) -> Dict:
        """
        Switches the active logical camera profile.
        CRITICAL: Changes session_id and resets temporal tracker so in-flight frames 
        or detections from the previous camera are never misattributed to the new camera.
        """
        if camera_id not in CAMERA_MAPPINGS:
            raise ValueError(f"Invalid camera ID '{camera_id}'. Expected one of {list(CAMERA_MAPPINGS.keys())}")

        with self._lock:
            prev_camera_id = self.active_camera_id
            self.active_camera_id = camera_id
            # Invalidate in-flight frames and reset tracker
            self.session_id = uuid.uuid4().hex
            self.latest_session_id = self.session_id
            self.tracker.reset()

            logger.info("Switched active logical camera from %s to %s (New Session ID: %s)",
                        prev_camera_id, camera_id, self.session_id)

            return {
                "selected_camera_id": camera_id,
                "building_id": CAMERA_MAPPINGS[camera_id]["building_id"],
                "building_name": CAMERA_MAPPINGS[camera_id]["building_name"],
                "session_id": self.session_id,
                "status": "SWITCHED",
                "is_monitoring": self.is_monitoring
            }

    def _open_webcam(self) -> bool:
        """Internal helper to open the physical webcam safely under lock."""
        try:
            if self._cap is not None and self._cap.isOpened():
                return True

            self._cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
            if self._cap.isOpened():
                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.webcam_status = "CONNECTED"
                logger.info("Physical webcam index %s opened successfully with CAP_DSHOW.", self.device_index)
                return True
            else:
                self.webcam_status = "OFFLINE"
                logger.error("Could not open physical webcam index %s.", self.device_index)
                return False
        except Exception as e:
            self.webcam_status = "OFFLINE"
            logger.error("Exception opening physical webcam: %s", str(e))
            return False

    def start_monitoring(self, camera_id: Optional[str] = None) -> Dict:
        """
        Starts decoupled capture and AI inference loops for the selected camera.
        """
        with self._lock:
            if camera_id:
                self.select_camera(camera_id)

            if self.is_monitoring and self._capture_thread and self._capture_thread.is_alive():
                return {
                    "is_monitoring": True,
                    "active_camera_id": self.active_camera_id,
                    "status": "ALREADY_MONITORING"
                }

            if not self._open_webcam():
                return {
                    "is_monitoring": False,
                    "active_camera_id": self.active_camera_id,
                    "status": "OFFLINE",
                    "error": f"Failed to start monitoring: Physical webcam at index {self.device_index} is unavailable."
                }

            self._stop_event.clear()
            self.is_monitoring = True
            self.tracker.reset()

            # Start high-speed video capture thread
            self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
            self._capture_thread.start()

            # Start asynchronous inference thread
            self._inference_thread = threading.Thread(target=self._inference_loop, daemon=True)
            self._inference_thread.start()

            logger.info("Continuous monitoring started for %s (Decoupled capture + inference)", self.active_camera_id)
            return {
                "is_monitoring": True,
                "active_camera_id": self.active_camera_id,
                "building_id": CAMERA_MAPPINGS[self.active_camera_id]["building_id"],
                "status": "MONITORING_ACTIVE"
            }

    def stop_monitoring(self) -> Dict:
        """
        Stops the worker threads and safely releases the physical webcam.
        """
        with self._lock:
            self._stop_event.set()
            self.is_monitoring = False
            self.tracker.reset()

            if self._cap is not None:
                try:
                    self._cap.release()
                except Exception as e:
                    logger.error("Error releasing webcam: %s", str(e))
                self._cap = None

            logger.info("Monitoring stopped and webcam released safely.")
            return {
                "is_monitoring": False,
                "active_camera_id": self.active_camera_id,
                "status": "MONITORING_STOPPED"
            }

    def _inference_loop(self):
        """
        Asynchronous inference worker thread.
        Runs at controlled interval (~10-12 Hz) to process visual memory matching
        without blocking the camera capture stream.
        """
        logger.info("Inference loop worker started.")
        while not self._stop_event.is_set():
            time.sleep(0.08) # ~12 inferences/second

            with self._lock:
                if not self.is_monitoring or self._cap is None:
                    continue
                raw_frame = self.latest_raw_frame
                session_at_snap = self.latest_session_id
                current_session = self.session_id
                current_camera_id = self.active_camera_id

            if raw_frame is None or session_at_snap != current_session:
                continue

            cam_info = CAMERA_MAPPINGS.get(current_camera_id, {})
            building_id = cam_info.get("building_id", "engineering")

            # Run real visual memory / model inference
            detections = model_adapter.detect(raw_frame, current_camera_id, building_id)
            active_det = detections[0] if detections else None

            # Update temporal tracker
            tracked = self.tracker.update(active_det)

            # If item is confirmed as RECOGNISED and event cooldown passed, record event
            if tracked and tracked.status == "RECOGNISED" and active_det:
                with self._lock:
                    if current_session != self.session_id:
                        continue
                    self.camera_last_detection_times[current_camera_id] = active_det.detected_at

                if model_adapter.should_record_event(current_camera_id, tracked.name):
                    if self.on_detection_callback:
                        try:
                            # Deliver detection result with the current annotated frame
                            annotated_snapshot = self.latest_frame if self.latest_frame is not None else raw_frame
                            self.on_detection_callback(active_det, annotated_snapshot)
                        except Exception as e:
                            logger.error("Error in on_detection_callback: %s", str(e))

        logger.info("Inference loop worker ended.")

    def _capture_loop(self):
        """
        High-speed video capture thread (~25-30 FPS).
        Reads frames from DirectShow hardware, maintains clean raw frame,
        and renders smooth temporal overlays for streaming.
        """
        logger.info("Capture loop worker started.")
        while not self._stop_event.is_set():
            time.sleep(0.035) # ~28 FPS target for smooth video

            with self._lock:
                current_session = self.session_id
                current_camera_id = self.active_camera_id
                cap = self._cap

            if cap is None or not cap.isOpened():
                time.sleep(0.1)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            capture_timestamp = time.time()

            # Verify session hasn't switched while reading from hardware
            with self._lock:
                if current_session != self.session_id:
                    logger.warning("Discarded stale frame from session %s (Current: %s)", 
                                   current_session, self.session_id)
                    continue

                cam_info = CAMERA_MAPPINGS.get(current_camera_id, {})
                display_label = f"DEMO MODE [SHARED WEBCAM] | {cam_info.get('name', current_camera_id)}"
                sub_label = f"Building: {cam_info.get('building_name', 'Unknown')} | {time.strftime('%H:%M:%S', time.localtime(capture_timestamp))}"

                # Store clean raw frame for inference & freeze-teaching
                self.latest_raw_frame = frame.copy()
                self.latest_session_id = current_session

            # Create annotated copy for display
            annotated = frame.copy()

            # Get latest smoothed detection from temporal tracker
            tracked = self.tracker.get_current_overlay()

            if tracked is not None and tracked.smoothed_bbox:
                bx, by, bw, bh = tracked.smoothed_bbox
                if bw > 0 and bh > 0:
                    if tracked.status == "RECOGNISED":
                        box_color = (0, 255, 120)  # Emerald green
                        text_color = (10, 30, 20)
                        tag = f"[RECOGNISED] {tracked.name.upper()} | SIMILARITY: {int(tracked.similarity * 100)}%"
                    else:  # CHECKING
                        box_color = (0, 190, 255)  # Amber
                        text_color = (30, 20, 10)
                        tag = f"[CHECKING] {tracked.name.upper()}..."

                    # Draw smooth bounding box
                    cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), box_color, 2)

                    # Draw badge
                    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    badge_y1 = max(0, by - th - 8)
                    badge_y2 = max(th + 8, by)
                    cv2.rectangle(annotated, (bx, badge_y1), (bx + tw + 10, badge_y2), box_color, -1)
                    cv2.putText(annotated, tag, (bx + 5, badge_y2 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, text_color, 1, cv2.LINE_AA)
            else:
                # Honestly indicate no active match above threshold
                sub_label += " | Unknown / No reliable match"

            # Top header bar watermark
            cv2.rectangle(annotated, (10, 10), (630, 48), (20, 20, 20), -1)
            cv2.putText(annotated, display_label, (18, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 180), 1, cv2.LINE_AA)
            cv2.putText(annotated, sub_label, (18, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 200, 200), 1, cv2.LINE_AA)

            with self._lock:
                self.latest_frame = annotated
                self.latest_frame_time = capture_timestamp
                self.camera_last_frame_times[current_camera_id] = capture_timestamp

                # Encode JPEG for HTTP video streaming
                ret_enc, jpeg = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret_enc:
                    self.latest_frame_jpeg = jpeg.tobytes()

        logger.info("Capture loop worker ended.")

    def get_latest_frame(self) -> Tuple[Optional[bytes], Optional[float], str]:
        """Returns the latest JPEG frame, timestamp, and active camera ID."""
        with self._lock:
            return self.latest_frame_jpeg, self.latest_frame_time, self.active_camera_id

    def get_raw_frame(self) -> Tuple[Optional[np.ndarray], str]:
        """Returns the latest clean un-watermarked BGR frame and active camera ID (for teaching)."""
        with self._lock:
            if self.latest_raw_frame is not None:
                return self.latest_raw_frame.copy(), self.active_camera_id
            if self._cap is not None and self._cap.isOpened():
                ret, frame = self._cap.read()
                if ret and frame is not None:
                    return frame, self.active_camera_id
            return None, self.active_camera_id

    def generate_mjpeg_stream(self):
        """Yields an MJPEG video stream for HTTP streaming."""
        while True:
            time.sleep(0.04)
            jpeg_bytes, _, _ = self.get_latest_frame()
            if jpeg_bytes is not None:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
            else:
                blank = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(blank, "WEBCAM INACTIVE / NOT MONITORING", (120, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (120, 120, 120), 1, cv2.LINE_AA)
                _, blank_jpg = cv2.imencode('.jpg', blank)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + blank_jpg.tobytes() + b'\r\n')

    def get_status(self) -> Dict:
        """
        Returns full truthful status of all 4 logical camera profiles
        and the shared physical hardware.
        """
        with self._lock:
            camera_statuses = {}
            for cam_id, meta in CAMERA_MAPPINGS.items():
                is_selected = (cam_id == self.active_camera_id)

                if is_selected:
                    if self.is_monitoring:
                        status = "CONNECTED" if self.webcam_status == "CONNECTED" else "OFFLINE"
                    else:
                        status = "NOT CONFIGURED" if self.webcam_status == "NOT CONFIGURED" else "READY"
                else:
                    status = "INACTIVE IN DEMO MODE"

                camera_statuses[cam_id] = {
                    "id": cam_id,
                    "name": meta["name"],
                    "building_id": meta["building_id"],
                    "building_name": meta["building_name"],
                    "zone": meta["zone"],
                    "is_selected": is_selected,
                    "status": status,
                    "is_demo_mode": True,
                    "physical_device": f"Physical Webcam (Index {self.device_index})",
                    "last_frame_time": self.camera_last_frame_times.get(cam_id),
                    "last_detection_time": self.camera_last_detection_times.get(cam_id)
                }

            return {
                "active_camera_id": self.active_camera_id,
                "is_monitoring": self.is_monitoring,
                "webcam_status": self.webcam_status,
                "physical_device_index": self.device_index,
                "session_id": self.session_id,
                "model_status": model_adapter.get_status(),
                "cameras": camera_statuses
            }

capture_manager = WebcamCaptureManager()
