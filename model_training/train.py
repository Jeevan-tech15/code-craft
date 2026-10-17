"""
EcoTwin AI — Environmental Vision Model Fine-Tuning Pipeline
Uses Ultralytics YOLOv8/v11 with pretrained weights to fine-tune on campus environmental classes.
Exports weights to camera_service/models/environmental_model.pt and .onnx.

Usage:
  python model_training/train.py --epochs 30 --batch 8 --device cpu
"""

import os
import sys
import shutil
import argparse
from pathlib import Path

def validate_dataset(workspace_root: Path, dataset_yaml: Path) -> dict:
    """
    Strictly validates dataset structure, label files, coordinates, and classes.
    Refuses to proceed if data is unlabelled or corrupted.
    """
    images_train = workspace_root / "model_training" / "dataset" / "images" / "train"
    labels_train = workspace_root / "model_training" / "dataset" / "labels" / "train"
    images_val = workspace_root / "model_training" / "dataset" / "images" / "val"
    labels_val = workspace_root / "model_training" / "dataset" / "labels" / "val"

    valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    train_imgs = [f for f in images_train.glob("*") if f.suffix.lower() in valid_exts] if images_train.exists() else []
    val_imgs = [f for f in images_val.glob("*") if f.suffix.lower() in valid_exts] if images_val.exists() else []

    if not train_imgs:
        return {
            "valid": False,
            "reason": f"No training images found in '{images_train}'.\n"
                      "Existing images are currently unlabelled. You must annotate them with bounding boxes first."
        }

    # Verify corresponding label files exist and have valid coordinates
    annotated_boxes = 0
    classes_found = set()
    unlabelled_imgs = []

    for img in train_imgs:
        label_file = labels_train / f"{img.stem}.txt"
        if not label_file.exists() or label_file.stat().st_size == 0:
            unlabelled_imgs.append(img.name)
            continue

        try:
            with open(label_file, "r") as f:
                lines = [line.strip() for line in f if line.strip()]
                if not lines:
                    unlabelled_imgs.append(img.name)
                    continue

                for line in lines:
                    parts = line.split()
                    if len(parts) != 5:
                        return {
                            "valid": False,
                            "reason": f"Invalid YOLO format in '{label_file.name}': line '{line}' does not have 5 elements."
                        }
                    cls_id = int(parts[0])
                    xc, yc, w, h = map(float, parts[1:])
                    if not (0 <= cls_id <= 4):
                        return {
                            "valid": False,
                            "reason": f"Class ID {cls_id} in '{label_file.name}' is outside the valid 0..4 range."
                        }
                    if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        return {
                            "valid": False,
                            "reason": f"Normalized coordinates in '{label_file.name}' are out of [0.0, 1.0] bounds."
                        }
                    classes_found.add(cls_id)
                    annotated_boxes += 1
        except Exception as e:
            return {
                "valid": False,
                "reason": f"Error parsing label file '{label_file.name}': {str(e)}"
            }

    if unlabelled_imgs:
        return {
            "valid": False,
            "reason": f"{len(unlabelled_imgs)} of {len(train_imgs)} images lack valid bounding box label files in '{labels_train}'.\n"
                      f"Example unlabelled files: {unlabelled_imgs[:3]}\n"
                      "Every image used for training must have a corresponding .txt label with object bounding boxes."
        }

    return {
        "valid": True,
        "train_count": len(train_imgs),
        "val_count": len(val_imgs),
        "total_boxes": annotated_boxes,
        "classes_found": sorted(list(classes_found))
    }

