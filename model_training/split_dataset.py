"""
EcoTwin AI — Dataset Splitter
Splits annotated images and YOLO label files into:
- 70% Train
- 20% Validation
- 10% Test

Usage:
  python model_training/split_dataset.py --source ./raw_annotated --output ./model_training/dataset
"""

import os
import sys
import shutil
import random
import argparse
from pathlib import Path

def setup_directories(base_dir: Path):
    dirs = [
        base_dir / "images" / "train",
        base_dir / "images" / "val",
        base_dir / "images" / "test",
        base_dir / "labels" / "train",
        base_dir / "labels" / "val",
        base_dir / "labels" / "test",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    return dirs

def split_dataset(source_dir: Path, output_dir: Path, train_ratio=0.7, val_ratio=0.2, seed=42):
    random.seed(seed)
    setup_directories(output_dir)

    # Find all images
    valid_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    image_files = [
        f for f in source_dir.rglob("*")
        if f.suffix.lower() in valid_extensions and not f.name.startswith(".")
    ]

    if not image_files:
        print(f"[!] No image files found in {source_dir}.")
        print("    Place your annotated images and .txt label files in a folder and re-run:")
        print("    python model_training/split_dataset.py --source <folder>")
        return False

    # Match each image with its label file (.txt)
    paired = []
    missing_labels = 0
    for img in image_files:
        label_file = img.with_suffix(".txt")
        if label_file.exists():
            paired.append((img, label_file))
        else:
            missing_labels += 1

    print(f"[*] Found {len(image_files)} images total.")
    print(f"[*] Paired {len(paired)} images with corresponding YOLO .txt labels.")
    if missing_labels > 0:
        print(f"[*] Warning: {missing_labels} images had no corresponding .txt label and were excluded.")

    if not paired:
        print("[!] No paired images and labels found to split.")
        return False

    random.shuffle(paired)
    total = len(paired)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)

    splits = {
        "train": paired[:train_end],
        "val": paired[train_end:val_end],
        "test": paired[val_end:]
    }

    for split_name, items in splits.items():
        img_dest = output_dir / "images" / split_name
        lbl_dest = output_dir / "labels" / split_name
        for img_path, lbl_path in items:
            shutil.copy2(img_path, img_dest / img_path.name)
            shutil.copy2(lbl_path, lbl_dest / lbl_path.name)
        print(f"[*] {split_name.upper()}: {len(items)} images -> {img_dest}")

    print("\n[+] Dataset split completed successfully!")
    print(f"    Train: {len(splits['train'])} | Val: {len(splits['val'])} | Test: {len(splits['test'])}")
    print(f"    Ready to train: python model_training/train.py")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split annotated images into YOLO train/val/test")
    parser.add_argument("--source", type=str, default="./model_training/dataset/unlabelled",
                        help="Path containing annotated images and .txt label files")
    parser.add_argument("--output", type=str, default="./model_training/dataset",
                        help="Target dataset root directory")
    parser.add_argument("--train-ratio", type=float, default=0.7)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    output_path = Path(args.output).resolve()
    split_dataset(source_path, output_path, args.train_ratio, args.val_ratio)
