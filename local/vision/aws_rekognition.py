"""
AWS Rekognition integration for context enrichment.
Provides scene analysis and object detection for better focus context.
"""

import boto3
import cv2
import base64
import json
from typing import Dict, Any, Optional
from config import Config

class RekognitionAnalyzer:
    """Handles AWS Rekognition integration for scene analysis."""
    
    def __init__(self):
        """Initialize AWS Rekognition client."""
        self.rekognition_client = None
        self.is_available = False
        
        # Initialize AWS client if credentials are available
        if Config.AWS_ACCESS_KEY_ID and Config.AWS_SECRET_ACCESS_KEY:
            try:
                self.rekognition_client = boto3.client(
                    'rekognition',
                    aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
                    region_name=Config.AWS_REGION
                )
                self.is_available = True
                print("AWS Rekognition client initialized successfully")
            except Exception as e:
                print(f"Failed to initialize AWS Rekognition: {e}")
                self.is_available = False
        else:
            print("AWS credentials not provided - Rekognition features disabled")
    
    def frame_to_base64(self, frame: cv2.Mat) -> str:
        """
        Convert OpenCV frame to base64 string for AWS Rekognition.
        
        Args:
            frame: OpenCV frame (BGR format)
            
        Returns:
            Base64 encoded string of the frame
        """
        # Encode frame as JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        # Convert to base64
        frame_base64 = base64.b64encode(frame_bytes).decode('utf-8')
        return frame_base64
    
    def analyze_scene(self, frame: cv2.Mat) -> Dict[str, Any]:
        """
        Analyze scene using AWS Rekognition for context enrichment.
        
        Args:
            frame: Input video frame
            
        Returns:
            Dictionary containing scene analysis results
        """
        if not self.is_available or not self.rekognition_client:
            return {
                'available': False,
                'error': 'AWS Rekognition not available'
            }
        
        try:
            # Convert frame to base64
            frame_base64 = self.frame_to_base64(frame)
            
            # Analyze scene for objects and labels
            response = self.rekognition_client.detect_labels(
                Image={'Bytes': base64.b64decode(frame_base64)},
                MaxLabels=10,
                MinConfidence=0.7
            )
            
            # Extract relevant information
            labels = []
            distraction_objects = []
            
            for label in response['Labels']:
                label_name = label['Name'].lower()
                confidence = label['Confidence']
                
                labels.append({
                    'name': label_name,
                    'confidence': confidence
                })
                
                # Check for common distraction objects
                distraction_keywords = ['phone', 'mobile', 'tablet', 'laptop', 'book', 'magazine', 'tv', 'television']
                if any(keyword in label_name for keyword in distraction_keywords):
                    distraction_objects.append({
                        'object': label_name,
                        'confidence': confidence
                    })
            
            return {
                'available': True,
                'labels': labels,
                'distraction_objects': distraction_objects,
                'total_labels': len(labels),
                'distraction_count': len(distraction_objects)
            }
            
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }
    
    def detect_faces(self, frame: cv2.Mat) -> Dict[str, Any]:
        """
        Detect faces in the frame using AWS Rekognition.
        
        Args:
            frame: Input video frame
            
        Returns:
            Dictionary containing face detection results
        """
        if not self.is_available or not self.rekognition_client:
            return {
                'available': False,
                'error': 'AWS Rekognition not available'
            }
        
        try:
            # Convert frame to base64
            frame_base64 = self.frame_to_base64(frame)
            
            # Detect faces
            response = self.rekognition_client.detect_faces(
                Image={'Bytes': base64.b64decode(frame_base64)},
                Attributes=['ALL']
            )
            
            faces = []
            for face in response['FaceDetails']:
                face_info = {
                    'confidence': face['Confidence'],
                    'bounding_box': face['BoundingBox'],
                    'emotions': [],
                    'age_range': face.get('AgeRange', {}),
                    'gender': face.get('Gender', {}),
                    'eyes_open': face.get('EyesOpen', {}),
                    'mouth_open': face.get('MouthOpen', {})
                }
                
                # Extract emotions
                for emotion in face.get('Emotions', []):
                    face_info['emotions'].append({
                        'type': emotion['Type'],
                        'confidence': emotion['Confidence']
                    })
                
                faces.append(face_info)
            
            return {
                'available': True,
                'faces': faces,
                'face_count': len(faces)
            }
            
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }
    
    def get_context_summary(self, frame: cv2.Mat) -> Dict[str, Any]:
        """
        Get comprehensive context analysis combining scene and face detection.
        
        Args:
            frame: Input video frame
            
        Returns:
            Dictionary containing comprehensive context analysis
        """
        scene_analysis = self.analyze_scene(frame)
        face_analysis = self.detect_faces(frame)

        print("Scene Analysis: ", scene_analysis)
        
        # Combine results
        context = {
            'timestamp': None,  # Will be set by caller
            'scene_analysis': scene_analysis,
            'face_analysis': face_analysis,
            'distraction_level': 'low'
        }
        
        # Determine distraction level
        if scene_analysis.get('available', False):
            distraction_count = ("phone" in str(scene_analysis))
            if distraction_count:
                context['distraction_level'] = 'high'
            elif distraction_count:
                context['distraction_level'] = 'medium'
        
        return context