def train_model(epochs: int = 30, batch_size: int = 8, img_size: int = 640, device: str = "cpu", base_model: str = "yolov8n.pt"):
    workspace_root = Path(__file__).resolve().parent.parent
    dataset_yaml = workspace_root / "model_training" / "dataset" / "data.yaml"
    models_output_dir = workspace_root / "camera_service" / "models"
    models_output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("EcoTwin AI — Custom Environmental Waste Detector Fine-Tuning Pipeline")
    print("=" * 75)
    print(f"[*] Workspace Root: {workspace_root}")
    print(f"[*] Dataset Config: {dataset_yaml}")
    print(f"[*] Output Weights Directory: {models_output_dir}")

    # 1. Strict Dataset Validation
    print("\n[*] Validating dataset integrity and bounding box annotations...")
    validation = validate_dataset(workspace_root, dataset_yaml)

    if not validation["valid"]:
        print("\n" + "!" * 75)
        print("DATASET VALIDATION FAILED: CANNOT RUN TRAINING")
        print("!" * 75)
        print(f"Reason: {validation['reason']}")
        print("\nRequired Actions:")
        print("1. Your raw images must first be annotated with object bounding boxes.")
        print("2. Follow: model_training/DATASET_ANNOTATION_GUIDE.md to label them using Roboflow or LabelImg.")
        print("3. Export in YOLOv8 format (images/ and labels/ directories).")
        print("4. Run: python model_training/split_dataset.py --source <annotated_folder>")
        print("5. Re-run this training script after valid labels are in place.")
        print("=" * 75)
        return False

    print(f"[+] Dataset validation passed successfully!")
    print(f"    • Labelled Training Images: {validation['train_count']}")
    print(f"    • Labelled Validation Images: {validation['val_count']}")
    print(f"    • Total Bounding Boxes: {validation['total_boxes']}")
    print(f"    • Detected Class Indices: {validation['classes_found']}")

    # 2. Honest Dataset Size Warning
    if validation['train_count'] < 30:
        print("\n" + "-" * 75)
        print("[!] NOTICE ON DATASET SIZE & GENERALISATION:")
        print(f"    You have {validation['train_count']} training images.")
        print("    A small dataset allows verifying that training converges and weights export correctly.")
        print("    However, it CANNOT establish reliable real-world generalisation across unseen angles or lighting.")
        print("    For dependable live webcam detection, 40-80 images per class are recommended.")
        print("-" * 75)

    # 3. Check for ultralytics dependency
    try:
        from ultralytics import YOLO
    except ImportError:
        print("\n[!] Required package 'ultralytics' is not installed in your Python environment.")
        print("    Install it via: pip install ultralytics")
        return False

    # 4. Fine-tune model
    print(f"\n[*] Initializing pretrained base model '{base_model}'...")
    print(f"[*] Training parameters: Epochs={epochs}, Batch={batch_size}, ImgSize={img_size}, Device='{device}'")
    model = YOLO(base_model)

    results = model.train(
        data=str(dataset_yaml),
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        project=str(workspace_root / "model_training" / "runs"),
        name="ecotwin_detector",
        exist_ok=True,
        verbose=True
    )

    # 5. Save best PyTorch weights to camera_service/models/
    trained_pt = workspace_root / "model_training" / "runs" / "ecotwin_detector" / "weights" / "best.pt"
    target_pt = models_output_dir / "environmental_model.pt"

    if trained_pt.exists():
        shutil.copy2(trained_pt, target_pt)
        print(f"\n[+] Fine-tuned PyTorch weights saved to: {target_pt}")

        # 6. Export to ONNX for native OpenCV DNN inference (lightweight runtime)
        try:
            print("[*] Exporting model to ONNX format for native OpenCV DNN execution...")
            exported_path = model.export(format="onnx", imgsz=img_size)
            target_onnx = models_output_dir / "environmental_model.onnx"
            if Path(exported_path).exists():
                shutil.copy2(exported_path, target_onnx)
                print(f"[+] ONNX model successfully saved to: {target_onnx}")
        except Exception as e:
            print(f"[!] Warning: ONNX export encountered an error: {e}")

        # 7. Print actual training metrics
        print("\n" + "=" * 75)
        print("FINE-TUNING COMPLETED — ACTUAL METRICS MEASURED:")
        print("=" * 75)
        if hasattr(results, 'results_dict'):
            for k, v in results.results_dict.items():
                print(f"  • {k}: {v:.4f}" if isinstance(v, float) else f"  • {k}: {v}")

        print("\nNext Verification Steps:")
        print("1. Evaluate on unseen test images: python model_training/evaluate.py")
        print("2. Test live webcam detection:     python model_training/test_webcam.py")
        print("3. Launch Camera Admin Console:    python run_camera_admin.py")
        print("=" * 75)
        return True
    else:
        print("[!] Error: Trained weights file not found in training output.")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLO detector on environmental waste dataset")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="cpu", help="Compute device ('cpu' or '0' for CUDA GPU)")
    parser.add_argument("--base-model", type=str, default="yolov8n.pt", help="Pretrained YOLO base weights")
    args = parser.parse_args()

    train_model(
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        base_model=args.base_model
    )
