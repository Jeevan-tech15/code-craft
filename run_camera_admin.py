"""
EcoTwin AI — Application 1 Launcher
Standalone Camera Admin Panel & Vision Monitoring Service
Runs independently on port 8000: http://127.0.0.1:8000/
"""

import os
import sys
import uvicorn
from camera_service.config import settings

def main():
    print("=" * 70)
    print("EcoTwin AI — APPLICATION 1: STANDALONE CAMERA ADMIN PANEL")
    print("=" * 70)
    print("• Hardware: Single Shared Physical Webcam (Windows DirectShow)")
    print("• Mapped Logical Camera Profiles:")
    print("  1. Camera 1 -> Engineering Block (engineering)")
    print("  2. Camera 2 -> Central Library (library)")
    print("  3. Camera 3 -> Advanced Science Laboratory (laboratory)")
    print("  4. Camera 4 -> Campus Dining Commons (cafeteria)")
    print(f"• Launching standalone admin interface at: http://{settings.HOST}:{settings.PORT}/")
    print("=" * 70)

    uvicorn.run("camera_service.main:app", host=settings.HOST, port=settings.PORT, reload=False)

if __name__ == "__main__":
    main()
