"""
OpenCV-only focus detection module for LockInDubs.
Alternative implementation that doesn't require MediaPipe.
Uses OpenCV's built-in Haar cascades and DNN face detection.
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any
from config import Config

class FocusDetectorOpenCV:
    """Handles focus detection using only OpenCV (no MediaPipe dependency)."""
    
    def __init__(self):
        """Initialize the focus detector with OpenCV models."""
        # Load Haar cascade for face detection
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Load DNN face detection model (more accurate)
        self.net = None
        self.load_dnn_model()
        
        # Focus detection parameters
        self.face_center_history = []
        self.eye_center_history = []
        self.max_history = 10
        
        print("OpenCV-only focus detector initialized")
    
    def load_dnn_model(self):
        """Load the DNN face detection model."""
        try:
            # Download the model files if they don't exist
            # These are lightweight models that work well for face detection
            model_url = "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/opencv_face_detector_uint8.pb"
            config_url = "https://github.com/opencv/opencv_extra/raw/master/testdata/dnn/opencv_face_detector.pbtxt"
            
            # For now, we'll use the simpler Haar cascade approach
            # In production, you could download the DNN model files
            print("Using Haar cascade face detection (DNN model not loaded)")
            
        except Exception as e:
            print(f"Could not load DNN model: {e}")
            print("Falling back to Haar cascade detection")
    
    def detect_faces_haar(self, frame: np.ndarray) -> list:
        """
        Detect faces using Haar cascade.
        
        Args:
            frame: Input frame
            
        Returns:
            List of face rectangles
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        return faces
    
    def detect_eyes_haar(self, frame: np.ndarray, face_rect: tuple) -> list:
        """
        Detect eyes within a face region using Haar cascade.
        
        Args:
            frame: Input frame
            face_rect: Face rectangle (x, y, w, h)
            
        Returns:
            List of eye rectangles
        """
        x, y, w, h = face_rect
        face_roi = frame[y:y+h, x:x+w]
        gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        eyes = self.eye_cascade.detectMultiScale(
            gray_roi,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(10, 10)
        )
        
        # Convert eye coordinates back to full frame coordinates
        eyes_full_frame = []
        for (ex, ey, ew, eh) in eyes:
            eyes_full_frame.append((x + ex, y + ey, ew, eh))
        
        return eyes_full_frame
    
    def calculate_eye_aspect_ratio_simple(self, eye_rect: tuple) -> float:
        """
        Calculate a simple eye aspect ratio from eye rectangle.
        
        Args:
            eye_rect: Eye rectangle (x, y, w, h)
            
        Returns:
            Simple aspect ratio
        """
        x, y, w, h = eye_rect
        if h == 0:
            return 0.0
        
        # Simple aspect ratio: width / height
        # When eyes are closed, height becomes very small, ratio becomes large
        aspect_ratio = w / h
        return aspect_ratio
    
    def calculate_face_center(self, face_rect: tuple) -> tuple:
        """
        Calculate the center point of a face rectangle.
        
        Args:
            face_rect: Face rectangle (x, y, w, h)
            
        Returns:
            Center point (cx, cy)
        """
        x, y, w, h = face_rect
        cx = x + w // 2
        cy = y + h // 2
        return (cx, cy)
    
    def calculate_eye_center(self, eye_rect: tuple) -> tuple:
        """
        Calculate the center point of an eye rectangle.
        
        Args:
            eye_rect: Eye rectangle (x, y, w, h)
            
        Returns:
            Center point (cx, cy)
        """
        x, y, w, h = eye_rect
        cx = x + w // 2
        cy = y + h // 2
        return (cx, cy)
    
    def is_face_stable(self, current_center: tuple) -> bool:
        """
        Check if face position is stable (not moving too much).
        
        Args:
            current_center: Current face center
            
        Returns:
            True if face is stable
        """
        if len(self.face_center_history) < 3:
            return True
        
        # Calculate movement from average position
        avg_x = sum(pos[0] for pos in self.face_center_history) / len(self.face_center_history)
        avg_y = sum(pos[1] for pos in self.face_center_history) / len(self.face_center_history)
        
        movement = np.sqrt((current_center[0] - avg_x)**2 + (current_center[1] - avg_y)**2)
        
        # If movement is less than 20 pixels, consider it stable
        return movement < 20
    
    def is_eyes_open(self, eyes: list) -> bool:
        """
        Check if eyes are open based on eye detection and aspect ratios.
        
        Args:
            eyes: List of eye rectangles
            
        Returns:
            True if eyes appear to be open
        """
        if len(eyes) < 2:
            return False
        
        # Calculate aspect ratios for detected eyes
        aspect_ratios = []
        for eye in eyes:
            aspect_ratio = self.calculate_eye_aspect_ratio_simple(eye)
            aspect_ratios.append(aspect_ratio)
        
        # Average aspect ratio
        avg_aspect_ratio = sum(aspect_ratios) / len(aspect_ratios)
        
        # If aspect ratio is too high, eyes might be closed
        # (closed eyes have very small height, making w/h ratio large)
        return avg_aspect_ratio < 3.0  # Adjust threshold as needed
    
    def is_face_facing_camera(self, face_rect: tuple, eyes: list) -> bool:
        """
        Check if face is facing the camera (not turned away).
        
        Args:
            face_rect: Face rectangle
            eyes: List of eye rectangles
            
        Returns:
            True if face appears to be facing camera
        """
        if len(eyes) < 2:
            return False
        
        # Calculate eye centers
        eye_centers = [self.calculate_eye_center(eye) for eye in eyes]
        
        # Check if both eyes are roughly at the same height
        # (when face is turned away, one eye might be much higher/lower)
        if len(eye_centers) >= 2:
            y_diff = abs(eye_centers[0][1] - eye_centers[1][1])
            face_height = face_rect[3]
            
            # If eyes are at very different heights relative to face size, face might be turned
            return y_diff < face_height * 0.3
    
    def isUserFocused(self, frame: np.ndarray) -> Tuple[bool, Dict[str, Any]]:
        """
        Main function to determine if user is focused using OpenCV only.
        
        Args:
            frame: Input video frame (BGR format)
            
        Returns:
            Tuple of (is_focused, context_data)
        """
        context_data = {
            'face_detected': False,
            'eyes_detected': False,
            'face_stable': False,
            'eyes_open': False,
            'face_facing_camera': False,
            'confidence': 0.0,
            'face_rect': None,
            'eye_rects': []
        }
        
        # Detect faces
        faces = self.detect_faces_haar(frame)
        
        if len(faces) == 0:
            # No face detected
            return False, context_data
        
        # Use the largest face (closest to camera)
        face_rect = max(faces, key=lambda x: x[2] * x[3])  # Largest by area
        context_data['face_detected'] = True
        context_data['face_rect'] = face_rect
        
        # Calculate face center and update history
        face_center = self.calculate_face_center(face_rect)
        self.face_center_history.append(face_center)
        if len(self.face_center_history) > self.max_history:
            self.face_center_history.pop(0)
        
        # Check if face is stable
        face_stable = self.is_face_stable(face_center)
        context_data['face_stable'] = face_stable
        
        # Detect eyes within the face
        eyes = self.detect_eyes_haar(frame, face_rect)
        context_data['eye_rects'] = eyes
        
        if len(eyes) >= 2:
            context_data['eyes_detected'] = True
            
            # Check if eyes are open
            eyes_open = self.is_eyes_open(eyes)
            context_data['eyes_open'] = eyes_open
            
            # Check if face is facing camera
            face_facing = self.is_face_facing_camera(face_rect, eyes)
            context_data['face_facing_camera'] = face_facing
            
            # Calculate confidence based on multiple factors
            confidence = 0.0
            if face_stable:
                confidence += 0.3
            if eyes_open:
                confidence += 0.4
            if face_facing:
                confidence += 0.3
            
            context_data['confidence'] = confidence
            
            # User is focused if all conditions are met
            is_focused = face_stable and eyes_open and face_facing
            return is_focused, context_data
        
        else:
            # Eyes not detected - likely not focused
            context_data['confidence'] = 0.1 if face_stable else 0.0
            return False, context_data
    
    def draw_debug_info(self, frame: np.ndarray, is_focused: bool, context: Dict[str, Any]) -> np.ndarray:
        """
        Draw debug information on the frame for visualization.
        
        Args:
            frame: Input frame
            is_focused: Current focus state
            context: Context data from focus detection
            
        Returns:
            Frame with debug information drawn
        """
        debug_frame = frame.copy()
        
        # Draw focus status
        status_color = (0, 255, 0) if is_focused else (0, 0, 255)
        status_text = "FOCUSED" if is_focused else "DISTRACTED"
        cv2.putText(debug_frame, status_text, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
        
        # Draw face rectangle
        if context.get('face_rect') is not None:
            x, y, w, h = context['face_rect']
            cv2.rectangle(debug_frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(debug_frame, "Face", (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        # Draw eye rectangles
        for i, eye in enumerate(context.get('eye_rects', [])):
            x, y, w, h = eye
            cv2.rectangle(debug_frame, (x, y), (x+w, y+h), (0, 255, 255), 1)
            cv2.putText(debug_frame, f"Eye {i+1}", (x, y-5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 255), 1)
        
        # Draw metrics
        y_offset = 70
        metrics = [
            f"Face Detected: {context.get('face_detected', False)}",
            f"Eyes Detected: {context.get('eyes_detected', False)}",
            f"Face Stable: {context.get('face_stable', False)}",
            f"Eyes Open: {context.get('eyes_open', False)}",
            f"Facing Camera: {context.get('face_facing_camera', False)}",
            f"Confidence: {context.get('confidence', 0.0):.3f}"
        ]
        
        for metric in metrics:
            cv2.putText(debug_frame, metric, (10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_offset += 20
        
        return debug_frame
