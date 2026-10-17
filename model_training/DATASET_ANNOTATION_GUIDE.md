# EcoTwin AI — Dataset Annotation & Preparation Guide

This guide provides the complete, step-by-step workflow for annotating campus waste images, creating the train/validation/test split, and training the custom object-detection model for live hackathon demonstration.

---

## 1. Environmental Class Taxonomy

The EcoTwin AI vision detector recognizes **5 distinct environmental classes**. When annotating, you **must use these exact class index numbers**:

| Class ID | Class Name | Description & Demonstration Examples |
|---|---|---|
| `0` | `plastic_waste` | Water bottles, soda bottles, plastic wrappers, plastic cups, straws, cutlery. |
| `1` | `paper_waste` | Paper sheets, notebook pages, cardboard cartons, napkins, crumpled paper balls. |
| `2` | `food_waste` | Fruit peels (banana, orange), apple cores, food containers with scraps, leftover snacks. |
| `3` | `overflowing_bins` | Waste bins with trash spilling over the rim or heaped above capacity. |
| `4` | `visible_litter` | General trash, wrappers, or debris discarded on floors, lawns, benches, or hallways. |

---

## 2. Choosing an Annotation Tool

### Option A: Roboflow (Recommended — Fast & Web-based)
1. Go to [https://roboflow.com](https://roboflow.com) (Free account).
2. Create a new project: **Object Detection**, Project Name: `EcoTwin-Waste`.
3. Add the 5 classes above in order:
   - `plastic_waste`
   - `paper_waste`
   - `food_waste`
   - `overflowing_bins`
   - `visible_litter`
4. Upload your images from `model_training/dataset/unlabelled/`.
5. Draw tight bounding boxes around waste items and assign the correct class.
   *Tip for Hackathon Demo: Annotate images where hands are holding a plastic bottle or paper cup toward the webcam to ensure high confidence during live presentation!*
6. Click **Generate Version** -> choose **Export Dataset** -> select **YOLOv8** -> download zip.
7. Unzip contents directly into `model_training/dataset/`.

---

### Option B: LabelImg (Local Offline Desktop Tool)
1. Install LabelImg:
   ```powershell
   pip install labelImg
   ```
2. Launch LabelImg:
   ```powershell
   labelImg
   ```
3. In LabelImg:
   - Click **Open Dir** -> select `model_training/dataset/unlabelled`.
   - Click **Change Save Dir** -> select `model_training/dataset/unlabelled`.
   - Change format from `PascalVOC` to **`YOLO`** (toggle in left toolbar).
   - Press `W` to draw a rectangle around an object.
   - Enter one of the 5 class names: `plastic_waste`, `paper_waste`, `food_waste`, `overflowing_bins`, `visible_litter`.
   - Press `Ctrl + S` to save (creates `<imagename>.txt`).
   - Press `D` for next image.

---

## 3. YOLO Label Format Specification

Each annotated image produces a corresponding `.txt` file with the identical base filename (e.g. `bottle_01.jpg` -> `bottle_01.txt`).
Each line in the file represents one bounding box:
```
<class_id> <x_center> <y_center> <width> <height>
```
All coordinates are normalized floats between `0.0` and `1.0`:
- `<class_id>`: Integer from `0` to `4` (0=plastic_waste, 1=paper_waste, 2=food_waste, 3=overflowing_bins, 4=visible_litter).
- `<x_center>`: Center X position divided by image width.
- `<y_center>`: Center Y position divided by image height.
- `<width>`: Box width divided by image width.
- `<height>`: Box height divided by image height.

*Example `bottle_01.txt`:*
```
0 0.5234 0.6120 0.2450 0.4810
```

---

## 4. Automatic Dataset Splitting (70% Train, 20% Val, 10% Test)

Once you have annotated your images, run the automatic dataset splitter:

```powershell
python model_training/split_dataset.py --source model_training/dataset/unlabelled --output model_training/dataset
```

This will automatically create:
```
model_training/dataset/
├── data.yaml
├── images/
│   ├── train/  (70% of images)
│   ├── val/    (20% of images)
│   └── test/   (10% of images - reserved for unseen evaluation)
└── labels/
    ├── train/
    ├── val/
    └── test/
```

---

## 5. Next Step: Fine-Tuning the Pretrained Model

Once the images are split into `images/train` and `images/val`, proceed to training:

```powershell
python model_training/train.py --epochs 30 --batch 8 --device cpu
```
*(Use `--device 0` if you have an NVIDIA GPU, or `--device cpu` on standard laptops).*

See `model_training/train.py` for full configuration details.
