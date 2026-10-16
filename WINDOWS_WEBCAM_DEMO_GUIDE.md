# EcoTwin AI — Two-Application Architecture & Live Demonstration Guide
## Standalone Camera Admin Console + Main Campus Sustainability Dashboard

> **CRITICAL ARCHITECTURE DISCLOSURE**:
> EcoTwin AI consists of **TWO SEPARATE APPLICATIONS** connected through a shared Supabase backend and resilient event ledger:
> 
> 1. **Application 1 — Standalone Camera Admin Console** (Port `8000`):
>    A standalone local application that connects to the laptop's physical webcam, manages four logical camera profiles, runs AI object-detection inference, displays live video with real bounding boxes, and securely persists genuine detection events to Supabase.
> 
> 2. **Application 2 — Main EcoTwin AI Website** (Port `3000` / `3001`):
>    The approved campus sustainability command center. It **never embeds camera panels or live feeds**. Instead, it reads real persisted events, evidence snapshots, and computed sustainability analytics from Supabase.
> 
> **Single Physical Webcam in Demo Mode**:
> We have **ONE physical laptop or USB webcam** (DirectShow index `0` on Windows). All four logical camera profiles share this device sequentially. Only the actively selected camera captures and runs inference. Inactive cameras truthfully display `INACTIVE IN DEMO MODE`. Never pretend four physical cameras are running simultaneously.

---

## 1. System Specifications & Pre-Demo Verification

- **Operating System**: Windows 10 / 11 (64-bit)
- **Webcam**: Built-in laptop webcam or external USB webcam (Default DirectShow index: `0`)
- **Python**: Python 3.10+ (tested on Python 3.11)
- **Node.js**: Node 18+ or 20+
- **Backend**: Supabase (`https://ccuqmxgpfvzgwyfsagif.supabase.co`)

### Direct Hardware Webcam Check (Windows PowerShell)
Before launching any application, verify Windows camera access:
```powershell
python -c "import cv2; cap = cv2.VideoCapture(0, cv2.CAP_DSHOW); print('Webcam Index 0 Ready:', cap.isOpened()); cap.release() if cap.isOpened() else None"
```
If output is `Webcam Index 0 Ready: True`, your webcam is operational.

---

## 2. Launching the Two Separate Applications

Open **two independent PowerShell terminals** on your Windows laptop:

### Terminal 1 — Application 1: Standalone Camera Admin Console
```powershell
cd "c:\Users\jvnai\Code Craft Hackathon"
python run_camera_admin.py
```
- **Console Interface**: Open your browser to `http://127.0.0.1:8000/` (or `http://127.0.0.1:8000/admin`)
- **Live Stream**: `http://127.0.0.1:8000/stream`
- **Health / Status API**: `http://127.0.0.1:8000/status`

### Terminal 2 — Application 2: Main EcoTwin AI Sustainability Dashboard
```powershell
cd "c:\Users\jvnai\Code Craft Hackathon"
npm run dev
```
- **Main Dashboard**: Open your browser to `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

---

## 3. The 4 Logical Camera Profiles & Building Mappings

Each of the four camera panels in Application 1 has a strict, immutable server-resolved building identity:

| Logical Camera | Campus Building | Building ID | Campus Sector / Zone |
|---|---|---|---|
| **Camera 1** | **Engineering Block** | `engineering` | North Rooftop & Prototyping Lab |
| **Camera 2** | **Central Library** | `library` | Basement Hydronic Loop & Restrooms |
| **Camera 3** | **Advanced Science Laboratory** | `laboratory` | West Wet Lab & Cleanroom Sector |
| **Camera 4** | **Campus Dining Commons** | `cafeteria` | South Kitchen & Bio-Digester Hub |

---

## 4. Truthful AI Model & Training Pipeline

### Current State: `MODEL NOT TRAINED`
In a clean repository without custom trained weights, Application 1 truthfully reports:
- Model Status: **`MODEL NOT TRAINED`** (or **`MODEL UNAVAILABLE`**)
- Webcam Stream: Displays live video with demo watermark, but **strictly produces ZERO fake detections**.
- Alerts & Reports: Displays clean, professional empty states when no genuine events exist.

### How to Train the Model on Unlabelled Images
If you have unlabelled images of campus waste (plastic bottles, paper cups, food scraps):
1. **Annotate Images**:
   Follow `model_training/DATASET_ANNOTATION_GUIDE.md` using **Roboflow** or **LabelImg** for the 5 classes:
   - `0: plastic_waste`
   - `1: paper_waste`
   - `2: food_waste`
   - `3: overflowing_bins`
   - `4: visible_litter`
2. **Split Dataset (70/20/10)**:
   ```powershell
   python model_training/split_dataset.py --source model_training/dataset/unlabelled
   ```
3. **Run Training**:
   ```powershell
   python model_training/train.py --epochs 30 --batch 8 --device cpu
   ```
   *Automatically exports trained weights to `camera_service/models/environmental_model.onnx` and `camera_service/models/environmental_model.pt`.*
4. **Evaluate on Unseen Test Split**:
   ```powershell
   python model_training/evaluate.py
   ```
5. **Interactive Hardware Pre-Test**:
   ```powershell
   python model_training/test_webcam.py --device 0 --threshold 0.50
   ```

---

## 5. Step-by-Step Pre-Demo Checklist

Complete this checklist 15 minutes before your hackathon presentation:

- [ ] **Windows Camera Privacy**: Confirm Windows Settings → Privacy & Security → Camera → *"Let desktop apps access your camera"* is ON.
- [ ] **Release Other Camera Apps**: Ensure Zoom, Teams, Skype, or the Windows Camera app are completely closed.
- [ ] **Run Automated Test Suite**:
  ```powershell
  python -m unittest camera_service/test_service.py
  npx tsc --noEmit
  ```
  *(Verify all 8 Python unit tests pass and Next.js TypeScript passes with 0 errors).*
- [ ] **Terminal 1 Running**: `python run_camera_admin.py` is active on port `8000`.
- [ ] **Terminal 2 Running**: `npm run dev` is active on port `3000`.
- [ ] **Physical Waste Objects Ready**: Have a clean plastic water bottle, a piece of paper or cup, and food waste/peel ready at the demo desk.

---

## 6. Official Repeatable Demonstration Script for Judges

Follow this exact flow during your live presentation:

### Phase A: Reveal the Two-Application Architecture (30 Seconds)
1. Show your browser with **two separate browser windows side by side**:
   - **Left Window**: Application 1 — Standalone Camera Admin Console (`http://127.0.0.1:8000/admin`)
   - **Right Window**: Application 2 — EcoTwin AI Main Website (`http://localhost:3000`)
