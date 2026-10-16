"""
EcoTwin AI — Event Storage & Attribution Manager
Strictly adheres to:
1. Server-side resolution of building and zone association from registered logical camera.
2. Actual model confidence and genuine detected classes (visual similarity score).
3. Supabase Storage upload with collision-safe paths and graceful local fallback.
4. Resilient persistence: writes to Supabase public.camera_events and local ledger.
5. Adaptive schema support: stores enhanced fields (item_name, waste_category, zone, bbox, review_status)
   with automatic fallback if optional columns are pending migration.
6. Strict filtering by camera, building, category, and review status without mixed records.
"""

import os
import sys
import json
import uuid
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

import cv2
import numpy as np

from .config import CAMERA_MAPPINGS, EVIDENCE_DIR, DATA_DIR, settings

logger = logging.getLogger("ecotwin.eventstore")

def _get_supabase_client(url: str, key: str):
    """
    Safely imports and instantiates the pip supabase client,
    preventing name clashes with any local 'supabase' folder.
    """
    orig_path = list(sys.path)
    try:
        clean_paths = [p for p in sys.path if os.path.abspath(p) != os.path.abspath('.')]
        sys.path = clean_paths
        import supabase
        return supabase.create_client(url, key)
    except Exception as e:
        logger.warning("Could not initialize Supabase client via pip package: %s", str(e))
        return None
    finally:
        sys.path = orig_path

