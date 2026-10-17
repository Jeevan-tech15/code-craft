# Unlabelled Images Directory

Drop your raw, unlabelled campus waste images here (JPG, JPEG, PNG).

### Next Steps:
1. Collect 50-100 real images per category (plastic bottles, paper cups, food scraps, bins, litter).
2. Follow the instructions in `model_training/DATASET_ANNOTATION_GUIDE.md` to annotate them using **Roboflow** or **LabelImg**.
3. Export in **YOLOv8** format.
4. Run `python model_training/split_dataset.py` to automatically divide them into `images/train`, `images/val`, and `images/test`.
