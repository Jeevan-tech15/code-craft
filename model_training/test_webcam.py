"""
EcoTwin AI — Interactive Hardware & AI Inference Live Test Script
Tests the physical laptop webcam (Index 0, DirectShow) with real model predictions.
Renders bounding boxes, class labels, and confidence values in real time.

Usage:
  python model_training/test_webcam.py --device 0 --threshold 0.50
"""

import os
import sys
import time
import argparse
from pathlib import Path
import cv2
import numpy as np

SUPPORTED_CLASSES = [
    "plastic_waste",
    "paper_waste",
    "food_waste",
    "overflowing_bins",
    "visible_litter",
]

CLASS_COLORS = {
    "plastic_waste": (255, 120, 0),     # Cyan-Blue
    "paper_waste": (0, 200, 255),       # Amber-Yellow
    "food_waste": (0, 165, 255),        # Orange
    "overflowing_bins": (0, 0, 255),    # Red
    "visible_litter": (180, 0, 255),    # Purple
}

def run_webcam_test(device_index: int = 0, conf_threshold: float = 0.50):
    workspace_root = Path(__file__).resolve().parent.parent
    models_dir = workspace_root / "camera_service" / "models"
    pt_path = models_dir / "environmental_model.pt"
    onnx_path = models_dir / "environmental_model.onnx"

    print("=" * 70)
    print("EcoTwin AI — Live Physical Webcam & Inference Test")
    print("=" * 70)

    # 1. Model Status
    model_mode = None
    net = None
    yolo_model = None

    if onnx_path.exists():
        print(f"[*] Found ONNX model weights: {onnx_path}")
        net = cv2.dnn.readNetFromONNX(str(onnx_path))
        model_mode = "ONNX"
        print("[+] Loaded OpenCV DNN ONNX inference engine.")
    elif pt_path.exists():
        print(f"[*] Found PyTorch weights: {pt_path}")
        try:
            from ultralytics import YOLO
            yolo_model = YOLO(str(pt_path))
            model_mode = "YOLO"
            print("[+] Loaded Ultralytics YOLO inference engine.")
        except ImportError:
            print("[!] PyTorch weights found but ultralytics not installed.")
            print("    Run: pip install ultralytics")
    else:
        print("\n[!] STATUS: MODEL NOT TRAINED")
        print(f"    No model weights found in {models_dir}")
        print("    Webcam preview will run in HARDWARE-ONLY test mode (no simulated detections).")
        print("    Train a real model by following: model_training/DATASET_ANNOTATION_GUIDE.md")

    # 2. Open Physical Camera with DirectShow
    print(f"\n[*] Opening physical webcam device index {device_index} (DirectShow backend)...")
    cap = cv2.VideoCapture(device_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"[!] Error: Could not open camera at index {device_index}.")
        print("    Check Windows Camera Privacy settings and ensure no other application is using the webcam.")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("\n[+] Webcam successfully opened!")
    print("    Press 'q' or 'ESC' on the video window to exit.")
    print("    Present objects (plastic bottle, paper, food) directly in front of the lens.")
    print("=" * 70)

    fps_time = time.time()
    frame_count = 0
    fps = 0.0

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            time.sleep(0.01)
            continue

        frame_count += 1
        now = time.time()
        if (now - fps_time) >= 1.0:
            fps = frame_count / (now - fps_time)
            fps_time = now
            frame_count = 0

        img_h, img_w = frame.shape[:2]
        display_frame = frame.copy()
        detections_found = []

        # 3. Real Model Inference
        if model_mode == "ONNX" and net is not None:
            blob = cv2.dnn.blobFromImage(frame, 1 / 255.0, (640, 640), swapRB=True, crop=False)
            net.setInput(blob)
            layer_outputs = net.forward()
            if len(layer_outputs.shape) == 3:
                predictions = layer_outputs[0].T
                boxes, confidences, class_ids = [], [], []
                x_factor = img_w / 640.0
                y_factor = img_h / 640.0

                for pred in predictions:
                    scores = pred[4:]
                    class_id = int(np.argmax(scores))
                    conf = float(scores[class_id])
                    if conf >= conf_threshold and class_id < len(SUPPORTED_CLASSES):
                        xc, yc, w, h = pred[0:4]
                        left = int((xc - 0.5 * w) * x_factor)
                        top = int((yc - 0.5 * h) * y_factor)
                        width = int(w * x_factor)
                        height = int(h * y_factor)
                        boxes.append([left, top, width, height])
                        confidences.append(conf)
                        class_ids.append(class_id)

                if boxes:
                    indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_threshold, 0.45)
                    if len(indices) > 0:
                        for idx in indices.flatten():
                            cid = class_ids[idx]
                            cname = SUPPORTED_CLASSES[cid]
                            cconf = confidences[idx]
                            cbox = boxes[idx]
                            detections_found.append((cname, cconf, cbox))

        elif model_mode == "YOLO" and yolo_model is not None:
            results = yolo_model.predict(source=frame, conf=conf_threshold, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_idx = int(box.cls[0])
                    conf = float(box.conf[0])
                    if cls_idx < len(SUPPORTED_CLASSES):
                        cname = SUPPORTED_CLASSES[cls_idx]
                        xc, yc, w, h = box.xywh[0].cpu().numpy()
                        left = max(0, int(xc - w / 2))
                        top = max(0, int(yc - h / 2))
                        detections_found.append((cname, conf, [left, top, int(w), int(h)]))

        # 4. Draw Real Bounding Boxes
        for cname, conf, bbox in detections_found:
            bx, by, bw, bh = bbox
            color = CLASS_COLORS.get(cname, (0, 255, 0))
            cv2.rectangle(display_frame, (bx, by), (bx + bw, by + bh), color, 2)
            label = f"{cname.upper()} {int(conf * 100)}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(display_frame, (bx, max(0, by - th - 8)), (bx + tw + 8, max(th + 8, by)), color, -1)
            cv2.putText(display_frame, label, (bx + 4, max(th, by - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (10, 20, 10), 1, cv2.LINE_AA)

        # 5. Header HUD
        cv2.rectangle(display_frame, (0, 0), (img_w, 42), (20, 25, 30), -1)
        mode_str = f"MODEL: {model_mode}" if model_mode else "MODEL NOT TRAINED (HARDWARE PREVIEW)"
        cv2.putText(display_frame, f"EcoTwin AI Live Test | {mode_str} | FPS: {fps:.1f}", (14, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 180) if model_mode else (200, 200, 200), 1, cv2.LINE_AA)

        cv2.imshow("EcoTwin AI — Live Webcam Demonstration Test", display_frame)
        key = cv2.waitKey(1) & 0xFF
        if key in [ord('q'), 27]: # 'q' or ESC
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n[*] Webcam test closed successfully.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live webcam inference test")
    parser.add_argument("--device", type=int, default=0, help="Camera device index")
    parser.add_argument("--threshold", type=float, default=0.50, help="Confidence threshold")
    args = parser.parse_args()

    run_webcam_test(device_index=args.device, conf_threshold=args.threshold)