class EventStore:
    def __init__(self):
        self.events_file = DATA_DIR / "events.json"
        self._ensure_storage()
        self.supabase = None
        self.supabase_url = settings.SUPABASE_URL
        self._init_supabase()

    def _ensure_storage(self):
        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not self.events_file.exists():
            with open(self.events_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _init_supabase(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                self.supabase = _get_supabase_client(url, key)
                if self.supabase:
                    logger.info("Supabase client initialized successfully for event storage.")
                else:
                    logger.warning("Supabase client returned None. Using local resilient storage.")
            except Exception as e:
                logger.warning("Could not initialize Supabase client: %s. Using local resilient storage.", str(e))
                self.supabase = None
        else:
            logger.info("Supabase credentials not configured in environment. Using local resilient storage.")

    def record_event(
        self,
        camera_id: str,
        detected_class: str,
        confidence: float,
        frame_bgr: Optional[np.ndarray] = None,
        model_name: str = "Teach-and-Remember Visual Memory",
        model_version: str = "2.1.0",
        item_name: Optional[str] = None,
        waste_category: Optional[str] = None,
        similarity_score: Optional[float] = None,
        bbox: Optional[List[int]] = None,
        polygon: Optional[List[List[int]]] = None,
        match_inliers: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Dict:
        """
        Records a genuine AI detection event with server-side validated attribution,
        uploads evidence to Supabase Storage, and persists to database and local ledger.
        """
        # Server-side validation of logical camera
        if camera_id not in CAMERA_MAPPINGS:
            raise ValueError(f"Unknown camera ID '{camera_id}'. Cannot attribute detection event.")

        cam_meta = CAMERA_MAPPINGS[camera_id]
        building_id = cam_meta["building_id"]
        building_name = cam_meta["building_name"]
        zone = cam_meta.get("zone", "General Campus Sector")

        # Resolve item name and category
        resolved_item_name = item_name or detected_class
        resolved_category = waste_category or "visible_litter"

        event_id = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        event_code = f"EVT-{camera_id.upper()}-{timestamp_str}-{event_id[:6].upper()}"
        detected_at = datetime.now(timezone.utc).isoformat()

        evidence_storage_path = None
        evidence_image_url = None
        persistence_status = "stored"

        # 1. Save evidence image if frame provided
        if frame_bgr is not None:
            image_filename = f"{event_code}.jpg"
            local_path = EVIDENCE_DIR / image_filename
            try:
                cv2.imwrite(str(local_path), frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                evidence_storage_path = str(local_path)
                # Default local accessible URL (served by Next.js /evidence endpoint & FastAPI)
                evidence_image_url = f"/evidence/{image_filename}"

                # Save bounding box crop if available
                if bbox and len(bbox) == 4:
                    try:
                        bx, by, bw, bh = bbox
                        fh, fw = frame_bgr.shape[:2]
                        x1, y1 = max(0, int(bx)), max(0, int(by))
                        x2, y2 = min(fw, int(bx + bw)), min(fh, int(by + bh))
                        if x2 > x1 and y2 > y1:
                            crop = frame_bgr[y1:y2, x1:x2]
                            crop_filename = f"{event_code}_crop.jpg"
                            cv2.imwrite(str(EVIDENCE_DIR / crop_filename), crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                    except Exception as ce:
                        logger.warning("Could not write crop image locally: %s", str(ce))

                # 2. Upload to Supabase Storage 'camera-evidence' bucket
                if self.supabase and self.supabase_url:
                    try:
                        storage_remote_path = f"{camera_id}/{image_filename}"
                        with open(local_path, "rb") as f:
                            file_bytes = f.read()
                            self.supabase.storage.from_("camera-evidence").upload(
                                path=storage_remote_path,
                                file=file_bytes,
                                file_options={"content-type": "image/jpeg", "upsert": "true"}
                            )
                        # Retrieve public Storage URL
                        pub_url = self.supabase.storage.from_("camera-evidence").get_public_url(storage_remote_path)
                        evidence_storage_path = f"camera-evidence/{storage_remote_path}"
                        evidence_image_url = pub_url
                        persistence_status = "stored"
                        logger.info("Uploaded evidence snapshot to Supabase Storage: %s", evidence_storage_path)

                        # Also upload crop if created
                        crop_file = EVIDENCE_DIR / f"{event_code}_crop.jpg"
                        if crop_file.exists():
                            try:
                                with open(crop_file, "rb") as cf:
                                    self.supabase.storage.from_("camera-evidence").upload(
                                        path=f"{camera_id}/{event_code}_crop.jpg",
                                        file=cf.read(),
                                        file_options={"content-type": "image/jpeg", "upsert": "true"}
                                    )
                            except Exception:
                                pass
                    except Exception as upload_err:
                        logger.warning("Supabase storage upload failed: %s. Preserved local copy at %s", 
                                       str(upload_err), evidence_image_url)
                        persistence_status = "evidence_failed"
            except Exception as img_err:
                logger.error("Failed to persist evidence image locally: %s", str(img_err))
                persistence_status = "evidence_failed"

        # Base event record (guaranteed compatible with existing schema)
        base_record = {
            "id": event_id,
            "event_code": event_code,
            "camera_id": camera_id,
            "building_id": building_id,
            "building_name": building_name,
            "detected_class": detected_class,
            "confidence": round(float(confidence), 4),
            "detected_at": detected_at,
            "evidence_storage_path": evidence_storage_path,
            "evidence_image_url": evidence_image_url,
            "model_name": model_name,
            "model_version": model_version,
            "persistence_status": persistence_status,
            "is_verified": True
        }

        # Enhanced event record
        enhanced_fields = {
            "item_name": resolved_item_name,
            "waste_category": resolved_category,
            "zone": zone,
            "similarity_score": round(float(similarity_score if similarity_score is not None else confidence), 4),
            "bbox": bbox,
            "polygon": polygon,
            "match_inliers": match_inliers,
            "review_status": "pending_review",
            "notes": notes or f"Visual instance match for '{resolved_item_name}' in {zone}."
        }

        full_record = {**base_record, **enhanced_fields}

        # 3. Persist to Supabase table
        if self.supabase:
            try:
                # Try inserting full enhanced record first
                self.supabase.table("camera_events").insert(full_record).execute()
                logger.info("Event %s persisted to Supabase camera_events with enhanced fields.", event_code)
            except Exception as db_err:
                err_msg = str(db_err)
                logger.warning("Failed to insert enhanced event into Supabase: %s. Retrying with base record.", err_msg)
                try:
                    # Fallback to base columns if migration has not been applied yet
                    self.supabase.table("camera_events").insert(base_record).execute()
                    logger.info("Event %s persisted to Supabase camera_events (base schema fallback).", event_code)
                except Exception as base_err:
                    logger.error("Supabase base insert also failed: %s. Saved in resilient local ledger.", str(base_err))

        # 4. Always save full record to local resilient ledger
        self._append_to_local_ledger(full_record)
        return full_record

    def _append_to_local_ledger(self, record: Dict):
        try:
            events = []
            if self.events_file.exists():
                with open(self.events_file, "r", encoding="utf-8") as f:
                    events = json.load(f)
            events.insert(0, record) # newest first
            # Cap local ledger to 1000 events
            events = events[:1000]
            with open(self.events_file, "w", encoding="utf-8") as f:
                json.dump(events, f, indent=2)
        except Exception as e:
            logger.error("Error writing to local events ledger: %s", str(e))

    def update_review_status(self, event_id: str, review_status: str, notes: Optional[str] = None) -> bool:
        """Updates the verification/review status of an event."""
        valid_statuses = ["unreviewed", "pending_review", "verified_waste", "false_positive", "resolved"]
        if review_status not in valid_statuses:
            raise ValueError(f"Invalid review status '{review_status}'. Expected one of {valid_statuses}")

        # Update Supabase if available
        if self.supabase:
            try:
                payload = {"review_status": review_status}
                if notes:
                    payload["notes"] = notes
                self.supabase.table("camera_events").update(payload).eq("id", event_id).execute()
            except Exception as e:
                logger.warning("Supabase review status update failed: %s", str(e))

        # Update local ledger
        try:
            if self.events_file.exists():
                with open(self.events_file, "r", encoding="utf-8") as f:
                    events = json.load(f)
                updated = False
                for e in events:
                    if e.get("id") == event_id or e.get("event_code") == event_id:
                        e["review_status"] = review_status
                        if notes:
                            e["notes"] = notes
                        updated = True
                        break
                if updated:
                    with open(self.events_file, "w", encoding="utf-8") as f:
                        json.dump(events, f, indent=2)
                    return True
        except Exception as e:
            logger.error("Local review status update failed: %s", str(e))
        return False

    def get_events(
        self,
        camera_id: Optional[str] = None,
        building_id: Optional[str] = None,
        category: Optional[str] = None,
        review_status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Retrieves real events filtered strictly by camera, building, category, or review status.
        """
        # Try Supabase first if available
        if self.supabase:
            try:
                query = self.supabase.table("camera_events").select("*").order("detected_at", desc=True).limit(limit)
                if camera_id and camera_id != "all":
                    query = query.eq("camera_id", camera_id)
                if building_id and building_id != "all":
                    query = query.eq("building_id", building_id)
                if category and category != "all":
                    # Check both waste_category and detected_class
                    query = query.or_(f"waste_category.eq.{category},detected_class.eq.{category}")
                if review_status and review_status != "all":
                    query = query.eq("review_status", review_status)

                response = query.execute()
                if response.data:
                    return response.data
            except Exception as e:
                logger.warning("Supabase query failed (%s). Falling back to local ledger.", str(e))

        # Resilient local ledger fallback
        try:
            if not self.events_file.exists():
                return []
            with open(self.events_file, "r", encoding="utf-8") as f:
                all_events: List[Dict] = json.load(f)

            filtered = all_events
            if camera_id and camera_id != "all":
                filtered = [e for e in filtered if e.get("camera_id") == camera_id]
            if building_id and building_id != "all":
                filtered = [e for e in filtered if e.get("building_id") == building_id]
            if category and category != "all":
                filtered = [e for e in filtered if e.get("waste_category") == category or e.get("detected_class") == category]
            if review_status and review_status != "all":
                filtered = [e for e in filtered if e.get("review_status") == review_status]

            return filtered[:limit]
        except Exception as e:
            logger.error("Error reading local events ledger: %s", str(e))
            return []

event_store = EventStore()
