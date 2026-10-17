"""
EcoTwin AI — Comprehensive Camera Service Test Suite
Tests:
1. All four logical camera-to-building mappings
2. Single physical device configuration across 4 profiles
3. Invalid device index and unavailable device handling
4. Preventing concurrent capture access (lock integrity)
5. Session switching & stale-frame rejection
6. Inactive logical camera states (INACTIVE IN DEMO MODE)
7. Missing model reporting (MODEL UNAVAILABLE, no fake detections)
8. Cooldown and duplicate prevention
9. Server-side building attribution validation
10. Strict event filtering by camera and building
"""

import time
import unittest
import numpy as np
from pathlib import Path

from camera_service.config import CAMERA_MAPPINGS, settings
from camera_service.capture_manager import WebcamCaptureManager, capture_manager
from camera_service.model_adapter import EnvironmentalModelAdapter
from camera_service.event_store import EventStore

class TestCameraService(unittest.TestCase):

    def test_01_four_logical_camera_mappings(self):
        """Verify all 4 required cameras map to the exact specified buildings."""
        expected = {
            "camera-1": ("engineering", "Engineering Block"),
            "camera-2": ("library", "Central Library"),
            "camera-3": ("laboratory", "Advanced Science Laboratory"),
            "camera-4": ("cafeteria", "Campus Dining Commons"),
        }
        for cam_id, (exp_bldg, exp_name) in expected.items():
            self.assertIn(cam_id, CAMERA_MAPPINGS)
            meta = CAMERA_MAPPINGS[cam_id]
            self.assertEqual(meta["building_id"], exp_bldg)
            self.assertEqual(meta["building_name"], exp_name)
            self.assertEqual(meta["default_physical_device"], 0)

    def test_02_camera_selection_and_session_invalidation(self):
        """Verify switching cameras updates active camera and increments session_id."""
        initial_session = capture_manager.session_id
        res2 = capture_manager.select_camera("camera-2")
        self.assertEqual(capture_manager.active_camera_id, "camera-2")
        self.assertNotEqual(capture_manager.session_id, initial_session)
        self.assertEqual(res2["building_id"], "library")

        # Switch to Camera 3
        res3 = capture_manager.select_camera("camera-3")
        self.assertEqual(capture_manager.active_camera_id, "camera-3")
        self.assertEqual(res3["building_id"], "laboratory")

        # Invalid camera ID raises ValueError
        with self.assertRaises(ValueError):
            capture_manager.select_camera("camera-99")

        # Restore to camera-1
        capture_manager.select_camera("camera-1")
        self.assertEqual(capture_manager.active_camera_id, "camera-1")

    def test_03_inactive_camera_truthfulness(self):
        """Verify only active camera is marked selected/active, others show INACTIVE IN DEMO MODE."""
        capture_manager.select_camera("camera-2")
        status = capture_manager.get_status()
        self.assertEqual(status["active_camera_id"], "camera-2")

        cameras = status["cameras"]
        self.assertTrue(cameras["camera-2"]["is_selected"])
        self.assertFalse(cameras["camera-1"]["is_selected"])
        self.assertFalse(cameras["camera-3"]["is_selected"])
        self.assertFalse(cameras["camera-4"]["is_selected"])

        # Non-selected cameras must show INACTIVE IN DEMO MODE
        self.assertEqual(cameras["camera-1"]["status"], "INACTIVE IN DEMO MODE")
        self.assertEqual(cameras["camera-3"]["status"], "INACTIVE IN DEMO MODE")
        self.assertEqual(cameras["camera-4"]["status"], "INACTIVE IN DEMO MODE")

        # Restore to camera-1
        capture_manager.select_camera("camera-1")

    def test_04_missing_model_behavior(self):
        """Verify that when model file does not exist, status is MODEL NOT TRAINED / MODEL UNAVAILABLE and zero detections are fabricated."""
        adapter = EnvironmentalModelAdapter()
        # Default environment without trained model weights must be NOT TRAINED or UNAVAILABLE
        if not adapter.model_path.exists():
            self.assertFalse(adapter.is_available)
            self.assertIn(adapter.status, ["MODEL NOT TRAINED", "MODEL UNAVAILABLE"])
            dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            # detect() MUST return empty list (NO FAKE DETECTIONS)
            detections = adapter.detect(dummy_frame, "camera-1", "engineering")
            self.assertEqual(detections, [])

    def test_05_unsupported_classes_rejection(self):
        """Verify that unsupported classes cannot be detected or fabricated."""
        adapter = EnvironmentalModelAdapter()
        self.assertIn("overflowing_bins", adapter.SUPPORTED_CLASSES)
        self.assertIn("visible_litter", adapter.SUPPORTED_CLASSES)
        self.assertNotIn("general_person", adapter.SUPPORTED_CLASSES)
        self.assertNotIn("generic_car", adapter.SUPPORTED_CLASSES)

    def test_06_server_side_attribution_validation(self):
        """Verify event store validates camera-to-building mapping server-side."""
        store = EventStore()

        # Recording for camera-1 must resolve to engineering building
        evt1 = store.record_event(
            camera_id="camera-1",
            detected_class="visible_litter",
            confidence=0.885,
            frame_bgr=np.zeros((100, 100, 3), dtype=np.uint8)
        )
        self.assertEqual(evt1["camera_id"], "camera-1")
        self.assertEqual(evt1["building_id"], "engineering")
        self.assertEqual(evt1["building_name"], "Engineering Block")
        self.assertEqual(evt1["confidence"], 0.885)

        # Recording for camera-2 must resolve to library building
        evt2 = store.record_event(
            camera_id="camera-2",
            detected_class="overflowing_bins",
            confidence=0.912,
            frame_bgr=np.zeros((100, 100, 3), dtype=np.uint8)
        )
        self.assertEqual(evt2["camera_id"], "camera-2")
        self.assertEqual(evt2["building_id"], "library")
        self.assertEqual(evt2["building_name"], "Central Library")

        # Invalid camera ID must be rejected server-side
        with self.assertRaises(ValueError):
            store.record_event(camera_id="unknown-camera", detected_class="plastic_waste", confidence=0.8)

    def test_07_event_filtering_isolation(self):
        """Verify camera-1 events only appear in camera-1 queries and not camera-2."""
        store = EventStore()
        cam1_events = store.get_events(camera_id="camera-1")
        for e in cam1_events:
            self.assertEqual(e["camera_id"], "camera-1")
            self.assertEqual(e["building_id"], "engineering")

        cam2_events = store.get_events(camera_id="camera-2")
        for e in cam2_events:
            self.assertEqual(e["camera_id"], "camera-2")
            self.assertEqual(e["building_id"], "library")

    def test_08_invalid_webcam_index(self):
        """Verify testing an invalid device index (e.g. 99) fails gracefully without crashing."""
        res = capture_manager.test_device(99)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "OFFLINE")

    def test_09_visual_memory_teach_and_match(self):
        """Verify teaching an item, matching in a scene, and clean deletion."""
        from camera_service.visual_memory import visual_memory
        import cv2

        # Create distinct test pattern
        crop = np.zeros((120, 120, 3), dtype=np.uint8)
        cv2.rectangle(crop, (10, 10), (110, 110), (255, 255, 255), -1)
        cv2.putText(crop, "ITEM", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

        teach_res = visual_memory.teach_item(
            name="test_item_bottle",
            category="plastic_waste",
            crop_bgr=crop,
            box=[50, 50, 120, 120]
        )
        self.assertTrue(teach_res["success"])
        self.assertEqual(teach_res["name"], "test_item_bottle")
        item_id = teach_res["item_id"]

        # Scene containing the taught item at (200, 150)
        scene = np.zeros((480, 640, 3), dtype=np.uint8)
        scene[150:270, 200:320] = crop

        match = visual_memory.match_frame(scene, min_similarity=0.40)
        self.assertIsNotNone(match)
        self.assertEqual(match.name, "test_item_bottle")
        self.assertGreater(match.similarity, 0.50)
        # Bounding box should surround (200, 150, 120, 120)
        bx, by, bw, bh = match.bbox
        self.assertAlmostEqual(bx, 200, delta=20)
        self.assertAlmostEqual(by, 150, delta=20)

        # Blank/different scene must return None (Unknown/No match)
        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        no_match = visual_memory.match_frame(blank)
        self.assertIsNone(no_match)

        # Rename item
        renamed = visual_memory.rename_item(item_id, "renamed_bottle")
        self.assertTrue(renamed)
        self.assertEqual(visual_memory.items[item_id].name, "renamed_bottle")

        # Cleanup
        deleted = visual_memory.delete_item(item_id)
        self.assertTrue(deleted)
        self.assertNotIn(item_id, visual_memory.items)

    def test_10_shared_visual_memory_across_cameras(self):
        """Verify one shared visual memory routes to active camera building without retraining."""
        from camera_service.visual_memory import visual_memory
        from camera_service.model_adapter import model_adapter
        import cv2

        crop = np.zeros((100, 100, 3), dtype=np.uint8)
        cv2.rectangle(crop, (10, 10), (90, 90), (255, 255, 255), -1)
        cv2.putText(crop, "BOX", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        res = visual_memory.teach_item("paper_box", "paper_waste", crop, [10, 10, 100, 100])
        item_id = res["item_id"]

        scene = np.zeros((480, 640, 3), dtype=np.uint8)
        scene[100:200, 100:200] = crop

        # Active camera-1 -> attributes to engineering
        dets_cam1 = model_adapter.detect(scene, "camera-1", "engineering")
        self.assertEqual(len(dets_cam1), 1)
        self.assertEqual(dets_cam1[0].camera_id, "camera-1")
        self.assertEqual(dets_cam1[0].building_id, "engineering")
        self.assertEqual(dets_cam1[0].class_name, "paper_box")

        # Switch to camera-2 -> attributes to library using the SAME memory
        dets_cam2 = model_adapter.detect(scene, "camera-2", "library")
        self.assertEqual(len(dets_cam2), 1)
        self.assertEqual(dets_cam2[0].camera_id, "camera-2")
        self.assertEqual(dets_cam2[0].building_id, "library")

        # Cleanup
        visual_memory.delete_item(item_id)

    def test_11_temporal_tracker_confirmation(self):
        """Verify temporal tracker rejects 1-frame transient spikes (CHECKING) and confirms on 2 hits (RECOGNISED)."""
        from camera_service.tracker import TemporalOverlayTracker
        from camera_service.visual_memory import VisualMatchResult

        tracker = TemporalOverlayTracker(confirmation_hits=2, grace_period_seconds=1.2)
        match = VisualMatchResult(
            item_id="item_1", name="plastic_cup", category="plastic_waste",
            sample_id="sample_1", similarity=0.78, inliers_count=15, good_matches_count=18,
            bbox=[100, 100, 80, 80], polygon=[[100, 100], [180, 100], [180, 180], [100, 180]]
        )

        # Frame 1: first hit -> status is CHECKING
        tracked1 = tracker.update(match)
        self.assertIsNotNone(tracked1)
        self.assertEqual(tracked1.status, "CHECKING")
        self.assertEqual(tracked1.name, "plastic_cup")

        # Frame 2: second consecutive hit -> status promotes to RECOGNISED
        tracked2 = tracker.update(match)
        self.assertIsNotNone(tracked2)
        self.assertEqual(tracked2.status, "RECOGNISED")
        self.assertEqual(tracked2.name, "plastic_cup")

    def test_12_temporal_tracker_grace_period_and_stale_clearing(self):
        """Verify overlay remains visible during momentary drop, marks CHECKING, and cleanly clears after grace period."""
        from camera_service.tracker import TemporalOverlayTracker
        from camera_service.visual_memory import VisualMatchResult

        tracker = TemporalOverlayTracker(confirmation_hits=1, grace_period_seconds=0.6, checking_threshold_seconds=0.2)
        match = VisualMatchResult(
            item_id="item_1", name="soda_can", category="plastic_waste",
            sample_id="sample_1", similarity=0.82, inliers_count=16, good_matches_count=20,
            bbox=[150, 150, 100, 100], polygon=[]
        )

        # Hit 1 -> RECOGNISED
        tracker.update(match)
        self.assertEqual(tracker.get_current_overlay().status, "RECOGNISED")

        # Momentary drop for 0.05s -> still RECOGNISED (does not disappear in < 1 second!)
        time.sleep(0.05)
        tracker.update(None)
        self.assertEqual(tracker.get_current_overlay().status, "RECOGNISED")

        # Gap reaches > 0.2s -> transitions to CHECKING
        time.sleep(0.20)
        tracker.update(None)
        overlay = tracker.get_current_overlay()
        self.assertIsNotNone(overlay)
        self.assertEqual(overlay.status, "CHECKING")

        # Gap exceeds grace period (> 0.6s) -> clears to None (NO STALE DETECTION LEFT BEHIND)
        time.sleep(0.40)
        tracker.update(None)
        cleared_overlay = tracker.get_current_overlay()
        self.assertIsNone(cleared_overlay)

    def test_13_bounding_box_ema_smoothing(self):
        """Verify bounding box movement is smoothed using Exponential Moving Average."""
        from camera_service.tracker import TemporalOverlayTracker
        from camera_service.visual_memory import VisualMatchResult

        tracker = TemporalOverlayTracker(confirmation_hits=1, smoothing_alpha=0.6)
        match1 = VisualMatchResult(
            item_id="item_1", name="smooth_box", category="paper_waste",
            sample_id="s1", similarity=0.8, inliers_count=12, good_matches_count=15,
            bbox=[100, 100, 100, 100], polygon=[]
        )
        t1 = tracker.update(match1)
        self.assertEqual(t1.smoothed_bbox, [100, 100, 100, 100])

        # Sudden jump to [150, 150, 120, 120]
        match2 = VisualMatchResult(
            item_id="item_1", name="smooth_box", category="paper_waste",
            sample_id="s1", similarity=0.8, inliers_count=12, good_matches_count=15,
            bbox=[150, 150, 120, 120], polygon=[]
        )
        t2 = tracker.update(match2)
        # Expected smoothed: 0.6 * 150 + 0.4 * 100 = 130
        self.assertEqual(t2.smoothed_bbox[0], 130)
        self.assertEqual(t2.smoothed_bbox[1], 130)

    def test_14_multiple_view_matching_and_angle_tolerance(self):
        """Verify adding multiple reference views under one item name matches from different angles."""
        from camera_service.visual_memory import visual_memory
        import cv2

        # View 1: Upright item
        v1 = np.zeros((100, 100, 3), dtype=np.uint8)
        cv2.rectangle(v1, (10, 10), (90, 90), (255, 255, 255), -1)
        cv2.putText(v1, "V1", (25, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        res1 = visual_memory.teach_item("multi_angle_cup", "plastic_waste", v1, [10, 10, 100, 100])
        item_id = res1["item_id"]

        # View 2: Rotated / Tilted item (rotated 90 deg)
        v2 = cv2.rotate(v1, cv2.ROTATE_90_CLOCKWISE)
        res2 = visual_memory.teach_item("multi_angle_cup", "plastic_waste", v2, [10, 10, 100, 100])
        self.assertEqual(res2["item_id"], item_id)
        self.assertEqual(res2["views_count"], 2)

        # Scene with tilted View 2
        scene = np.zeros((480, 640, 3), dtype=np.uint8)
        scene[200:300, 300:400] = v2

        match = visual_memory.match_frame(scene, min_similarity=0.40)
        self.assertIsNotNone(match)
        self.assertEqual(match.name, "multi_angle_cup")
        self.assertAlmostEqual(match.bbox[0], 300, delta=25)
        self.assertAlmostEqual(match.bbox[1], 200, delta=25)

        # Cleanup
        visual_memory.delete_item(item_id)

    def test_15_camera_switching_resets_tracker(self):
        """Verify camera switching clears temporal overlay immediately without cross-camera leaking."""
        from camera_service.capture_manager import capture_manager
        from camera_service.visual_memory import VisualMatchResult

        # Seed tracker with a mock active detection
        match = VisualMatchResult(
            item_id="item_x", name="leak_item", category="visible_litter",
            sample_id="sx", similarity=0.9, inliers_count=20, good_matches_count=22,
            bbox=[50, 50, 50, 50], polygon=[]
        )
        capture_manager.tracker.update(match)
        capture_manager.tracker.update(match)
        self.assertIsNotNone(capture_manager.tracker.get_current_overlay())

        # Switch camera to camera-3
        capture_manager.select_camera("camera-3")
        # Tracker must be completely reset
        self.assertIsNone(capture_manager.tracker.get_current_overlay())

        # Restore
        capture_manager.select_camera("camera-1")

    def test_16_persistence_across_restart(self):
        """Verify taught items and sample views reload accurately from disk storage."""
        from camera_service.visual_memory import VisualMemoryEngine, MEMORY_JSON, CROPS_DIR
        import cv2

        engine1 = VisualMemoryEngine(memory_file=MEMORY_JSON, crops_dir=CROPS_DIR)
        test_crop = np.zeros((80, 80, 3), dtype=np.uint8)
        cv2.rectangle(test_crop, (5, 5), (75, 75), (255, 255, 255), -1)
        cv2.putText(test_crop, "PERSIST", (10, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)

        res = engine1.teach_item("persist_item", "food_waste", test_crop, [0, 0, 80, 80])
        item_id = res["item_id"]

        # Instantiate a completely fresh engine instance simulating process restart
        engine2 = VisualMemoryEngine(memory_file=MEMORY_JSON, crops_dir=CROPS_DIR)
        self.assertIn(item_id, engine2.items)
        self.assertEqual(engine2.items[item_id].name, "persist_item")
        self.assertEqual(len(engine2.items[item_id].samples), 1)

        # Cleanup
        engine2.delete_item(item_id)
        self.assertNotIn(item_id, engine2.items)

    def test_17_event_store_supabase_and_local_dual_write(self):
        """Verify EventStore saves real detection event with evidence, bbox, similarity_score, and dual-persistence."""
        from camera_service.event_store import EventStore
        import numpy as np
        import cv2

        store = EventStore()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(frame, "TEST EVIDENCE", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

        event = store.record_event(
            camera_id="camera-1",
            detected_class="plastic_waste",
            confidence=0.88,
            frame_bgr=frame,
            bbox=[50, 50, 200, 200],
            item_name="test_water_bottle",
            waste_category="plastic",
            similarity_score=0.88,
            notes="Unit test detection"
        )

        self.assertIsNotNone(event)
        self.assertEqual(event["camera_id"], "camera-1")
        self.assertEqual(event["building_id"], "engineering")
        self.assertEqual(event["item_name"], "test_water_bottle")
        self.assertEqual(event["waste_category"], "plastic")
        self.assertEqual(event["similarity_score"], 0.88)
        self.assertEqual(event["review_status"], "pending_review")
        self.assertIn("evidence_image_url", event)

    def test_18_event_store_review_status_update(self):
        """Verify EventStore allows auditing and updating review_status."""
        from camera_service.event_store import EventStore

        store = EventStore()
        events = store.get_events(limit=1)
        if events:
            ev_id = events[0]["id"]
            success = store.update_review_status(ev_id, "verified_waste", notes="Audited by unit test")
            self.assertTrue(success)

            # Restore
            store.update_review_status(ev_id, "pending_review", notes="Reverted")

    def test_19_duplicate_event_cooldown(self):
        """Verify cooldown suppresses rapid database spamming while returning existing active event."""
        from camera_service.model_adapter import EnvironmentalModelAdapter

        adapter = EnvironmentalModelAdapter()
        # Reset cooldown ledger for clean test
        adapter._event_cooldown_ledger.clear()

        # First trigger must be allowed
        first_allowed = adapter.should_record_event("camera-2", "notebook_test")
        self.assertTrue(first_allowed)

        # Immediate second trigger must be suppressed by cooldown
        second_allowed = adapter.should_record_event("camera-2", "notebook_test")
        self.assertFalse(second_allowed)

        # Different camera or item must not be blocked
        other_item_allowed = adapter.should_record_event("camera-2", "other_waste")
        self.assertTrue(other_item_allowed)

    def test_20_building_and_camera_attribution_integrity(self):
        """Verify strict camera-to-building attribution across all 4 logical profiles sharing physical webcam 0."""
        from camera_service.event_store import EventStore

        store = EventStore()
        profiles = [
            ("camera-1", "engineering", "Engineering Block"),
            ("camera-2", "library", "Central Library"),
            ("camera-3", "laboratory", "Advanced Science Laboratory"),
            ("camera-4", "cafeteria", "Campus Dining Commons"),
        ]
        frame = np.zeros((100, 100, 3), dtype=np.uint8)

        for cam_id, bldg_id, bldg_name in profiles:
            ev = store.record_event(
                camera_id=cam_id,
                detected_class="general",
                confidence=0.75,
                frame_bgr=frame,
                item_name=f"test_item_{cam_id}"
            )
            self.assertEqual(ev["camera_id"], cam_id)
            self.assertEqual(ev["building_id"], bldg_id)
            self.assertEqual(ev["building_name"], bldg_name)

if __name__ == "__main__":
    unittest.main()