2. Explain the architecture clearly:
   > *"Judges, EcoTwin AI separates physical camera monitoring from public sustainability intelligence. On the left is our standalone camera-monitoring console running locally on port 8000. On the right is the campus sustainability portal. Notice that the main website contains zero embedded camera feeds or admin controls — it strictly consumes persisted events from Supabase."*

### Phase B: Highlight Single-Webcam Transparency (30 Seconds)
1. Point out the disclosure banner and badges on Application 1:
   > *"We have only ONE physical webcam on this laptop. We demonstrate our four campus cameras in shared demo mode. Notice that Camera 1 is currently selected, while Cameras 2, 3, and 4 truthfully state `INACTIVE IN DEMO MODE`."*
2. Emphasize model truthfulness:
   > *"If no trained weights are loaded, the system displays `MODEL NOT TRAINED`. We never fake bounding boxes or simulate confidence percentages."*

### Phase C: Live AI Inference & Object Detection (60 Seconds)
1. In Application 1, click **"Start Monitoring"** on **Camera 1 — Engineering Block**.
2. Physically hold a **plastic bottle** in front of your laptop webcam.
3. The model processes the live frame:
   - Green bounding box appears around the plastic bottle.
   - Badge displays `PLASTIC_WASTE` and actual model confidence (e.g. `87%`).
   - The verified event appears in the **Attributed Detection Events Ledger** on the right with unique ID `EVT-CAMERA-1-...`, timestamp, and evidence snapshot.
4. Explain deduplication:
   > *"Notice our 20-second cooldown per class prevents duplicate alert spam while the object remains in the frame."*

### Phase D: Safe Camera Switching & In-Flight Frame Protection (30 Seconds)
1. In Application 1, click **Camera 2 — Central Library**.
2. Point out:
   - Camera 1 immediately transitions to `INACTIVE IN DEMO MODE`.
   - Camera 2 becomes active.
   - The **Session ID** immediately updates, discarding any in-flight frames from Camera 1 to prevent cross-building misattribution.
3. Hold up a piece of **paper waste** to Camera 2:
   - The event is attributed strictly to **Central Library**.

### Phase E: Verify End-to-End Persistence on Main Website (60 Seconds)
1. Switch your focus to the **Right Window (Application 2 — Main Website)**:
2. Open **"Environmental Alerts"**:
   - The genuine `PLASTIC_WASTE` event from Engineering Block and `PAPER_WASTE` event from Central Library appear with exact timestamps and confidence.
3. Click the alert to view the **genuine evidence capture image** captured directly by the webcam during inference.
4. Open **"Buildings"** → click **Engineering Block**:
   - Building incident history reflects the persisted event.
   - Central Library incident history reflects its own distinct event.
5. Reload the main website page:
   - Confirm all events and statistics persist from Supabase without data loss.

---

## 7. Troubleshooting & FAQ

| Symptom | Probable Cause | Immediate Fix |
|---|---|---|
| `Webcam status: OFFLINE` | Another app has locked webcam index 0. | Close Zoom, Teams, Chrome camera tabs, or Windows Camera app. Run `python -c "import cv2; cv2.VideoCapture(0, cv2.CAP_DSHOW).release()"` |
| `MODEL NOT TRAINED` | No `.onnx` or `.pt` file in `camera_service/models/`. | Expected when model has not been trained yet. Stream functions as live preview without fake detections. Follow Section 4 to train weights. |
| `Port 8000 already in use` | Background uvicorn process still running. | Run `powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force"` |
| `Supabase Event Upload Warning` | Network disconnected or missing service role key. | Events are always preserved in the local resilient ledger (`camera_service/data/events.json`) and synced once network reconnects. |
