"""
EcoTwin AI — Live Teach-and-Remember Visual Memory Engine
Uses OpenCV SIFT (Scale-Invariant Feature Transform) feature descriptors 
and RANSAC homography geometric verification for few-shot visual recognition.

Key Features & Optimisations:
1. Fast grayscale preprocessing and intelligent frame downscaling for 2-3x faster feature extraction.
2. Cached reference keypoints and descriptors in memory; no recomputation during matching.
3. Enhanced angle, rotation, tilt, and lighting tolerance via tuned Lowe's ratio test (0.78) and RANSAC.
4. Scale-normalized perspective projection: matches on downscaled frames while projecting 
   exact bounding boxes scaled back to full live video resolution.
5. Multiple reference views grouped under a single item name for multi-angle recognition.
6. Truthful geometric similarity scoring based on SIFT inliers and descriptor coverage.
7. Geometric sanity checks (convexity, area, aspect ratio) preventing degenerate false detections.
8. Persisted to disk across application restarts.
"""

import os
import sys
import time
import json
import uuid
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict

import cv2
import numpy as np

logger = logging.getLogger("ecotwin.visual_memory")

BASE_DIR = Path(__file__).resolve().parent
MEMORY_DIR = BASE_DIR / "memory"
CROPS_DIR = MEMORY_DIR / "crops"
DATA_DIR = BASE_DIR / "data"
MEMORY_JSON = DATA_DIR / "taught_memory.json"

CROPS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class VisualSample:
    sample_id: str
    crop_filename: str
    box: List[int] # [x, y, w, h] on original frame
    created_at: float
    keypoints_count: int

@dataclass
class TaughtItem:
    item_id: str
    name: str
    category: str # e.g. plastic_waste, paper_waste, food_waste, visible_litter, overflowing_bins
    created_at: float
    samples: List[VisualSample]

@dataclass
class VisualMatchResult:
    item_id: str
    name: str
    category: str
    sample_id: str
    similarity: float # Actual geometric similarity score [0.0, 1.0]
    inliers_count: int
    good_matches_count: int
    bbox: List[int] # [x, y, w, h] in live frame coordinates
    polygon: List[List[int]] # 4 corner vertices [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]

