"""
Focus detection module for LockInDubs.
Implements the core isUserFocused() function using OpenCV and MediaPipe.
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Tuple, Dict, Any
from config import Config

class FocusDetector:
    """Handles focus detection using computer vision techniques."""
    
    def __init__(self):
        """Initialize the focus detector with MediaPipe models."""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize MediaPipe models
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=Config.MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=Config.MIN_TRACKING_CONFIDENCE
        )
        
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=Config.MIN_DETECTION_CONFIDENCE
        )
        
        # Eye landmark indices for MediaPipe face mesh
        self.LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        self.RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
        # Nose tip and chin indices for head pose estimation
        self.NOSE_TIP = 1
        self.CHIN = 152
        
    def calculate_eye_aspect_ratio(self, eye_landmarks: np.ndarray) -> float:
        """
        Calculate the Eye Aspect Ratio (EAR) for blink detection.
        
        Args:
            eye_landmarks: Array of eye landmark coordinates
            
        Returns:
            Eye aspect ratio value
        """
        # Calculate vertical eye distances
        vertical_1 = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        vertical_2 = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        
        # Calculate horizontal eye distance
        horizontal = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        # Calculate EAR
        ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
        return ear
    
    def calculate_head_pose(self, landmarks: np.ndarray) -> Tuple[float, float, float]:
        """
        Calculate head pose angles (pitch, yaw, roll) from facial landmarks.
        
        Args:
            landmarks: Array of facial landmark coordinates
            
        Returns:
            Tuple of (pitch, yaw, roll) angles in degrees
        """
        # Get key points for head pose estimation
        nose_tip = landmarks[self.NOSE_TIP]
        chin = landmarks[self.CHIN]
        
        # Calculate basic head orientation
        # This is a simplified version - for production, use proper 3D pose estimation
        dx = nose_tip[0] - chin[0]
        dy = nose_tip[1] - chin[1]
        
        # Calculate angles (simplified)
        yaw = np.arctan2(dx, dy) * 180 / np.pi
        pitch = 0  # Would need more complex calculation for accurate pitch
        roll = 0   # Would need more complex calculation for accurate roll
        
        return pitch, yaw, roll
    
    def detect_gaze_direction(self, landmarks: np.ndarray) -> Tuple[float, float]:
        """
        Detect gaze direction based on eye landmarks.
        
        Args:
            landmarks: Array of facial landmark coordinates
            
        Returns:
            Tuple of (horizontal_gaze, vertical_gaze) normalized values
        """
        # Get eye center points
        left_eye_center = np.mean(landmarks[self.LEFT_EYE_INDICES], axis=0)
        right_eye_center = np.mean(landmarks[self.RIGHT_EYE_INDICES], axis=0)
        
        # Calculate eye center
        eye_center = (left_eye_center + right_eye_center) / 2
        
        # Get iris positions (simplified - using eye center as proxy)
        # In a more sophisticated implementation, you'd detect actual iris position
        iris_left = landmarks[468]  # Left iris center (approximate)
        iris_right = landmarks[473]  # Right iris center (approximate)
        
        # Calculate gaze direction
        gaze_horizontal = (iris_left[0] + iris_right[0]) / 2 - eye_center[0]
        gaze_vertical = (iris_left[1] + iris_right[1]) / 2 - eye_center[1]
        
        return gaze_horizontal, gaze_vertical
    
    def isUserFocused(self, frame: np.ndarray) -> Tuple[bool, Dict[str, Any]]:
        """
        Main function to determine if user is focused based on frame analysis.
        
        Args:
            frame: Input video frame (BGR format)
            
        Returns:
            Tuple of (is_focused, context_data)
        """
        context_data = {
            'face_detected': False,
            'eye_aspect_ratio': 0.0,
            'head_pose': (0.0, 0.0, 0.0),
            'gaze_direction': (0.0, 0.0),
            'confidence': 0.0
        }
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame with face detection
        face_results = self.face_detection.process(rgb_frame)
        
        if not face_results.detections:
            # No face detected - user is likely not present or turned away
            return False, context_data
        
        # Process frame with face mesh for detailed landmarks
        mesh_results = self.face_mesh.process(rgb_frame)
        
        if not mesh_results.multi_face_landmarks:
            # Face detected but no landmarks - still consider as not focused
            context_data['face_detected'] = True
            return False, context_data
        
        # Get the first (and should be only) face
        face_landmarks = mesh_results.multi_face_landmarks[0]
        
        # Convert landmarks to numpy array
        landmarks = np.array([[lm.x * frame.shape[1], lm.y * frame.shape[0]] 
                             for lm in face_landmarks.landmark])
        
        context_data['face_detected'] = True
        
        # Calculate eye aspect ratio for both eyes
        left_eye_ear = self.calculate_eye_aspect_ratio(landmarks[self.LEFT_EYE_INDICES])
        right_eye_ear = self.calculate_eye_aspect_ratio(landmarks[self.RIGHT_EYE_INDICES])
        avg_ear = (left_eye_ear + right_eye_ear) / 2.0
        
        context_data['eye_aspect_ratio'] = avg_ear
        
        # Check for eye closure (blinking or sleeping)
        if avg_ear < Config.EYE_ASPECT_RATIO_THRESHOLD:
            return False, context_data
        
        # Calculate head pose
        pitch, yaw, roll = self.calculate_head_pose(landmarks)
        context_data['head_pose'] = (pitch, yaw, roll)
        
        # Check if head is turned away significantly
        if abs(yaw) > Config.HEAD_POSE_THRESHOLD:
            return False, context_data
        
        # Calculate gaze direction
        gaze_h, gaze_v = self.detect_gaze_direction(landmarks)
        context_data['gaze_direction'] = (gaze_h, gaze_v)
        
        # Check if gaze is deviated significantly from center
        gaze_deviation = np.sqrt(gaze_h**2 + gaze_v**2)
        if gaze_deviation > Config.GAZE_DEVIATION_THRESHOLD:
            return False, context_data
        
        # Calculate overall confidence
        confidence = min(1.0, avg_ear * 2)  # Simple confidence based on EAR
        context_data['confidence'] = confidence
        
        # User appears focused
        return True, context_data
    
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
        
        # Draw metrics
        if context['face_detected']:
            cv2.putText(debug_frame, f"EAR: {context['eye_aspect_ratio']:.3f}", 
                       (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(debug_frame, f"Yaw: {context['head_pose'][1]:.1f}°", 
                       (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(debug_frame, f"Confidence: {context['confidence']:.3f}", 
                       (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        else:
            cv2.putText(debug_frame, "NO FACE DETECTED", 
                       (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
        
        return debug_frame
