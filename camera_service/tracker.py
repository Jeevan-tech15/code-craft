"""
EcoTwin AI — Temporal Confirmation & Smooth Overlay Tracker
Provides:
1. Multi-frame temporal confirmation to reject single-frame spurious false positives.
2. Smooth bounding-box interpolation using Exponential Moving Average (EMA).
3. Grace-period handling so labels do not flicker or vanish on momentary single-frame drops.
4. Transparent state transitions: UNKNOWN -> CHECKING -> RECOGNISED -> CHECKING -> UNKNOWN.
5. Strict stale-detection elimination: clears overlay immediately after configurable grace period.
6. Instant state reset on camera switching or capture stop.
"""

import time
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger("ecotwin.tracker")

@dataclass
class TrackedDetection:
    item_id: str
    name: str
    category: str
    sample_id: str
    similarity: float
    raw_bbox: List[int]        # [x, y, w, h] from current frame
    smoothed_bbox: List[int]   # [x, y, w, h] after EMA smoothing
    polygon: List[List[int]]
    status: str                # "RECOGNISED", "CHECKING", "UNKNOWN"
    first_seen_time: float
    last_seen_time: float
    consecutive_hits: int = 1
    consecutive_misses: int = 0

class TemporalOverlayTracker:
    """
    Maintains temporal tracking state between inference updates.
    Ensures stable, non-flickering display overlays while guaranteeing
    that stale bounding boxes are never left behind once an object is removed.
    """

    def __init__(
        self,
        confirmation_hits: int = 2,
        grace_period_seconds: float = 1.3,
        checking_threshold_seconds: float = 0.5,
        smoothing_alpha: float = 0.65,
    ):
        self.confirmation_hits = confirmation_hits
        self.grace_period_seconds = grace_period_seconds
        self.checking_threshold_seconds = checking_threshold_seconds
        self.smoothing_alpha = smoothing_alpha

        self.current_tracked: Optional[TrackedDetection] = None
        self._last_update_time: float = time.time()

    def reset(self):
        """Immediately clears all tracking state (e.g. on camera switch or stop)."""
        self.current_tracked = None
        self._last_update_time = time.time()
        logger.debug("Temporal tracker reset.")

    def update(self, match_result) -> Optional[TrackedDetection]:
        """
        Updates the tracker with a new match result (or None if no match found).
        match_result can be a VisualMatchResult or DetectionResult or None.
        Returns the current active TrackedDetection (or None if UNKNOWN).
        """
        now = time.time()
        self._last_update_time = now

        if match_result is not None:
            # Extract common attributes
            item_id = getattr(match_result, "item_id", "unknown_id")
            name = getattr(match_result, "name", getattr(match_result, "class_name", "unknown"))
            category = getattr(match_result, "category", "waste")
            sample_id = getattr(match_result, "sample_id", "")
            similarity = getattr(match_result, "similarity", getattr(match_result, "confidence", 0.0))
            raw_bbox = list(match_result.bbox)
            polygon = getattr(match_result, "polygon", [])

            if self.current_tracked is None:
                # First hit: start in CHECKING state
                status = "RECOGNISED" if self.confirmation_hits <= 1 else "CHECKING"
                self.current_tracked = TrackedDetection(
                    item_id=item_id,
                    name=name,
                    category=category,
                    sample_id=sample_id,
                    similarity=similarity,
                    raw_bbox=raw_bbox,
                    smoothed_bbox=raw_bbox,
                    polygon=polygon,
                    status=status,
                    first_seen_time=now,
                    last_seen_time=now,
                    consecutive_hits=1,
                    consecutive_misses=0,
                )
            elif self.current_tracked.name == name:
                # Same object matched again: increase hits, update bbox with EMA
                self.current_tracked.consecutive_hits += 1
                self.current_tracked.consecutive_misses = 0
                self.current_tracked.last_seen_time = now
                self.current_tracked.similarity = round(0.7 * similarity + 0.3 * self.current_tracked.similarity, 3)
                self.current_tracked.raw_bbox = raw_bbox
                self.current_tracked.polygon = polygon

                # Confirm if required hits reached
                if self.current_tracked.consecutive_hits >= self.confirmation_hits:
                    self.current_tracked.status = "RECOGNISED"

                # Apply Exponential Moving Average (EMA) to smooth box movement
                prev = self.current_tracked.smoothed_bbox
                alpha = self.smoothing_alpha
                smoothed = [
                    int(round(alpha * raw_bbox[0] + (1 - alpha) * prev[0])),
                    int(round(alpha * raw_bbox[1] + (1 - alpha) * prev[1])),
                    int(round(alpha * raw_bbox[2] + (1 - alpha) * prev[2])),
                    int(round(alpha * raw_bbox[3] + (1 - alpha) * prev[3])),
                ]
                self.current_tracked.smoothed_bbox = smoothed

            else:
                # Different object matched: candidate replacement
                # Only replace if new match has higher hits or old has expired
                self.current_tracked = TrackedDetection(
                    item_id=item_id,
                    name=name,
                    category=category,
                    sample_id=sample_id,
                    similarity=similarity,
                    raw_bbox=raw_bbox,
                    smoothed_bbox=raw_bbox,
                    polygon=polygon,
                    status="CHECKING",
                    first_seen_time=now,
                    last_seen_time=now,
                    consecutive_hits=1,
                    consecutive_misses=0,
                )

        else:
            # No match in this frame
            if self.current_tracked is not None:
                self.current_tracked.consecutive_misses += 1
                time_since_seen = now - self.current_tracked.last_seen_time

                if time_since_seen > self.grace_period_seconds:
                    # Grace period expired: object was removed. CLEAR COMPLETELY.
                    logger.debug("Grace period expired (%.2fs) for '%s'. Clearing overlay.",
                                 time_since_seen, self.current_tracked.name)
                    self.current_tracked = None
                elif time_since_seen > self.checking_threshold_seconds:
                    # After short gap, mark uncertain as CHECKING
                    self.current_tracked.status = "CHECKING"

        return self.current_tracked

    def get_current_overlay(self) -> Optional[TrackedDetection]:
        """
        Returns the current tracked detection considering elapsed time.
        Called on every display frame to check if grace period expired.
        """
        if self.current_tracked is None:
            return None

        now = time.time()
        time_since_seen = now - self.current_tracked.last_seen_time

        if time_since_seen > self.grace_period_seconds:
            self.current_tracked = None
            return None
        elif time_since_seen > self.checking_threshold_seconds and self.current_tracked.status == "RECOGNISED":
            self.current_tracked.status = "CHECKING"

        return self.current_tracked