class VisualMemoryEngine:
    """
    Manages persistent visual memory and executes real-time feature matching.
    """

    SUPPORTED_CATEGORIES = [
        "plastic_waste",
        "paper_waste",
        "food_waste",
        "overflowing_bins",
        "visible_litter",
    ]

    def __init__(self, memory_file: Path = MEMORY_JSON, crops_dir: Path = CROPS_DIR):
        self.memory_file = memory_file
        self.crops_dir = crops_dir
        self.items: Dict[str, TaughtItem] = {} # item_id -> TaughtItem

        # In-memory feature cache: sample_id -> (keypoints, descriptors, shape (h, w))
        self._feature_cache: Dict[str, Tuple[List, Optional[np.ndarray], Tuple[int, int]]] = {}

        # SIFT detector & Brute-Force L2 matcher
        # nfeatures=1000 provides high detail for complex textures and oblique angles
        self.sift = cv2.SIFT_create(nfeatures=1000)
        self.bf_matcher = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)

        self.load_memory()

    def load_memory(self):
        """Loads taught items from persistent JSON storage and precomputes features."""
        self.items.clear()
        self._feature_cache.clear()

        if not self.memory_file.exists():
            logger.info("Visual memory file does not exist yet. Initializing empty visual memory.")
            self._save_memory()
            return

        try:
            with open(self.memory_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            for item_raw in data.get("items", []):
                samples = [
                    VisualSample(
                        sample_id=s["sample_id"],
                        crop_filename=s["crop_filename"],
                        box=s["box"],
                        created_at=s.get("created_at", time.time()),
                        keypoints_count=s.get("keypoints_count", 0)
                    )
                    for s in item_raw.get("samples", [])
                ]
                item = TaughtItem(
                    item_id=item_raw["item_id"],
                    name=item_raw["name"],
                    category=item_raw.get("category", "plastic_waste"),
                    created_at=item_raw.get("created_at", time.time()),
                    samples=samples
                )
                self.items[item.item_id] = item

                # Precompute features for each sample crop in grayscale
                for s in samples:
                    crop_path = self.crops_dir / s.crop_filename
                    if crop_path.exists():
                        crop_img = cv2.imread(str(crop_path))
                        if crop_img is not None:
                            gray_crop = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY) if len(crop_img.shape) == 3 else crop_img
                            kp, des = self.sift.detectAndCompute(gray_crop, None)
                            if des is not None:
                                self._feature_cache[s.sample_id] = (kp, des, crop_img.shape[:2])

            logger.info("Loaded %d taught items (%d total sample views) into visual memory.",
                        len(self.items), len(self._feature_cache))

        except Exception as e:
            logger.error("Error loading visual memory: %s", str(e), exc_info=True)

    def _save_memory(self):
        """Persists items metadata to disk."""
        try:
            data = {
                "version": "2.0.0",
                "updated_at": time.time(),
                "items": [
                    {
                        "item_id": item.item_id,
                        "name": item.name,
                        "category": item.category,
                        "created_at": item.created_at,
                        "samples": [asdict(s) for s in item.samples]
                    }
                    for item in self.items.values()
                ]
            }
            with open(self.memory_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info("Saved visual memory (%d items) to %s", len(self.items), self.memory_file)
        except Exception as e:
            logger.error("Error saving visual memory: %s", str(e))

    def teach_item(self, name: str, category: str, crop_bgr: np.ndarray, box: List[int]) -> Dict:
        """
        Teaches a new visual item or adds a new view to an existing item name.
        """
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Item name cannot be empty.")

        if category not in self.SUPPORTED_CATEGORIES:
            category = "visible_litter"

        if crop_bgr is None or crop_bgr.size == 0 or crop_bgr.shape[0] < 15 or crop_bgr.shape[1] < 15:
            raise ValueError("Invalid crop image. Must be at least 15x15 pixels.")

        # Check if an item with this exact name already exists (case-insensitive)
        existing_item = None
        for item in self.items.values():
            if item.name.lower() == clean_name.lower():
                existing_item = item
                break

        now = time.time()
        sample_id = uuid.uuid4().hex[:12]
        crop_filename = f"crop_{sample_id}.jpg"
        crop_path = self.crops_dir / crop_filename

        # Save crop image to disk
        cv2.imwrite(str(crop_path), crop_bgr)

        # Compute SIFT features in grayscale for maximum speed & invariance
        gray_crop = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY) if len(crop_bgr.shape) == 3 else crop_bgr
        kp, des = self.sift.detectAndCompute(gray_crop, None)
        kp_count = len(kp) if kp else 0

        if des is not None:
            self._feature_cache[sample_id] = (kp, des, crop_bgr.shape[:2])
        else:
            logger.warning("No SIFT keypoints found in crop for '%s'. Visual matching may be limited.", clean_name)

        sample = VisualSample(
            sample_id=sample_id,
            crop_filename=crop_filename,
            box=box,
            created_at=now,
            keypoints_count=kp_count
        )

        if existing_item:
            existing_item.samples.append(sample)
            target_item = existing_item
            logger.info("Added new reference view to existing taught item '%s' (Total views: %d).",
                        clean_name, len(existing_item.samples))
        else:
            item_id = f"item_{uuid.uuid4().hex[:8]}"
            new_item = TaughtItem(
                item_id=item_id,
                name=clean_name,
                category=category,
                created_at=now,
                samples=[sample]
            )
            self.items[item_id] = new_item
            target_item = new_item
            logger.info("Created new taught item '%s' (ID: %s).", clean_name, item_id)

        self._save_memory()

        return {
            "success": True,
            "item_id": target_item.item_id,
            "name": target_item.name,
            "category": target_item.category,
            "sample_id": sample_id,
            "views_count": len(target_item.samples),
            "keypoints_detected": kp_count,
            "crop_url": f"/memory/crops/{sample_id}"
        }

    def rename_item(self, item_id: str, new_name: str) -> bool:
        """Renames an existing taught item."""
        clean_name = new_name.strip()
        if not clean_name:
            raise ValueError("New name cannot be empty.")
        if item_id in self.items:
            self.items[item_id].name = clean_name
            self._save_memory()
            return True
        return False

    def delete_item(self, item_id: str) -> bool:
        """Deletes an item and its associated crop images from disk."""
        if item_id not in self.items:
            return False

        item = self.items.pop(item_id)
        for s in item.samples:
            self._feature_cache.pop(s.sample_id, None)
            crop_path = self.crops_dir / s.crop_filename
            if crop_path.exists():
                try:
                    crop_path.unlink()
                except Exception as e:
                    logger.error("Failed to delete crop %s: %s", crop_path, str(e))

        self._save_memory()
        return True

    def delete_sample(self, item_id: str, sample_id: str) -> bool:
        """Deletes a single reference view of an item."""
        if item_id not in self.items:
            return False
        item = self.items[item_id]
        sample_to_remove = None
        for s in item.samples:
            if s.sample_id == sample_id:
                sample_to_remove = s
                break

        if not sample_to_remove:
            return False

        item.samples.remove(sample_to_remove)
        self._feature_cache.pop(sample_id, None)
        crop_path = self.crops_dir / sample_to_remove.crop_filename
        if crop_path.exists():
            try:
                crop_path.unlink()
            except Exception:
                pass

        # If no samples left, delete the item entirely
        if not item.samples:
            self.items.pop(item_id, None)

        self._save_memory()
        return True

    def get_items_summary(self) -> List[Dict]:
        """Returns structured JSON summary of all taught items."""
        summary = []
        for item in self.items.values():
            summary.append({
                "item_id": item.item_id,
                "name": item.name,
                "category": item.category,
                "created_at": item.created_at,
                "views_count": len(item.samples),
                "samples": [
                    {
                        "sample_id": s.sample_id,
                        "crop_url": f"/memory/crops/{s.sample_id}",
                        "box": s.box,
                        "created_at": s.created_at,
                        "keypoints_count": s.keypoints_count
                    }
                    for s in item.samples
                ]
            })
        return summary

    def match_frame(
        self,
        frame: np.ndarray,
        min_similarity: float = 0.45,
        target_width: int = 640
    ) -> Optional[VisualMatchResult]:
        """
        Compares live frame against taught reference samples.
        
        Optimisations:
        1. Downscales frame to target_width (e.g. 480px) and converts to grayscale 
           for ~2x faster SIFT feature extraction.
        2. Projects homography corners and rescales coordinates back to original frame dimensions.
        3. Tuned Lowe's ratio test (0.78) for high recall under rotation and tilt.
        4. Compares against all cached views across all taught items efficiently.
        """
        if not self._feature_cache or frame is None or frame.size == 0:
            return None

        orig_h, orig_w = frame.shape[:2]

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame

        # Downscale for fast inference while preserving aspect ratio
        if target_width and orig_w > target_width:
            scale_ratio = target_width / float(orig_w)
            scaled_w = target_width
            scaled_h = int(round(orig_h * scale_ratio))
            gray_proc = cv2.resize(gray, (scaled_w, scaled_h), interpolation=cv2.INTER_AREA)
            scale_x = orig_w / float(scaled_w)
            scale_y = orig_h / float(scaled_h)
        else:
            gray_proc = gray
            scaled_w, scaled_h = orig_w, orig_h
            scale_x = 1.0
            scale_y = 1.0

        # Extract SIFT features on preprocessed frame
        kp_live, des_live = self.sift.detectAndCompute(gray_proc, None)
        if des_live is None or len(kp_live) < 8:
            return None

        best_match: Optional[VisualMatchResult] = None
        highest_sim = 0.0

        for item_id, item in self.items.items():
            for sample in item.samples:
                cached = self._feature_cache.get(sample.sample_id)
                if not cached:
                    continue

                kp_ref, des_ref, (crop_h, crop_w) = cached
                if des_ref is None or len(des_ref) < 6:
                    continue

                try:
                    # k-Nearest Neighbors (k=2) matching
                    matches = self.bf_matcher.knnMatch(des_ref, des_live, k=2)

                    # Lowe's ratio test with 0.78 threshold for improved angle tolerance
                    good_matches = []
                    for m_pair in matches:
                        if len(m_pair) == 2:
                            m, n = m_pair
                            if m.distance < 0.78 * n.distance:
                                good_matches.append(m)

                    min_required = 8 if len(des_ref) >= 20 else 6
                    if len(good_matches) < min_required:
                        continue

                    # Extract coordinates in processed image space
                    src_pts = np.float32([kp_ref[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                    dst_pts = np.float32([kp_live[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                    # Compute Homography using RANSAC (5.0 px reprojection threshold)
                    M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
                    if M is None:
                        continue

                    inliers = int(np.sum(mask)) if mask is not None else 0
                    if inliers < min_required:
                        continue

                    # Project 4 corners of reference crop into processed frame space
                    corners = np.float32([[0, 0], [crop_w, 0], [crop_w, crop_h], [0, crop_h]]).reshape(-1, 1, 2)
                    projected = cv2.perspectiveTransform(corners, M)
                    poly_pts_proc = np.int32(projected).reshape(-1, 2)

                    # Geometric sanity checks
                    if not cv2.isContourConvex(poly_pts_proc):
                        continue

                    area = cv2.contourArea(poly_pts_proc)
                    proc_frame_area = scaled_w * scaled_h
                    # Must be between 0.8% and 92% of frame area
                    if area < (0.008 * proc_frame_area) or area > (0.92 * proc_frame_area):
                        continue

                    # Scale polygon back to original frame coordinates (e.g. 640x480)
                    poly_pts_orig = np.int32([
                        [int(round(pt[0] * scale_x)), int(round(pt[1] * scale_y))]
                        for pt in poly_pts_proc
                    ])

                    # Compute axis-aligned bounding box on original frame
                    bx, by, bw, bh = cv2.boundingRect(poly_pts_orig)

                    # Sanity check aspect ratio
                    if bw <= 0 or bh <= 0:
                        continue
                    aspect = float(bw) / float(bh)
                    if aspect < 0.12 or aspect > 8.0:
                        continue

                    # Clamp bounding box to frame boundaries
                    bx = max(0, min(bx, orig_w - 1))
                    by = max(0, min(by, orig_h - 1))
                    bw = max(10, min(bw, orig_w - bx))
                    bh = max(10, min(bh, orig_h - by))

                    # Calculate genuine geometric similarity score [0.0 to 1.0]
                    # Balances inlier consistency with descriptor coverage
                    inlier_ratio = float(inliers) / max(len(good_matches), 1)
                    ref_coverage = min(1.0, float(inliers) / max(len(des_ref) * 0.18, 8.0))
                    similarity = round(0.55 * inlier_ratio + 0.45 * ref_coverage, 3)

                    if similarity >= min_similarity and similarity > highest_sim:
                        highest_sim = similarity
                        best_match = VisualMatchResult(
                            item_id=item.item_id,
                            name=item.name,
                            category=item.category,
                            sample_id=sample.sample_id,
                            similarity=similarity,
                            inliers_count=inliers,
                            good_matches_count=len(good_matches),
                            bbox=[bx, by, bw, bh],
                            polygon=poly_pts_orig.tolist()
                        )

                except Exception as e:
                    logger.debug("Matching error for sample %s: %s", sample.sample_id, str(e))
                    continue

        return best_match

visual_memory = VisualMemoryEngine()
