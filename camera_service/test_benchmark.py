"""
Benchmark and profiling script for SIFT feature extraction, image preprocessing,
and matching efficiency across resolutions.
"""

import time
import cv2
import numpy as np

def run_benchmark():
    print("=== ECOTWIN AI SIFT & MATCHING PERFORMANCE PROFILE ===")
    
    # Create realistic test scene with textured objects
    np.random.seed(42)
    h, w = 480, 640
    frame_bgr = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Add textured background & shapes
    for i in range(15):
        cx, cy = np.random.randint(50, w-50), np.random.randint(50, h-50)
        radius = np.random.randint(20, 60)
        color = [int(c) for c in np.random.randint(50, 255, size=3)]
        cv2.circle(frame_bgr, (cx, cy), radius, color, -1)
        cv2.putText(frame_bgr, f"OBJ-{i}", (cx-20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    # Reference crop (e.g. 120x120)
    crop_bgr = frame_bgr[150:270, 200:320].copy()
    
    sift = cv2.SIFT_create(nfeatures=1000)
    
    # Pre-extract reference features (simulating visual memory caching)
    crop_gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    t0 = time.perf_counter()
    kp_ref, des_ref = sift.detectAndCompute(crop_gray, None)
    ref_time = (time.perf_counter() - t0) * 1000
    print(f"Reference Crop Keypoints: {len(kp_ref)}, Cache Extraction Time: {ref_time:.2f} ms")

    # Profile 1: Full 640x480 BGR extraction
    times_bgr = []
    for _ in range(20):
        t0 = time.perf_counter()
        kp, des = sift.detectAndCompute(frame_bgr, None)
        times_bgr.append((time.perf_counter() - t0) * 1000)
    avg_bgr = np.mean(times_bgr[5:])
    print(f"1. Full 640x480 BGR Frame: {avg_bgr:.2f} ms ({len(kp)} keypoints)")

    # Profile 2: Full 640x480 Grayscale extraction
    times_gray = []
    for _ in range(20):
        t0 = time.perf_counter()
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        kp, des = sift.detectAndCompute(gray, None)
        times_gray.append((time.perf_counter() - t0) * 1000)
    avg_gray = np.mean(times_gray[5:])
    print(f"2. Full 640x480 Grayscale Frame: {avg_gray:.2f} ms ({len(kp)} keypoints)")

    # Profile 3: Resized Grayscale (480x360)
    times_480 = []
    for _ in range(20):
        t0 = time.perf_counter()
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (480, 360), interpolation=cv2.INTER_AREA)
        kp, des = sift.detectAndCompute(resized, None)
        times_480.append((time.perf_counter() - t0) * 1000)
    avg_480 = np.mean(times_480[5:])
    print(f"3. Resized 480x360 Grayscale Frame: {avg_480:.2f} ms ({len(kp)} keypoints)")

    # Profile 4: Resized Grayscale (400x300)
    times_400 = []
    for _ in range(20):
        t0 = time.perf_counter()
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (400, 300), interpolation=cv2.INTER_AREA)
        kp, des = sift.detectAndCompute(resized, None)
        times_400.append((time.perf_counter() - t0) * 1000)
    avg_400 = np.mean(times_400[5:])
    print(f"4. Resized 400x300 Grayscale Frame: {avg_400:.2f} ms ({len(kp)} keypoints)")

    # Profile 5: Matching and Homography on 480x360 vs 640x480
    bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)
    
    # Match on 480x360
    gray_480 = cv2.resize(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY), (480, 360))
    kp_live, des_live = sift.detectAndCompute(gray_480, None)
    
    t0 = time.perf_counter()
    matches = bf.knnMatch(des_ref, des_live, k=2)
    good = [m for m, n in matches if m.distance < 0.78 * n.distance]
    if len(good) >= 8:
        src_pts = np.float32([kp_ref[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp_live[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
    match_time = (time.perf_counter() - t0) * 1000
    print(f"5. BFMatcher KNN + RANSAC Homography: {match_time:.2f} ms ({len(good)} good matches)")
    
    speedup = avg_bgr / (avg_480 + match_time)
    print(f"Total Inference Speedup (Resized 480x360 + Grayscale): {speedup:.1f}x faster!")

if __name__ == "__main__":
    run_benchmark()
