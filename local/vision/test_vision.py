"""
Test script for the LockInDubs vision system.
Provides basic testing functionality for individual components.
"""

import cv2
import time
from focus_detector_opencv import FocusDetectorOpenCV as FocusDetector
from aws_rekognition import RekognitionAnalyzer
from config import Config

def test_focus_detection():
    """Test the focus detection functionality."""
    print("Testing Focus Detection...")
    
    # Initialize focus detector
    detector = FocusDetector()
    
    # Initialize camera
    camera = cv2.VideoCapture(Config.CAMERA_INDEX)
    if not camera.isOpened():
        print(f"Failed to open camera {Config.CAMERA_INDEX}")
        return
    
    print("Camera opened successfully. Press 'q' to quit, 's' to save frame.")
    
    frame_count = 0
    while True:
        ret, frame = camera.read()
        if not ret:
            print("Failed to capture frame")
            break
        
        # Test focus detection
        is_focused, context = detector.isUserFocused(frame)
        
        # Draw debug info
        debug_frame = detector.draw_debug_info(frame, is_focused, context)
        
        # Display frame
        cv2.imshow('Focus Detection Test', debug_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Save current frame
            filename = f"test_frame_{frame_count}.jpg"
            cv2.imwrite(filename, frame)
            print(f"Saved frame: {filename}")
            frame_count += 1
        
        # Print focus status every 30 frames
        if frame_count % 30 == 0:
            print(f"Focus Status: {'FOCUSED' if is_focused else 'DISTRACTED'}")
            print(f"Context: {context}")
    
    camera.release()
    cv2.destroyAllWindows()
    print("Focus detection test completed.")

def test_aws_rekognition():
    """Test AWS Rekognition integration."""
    print("Testing AWS Rekognition...")
    
    # Initialize analyzer
    analyzer = RekognitionAnalyzer()
    
    if not analyzer.is_available:
        print("AWS Rekognition not available. Check your credentials.")
        return
    
    # Initialize camera
    camera = cv2.VideoCapture(Config.CAMERA_INDEX)
    if not camera.isOpened():
        print(f"Failed to open camera {Config.CAMERA_INDEX}")
        return
    
    print("Camera opened successfully. Press 'q' to quit, 'a' to analyze current frame.")
    
    while True:
        ret, frame = camera.read()
        if not ret:
            print("Failed to capture frame")
            break
        
        # Display frame
        cv2.imshow('AWS Rekognition Test', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('a'):
            # Analyze current frame
            print("Analyzing frame...")
            context = analyzer.get_context_summary(frame)
            print(f"Analysis result: {context}")
    
    camera.release()
    cv2.destroyAllWindows()
    print("AWS Rekognition test completed.")

def test_camera():
    """Test basic camera functionality."""
    print("Testing Camera...")
    
    camera = cv2.VideoCapture(Config.CAMERA_INDEX)
    if not camera.isOpened():
        print(f"Failed to open camera {Config.CAMERA_INDEX}")
        return
    
    print("Camera opened successfully. Press 'q' to quit.")
    
    while True:
        ret, frame = camera.read()
        if not ret:
            print("Failed to capture frame")
            break
        
        # Display frame
        cv2.imshow('Camera Test', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    camera.release()
    cv2.destroyAllWindows()
    print("Camera test completed.")

def main():
    """Main test function."""
    print("LockInDubs Vision System - Test Suite")
    print("=" * 40)
    print("1. Test Camera")
    print("2. Test Focus Detection")
    print("3. Test AWS Rekognition")
    print("4. Run All Tests")
    print("0. Exit")
    
    while True:
        try:
            choice = input("\nEnter your choice (0-4): ").strip()
            
            if choice == '0':
                print("Exiting test suite.")
                break
            elif choice == '1':
                test_camera()
            elif choice == '2':
                test_focus_detection()
            elif choice == '3':
                test_aws_rekognition()
            elif choice == '4':
                test_camera()
                test_focus_detection()
                test_aws_rekognition()
            else:
                print("Invalid choice. Please enter 0-4.")
                
        except KeyboardInterrupt:
            print("\nExiting test suite.")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
