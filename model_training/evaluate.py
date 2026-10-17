"""
EcoTwin AI — Unseen Test Dataset Evaluation Script
Evaluates fine-tuned environmental model on reserved test images.
Reports true mAP50, mAP50-95, precision, and recall per class.

Usage:
  python model_training/evaluate.py
"""

import os
import sys
import argparse
from pathlib import Path

def evaluate_model(model_path: str = None, dataset_yaml: str = None):
    workspace_root = Path(__file__).resolve().parent.parent
    models_dir = workspace_root / "camera_service" / "models"
    
    if model_path is None:
        pt_path = models_dir / "environmental_model.pt"
        onnx_path = models_dir / "environmental_model.onnx"
        if pt_path.exists():
            model_path = str(pt_path)
        elif onnx_path.exists():
            model_path = str(onnx_path)
        else:
            print("=" * 70)
            print("EcoTwin AI — Model Evaluation Report")
            print("=" * 70)
            print("\n[!] EVALUATION CANNOT RUN: No trained model weights found in:")
            print(f"    {models_dir}")
            print("\n[!] TRUTHFUL OPERATION NOTICE:")
            print("    Model status: MODEL NOT TRAINED")
            print("    EcoTwin AI does not fabricate evaluation metrics, confusion matrices, or mAP scores.")
            print("    Follow model_training/DATASET_ANNOTATION_GUIDE.md to train the model first.")
            print("=" * 70)
            return False

    if dataset_yaml is None:
        dataset_yaml = str(workspace_root / "model_training" / "dataset" / "data.yaml")

    test_dir = workspace_root / "model_training" / "dataset" / "images" / "test"
    valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    test_images = [f for f in test_dir.glob("*") if f.suffix.lower() in valid_exts] if test_dir.exists() else []

    if not test_images:
        print("=" * 70)
        print("EcoTwin AI — Model Evaluation Report")
        print("=" * 70)
        print("\n[!] No test images found in:")
        print(f"    {test_dir}")
        print("\n[*] Reserve 10% of your annotated images in images/test to compute unbiased test metrics.")
        print("=" * 70)
        return False

    print("=" * 70)
    print("EcoTwin AI — Running Evaluation on Unseen Test Dataset")
    print("=" * 70)
    print(f"[*] Evaluating model: {model_path}")
    print(f"[*] Number of unseen test images: {len(test_images)}")

    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        metrics = model.val(
            data=dataset_yaml,
            split="test",
            project=str(workspace_root / "model_training" / "runs"),
            name="evaluation",
            exist_ok=True
        )

        print("\n" + "=" * 70)
        print("EVALUATION RESULTS (UNSEEN TEST SPLIT)")
        print("=" * 70)
        print(f"  mAP@50:      {metrics.box.map50:.4f}")
        print(f"  mAP@50-95:   {metrics.box.map:.4f}")
        print(f"  Precision:   {metrics.box.mp:.4f}")
        print(f"  Recall:      {metrics.box.mr:.4f}")
        print("=" * 70)
        return True

    except ImportError:
        print("[!] Required library 'ultralytics' is not installed to compute validation metrics.")
        print("    Install it via: pip install ultralytics")
        return False
    except Exception as e:
        print(f"[!] Evaluation failed: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned detector on unseen test images")
    parser.add_argument("--model", type=str, default=None, help="Path to trained model (.pt or .onnx)")
    parser.add_argument("--data", type=str, default=None, help="Path to data.yaml")
    args = parser.parse_args()

    evaluate_model(args.model, args.data)
