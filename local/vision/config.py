"""
Configuration module for LockInDubs vision system.
Handles all configuration parameters and environment variables.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for the vision system."""
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
    
    # Camera Configuration
    CAMERA_INDEX = int(os.getenv('CAMERA_INDEX', '0'))
    FRAME_RATE = int(os.getenv('FRAME_RATE', '20'))
    CONSECUTIVE_FRAMES_THRESHOLD = int(os.getenv('CONSECUTIVE_FRAMES_THRESHOLD', '10'))
    
    # Debug Configuration
    DEBUG_MODE = os.getenv('DEBUG_MODE', 'true').lower() == 'true'
    SHOW_VIDEO_FEED = os.getenv('SHOW_VIDEO_FEED', 'true').lower() == 'true'
    SAVE_DEBUG_FRAMES = os.getenv('SAVE_DEBUG_FRAMES', 'false').lower() == 'true'
    
    # IPC Configuration
    IPC_PORT = int(os.getenv('IPC_PORT', '5555'))
    
    # Focus Detection Parameters
    EYE_ASPECT_RATIO_THRESHOLD = 0.25  # Threshold for eye closure detection
    HEAD_POSE_THRESHOLD = 30  # Degrees - threshold for head turning away
    GAZE_DEVIATION_THRESHOLD = 0.3  # Threshold for gaze direction deviation
    
    # MediaPipe Configuration
    MIN_DETECTION_CONFIDENCE = 0.7
    MIN_TRACKING_CONFIDENCE = 0.5
