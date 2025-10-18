"""
Main event loop for LockInDubs vision system.
Implements the core focus detection pipeline with state management and IPC communication.
"""

import cv2
import traceback
import threading
import time
import threading
import signal
import sys
from typing import Dict, Any
from config import Config
from focus_detector_opencv import FocusDetectorOpenCV as FocusDetector
from aws_rekognition import RekognitionAnalyzer
from tcp_communication import TCPCommunicator

class LockInDubsVision:
    """Main class for the LockInDubs vision system."""
    
    def __init__(self):
        """Initialize the vision system."""
        # Global state variables as specified in the requirements
        self.userFocusState = True  # Current focus state
        self.consecutiveFrames = 0  # Counter for consecutive frames
        self.consecutiveFramesThreshold = Config.CONSECUTIVE_FRAMES_THRESHOLD
        
        # Initialize components
        self.focus_detector = FocusDetector()
        self.rekognition_analyzer = RekognitionAnalyzer()
        self.ipc_communicator = TCPCommunicator()
        
        # Camera and timing
        self.camera = None
        self.frame_rate = Config.FRAME_RATE
        self.frame_interval = 1.0 / self.frame_rate
        
        # Control flags
        self.running = False
        self.last_frame_time = 0

        # Flags across threads
        self.is_focused = True
        self.opencv_context = {}
        self.frame = []
        self.frame_processed = False
        
        # Statistics
        self.stats = {
            'total_frames': 0,
            'focused_frames': 0,
            'distracted_frames': 0,
            'state_changes': 0,
            'session_start': time.time()
        }
        
        print("LockInDubs Vision System initialized")
    
    def initialize_camera(self) -> bool:
        """
        Initialize the camera for frame capture.
        
        Returns:
            True if camera initialized successfully, False otherwise
        """
        try:
            self.camera = cv2.VideoCapture(0)
            
            if not self.camera.isOpened():
                print(f"Failed to open camera {Config.CAMERA_INDEX}")
                return False
            
            # Set camera properties
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.camera.set(cv2.CAP_PROP_FPS, self.frame_rate)
            
            print(f"Camera initialized successfully (index: {Config.CAMERA_INDEX})")
            return True
            
        except Exception as e:
            print(f"Failed to initialize camera: {e}")
            return False
    
    def process_frame(self, frame) -> None:
        """
        Process a single frame through the focus detection pipeline.
        
        Args:
            frame: Input video frame
        """
        # Get focus detection result
        self.is_focused, self.opencv_context = self.focus_detector.isUserFocused(frame)

        # Get AWS Rekognition context (throttled to avoid excessive API calls)
        rekognition_context = {}

        if self.stats['total_frames'] % 30 == 0:  # Every 30 frames (~1.5 seconds at 20 FPS)
             rekognition_context = self.rekognition_analyzer.get_context_summary(frame)

        # Combine context data
        context_data = {
            'opencv_data': self.opencv_context,
            'rekognition_data': rekognition_context,
            **self.opencv_context  # Include opencv data at top level for easy access
        }
        
        # Update statistics
        self.stats['total_frames'] += 1
        if self.is_focused:
            self.stats['focused_frames'] += 1
        else:
            self.stats['distracted_frames'] += 1
        
        # Decision logic as specified in requirements
        if self.is_focused:

            # CASE 2: User appears focused
            if self.userFocusState == True:
                # User remains focused - no action needed
                pass
            else:
                # Possible regaining of focus
                self.consecutiveFrames += 1
                if self.consecutiveFrames >= self.consecutiveFramesThreshold:
                    # State change: unfocused -> focused
                    self.userFocusState = True
                    self.consecutiveFrames = 0
                    self.stats['state_changes'] += 1
                    
                    # Send focus event to Electron
                    self.ipc_communicator.send_focus_event(True, context_data)
                    
                    if Config.DEBUG_MODE:
                        print("State change: User FOCUSED")
        else:
            # CASE 1: User appears unfocused
            if self.userFocusState == False:
                # User already marked unfocused - continue
                pass
            else:
                # Possible loss of focus
                self.consecutiveFrames += 1
                if self.consecutiveFrames >= self.consecutiveFramesThreshold:
                    # State change: focused -> unfocused
                    self.userFocusState = False
                    self.consecutiveFrames = 0
                    self.stats['state_changes'] += 1
                    
                    # Send unfocus event to Electron
                    self.ipc_communicator.send_focus_event(False, context_data)
                    
                    if Config.DEBUG_MODE:
                        print("State change: User UNFOCUSED")
        
    
    def display_loop(self) -> None:
        # Deployed on a thread separate from main_loop
        # Since AWS might take time and we want high latency image
        # display regardless of AWS latency, this separate thread
        # will continuously display the info and latest frame regardless
        # of what process_frame is doing.
        # Show debug visualization if enabled
        while self.running:
            if Config.SHOW_VIDEO_FEED:
                # Capture frame
                ret, self.frame = self.camera.read()
                if not ret:
                    print("Failed to capture frame")
                    continue

                #self.frame is the global current frame of image being processed
                debug_frame = self.focus_detector.draw_debug_info(self.frame, self.userFocusState, self.opencv_context)
                cv2.imshow('LockInDubs Vision Debug', debug_frame)
                self.frame_processed = True
                # Handle window close
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.running = False

    def main_loop(self) -> None:
        """Main event loop for continuous frame processing."""
        print("Starting main event loop...")
        
        while self.running:
            if self.frame_processed:
                current_time = time.time()
                # Control frame rate
                if current_time - self.last_frame_time < self.frame_interval:
                    time.sleep(0.001)  # Small sleep to prevent busy waiting
                    continue
                            
                # Process frame
                self.process_frame(self.frame)
                
                # Send heartbeat every 5 seconds
                if int(current_time) % 5 == 0 and int(current_time) != int(self.last_frame_time):
                    self.ipc_communicator.send_heartbeat()
                
                self.last_frame_time = current_time
    
    def main_loop_encapsulator(self) -> None:
        try:
            self.main_loop()
        except KeyboardInterrupt:
            print("Received keyboard interrupt")
        except Exception as e:
            print(f"Error in main loop: {traceback.format_exc()}")
        finally:
            self.cleanup()

    def start(self) -> None:
        """Start the vision system."""
        print("Starting LockInDubs Vision System...")
        
        # Initialize camera
        if not self.initialize_camera():
            print("Failed to initialize camera. Exiting.")
            return
        
        # Set up signal handlers for graceful shutdown
        # signal.signal(signal.SIGINT, self.signal_handler)
        # signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Start main loop
        self.running = True
        main_loop_thread = threading.Thread(target=self.main_loop_encapsulator, args=())
        display_loop_thread = threading.Thread(target=self.display_loop, args=())

        main_loop_thread.start()
        display_loop_thread.start()

    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"Received signal {signum}. Shutting down...")
        self.running = False
    
    def cleanup(self) -> None:
        """Clean up resources."""
        print("Cleaning up resources...")
        
        # Stop main loop
        self.running = False
        
        # Release camera
        if self.camera:
            self.camera.release()
        
        # Close OpenCV windows
        cv2.destroyAllWindows()
        
        # Close IPC communication
        if self.ipc_communicator:
            self.ipc_communicator.close()
        
        # Print session statistics
        self.print_session_stats()
        
        print("Cleanup completed")
    
    def print_session_stats(self) -> None:
        """Print session statistics."""
        session_duration = time.time() - self.stats['session_start']
        focus_percentage = (self.stats['focused_frames'] / max(1, self.stats['total_frames'])) * 100
        
        print("\n" + "="*50)
        print("SESSION STATISTICS")
        print("="*50)
        print(f"Session Duration: {session_duration:.1f} seconds")
        print(f"Total Frames Processed: {self.stats['total_frames']}")
        print(f"Focused Frames: {self.stats['focused_frames']}")
        print(f"Distracted Frames: {self.stats['distracted_frames']}")
        print(f"Focus Percentage: {focus_percentage:.1f}%")
        print(f"State Changes: {self.stats['state_changes']}")
        print(f"Average FPS: {self.stats['total_frames'] / max(1, session_duration):.1f}")
        print("="*50)

def main():
    """Main entry point."""
    print("LockInDubs Vision System")
    print("=" * 30)
    
    # Create and start the vision system
    vision_system = LockInDubsVision()
    vision_system.start()

if __name__ == "__main__":
    main()
