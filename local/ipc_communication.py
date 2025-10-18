"""
IPC communication module for sending events to Electron frontend.
Handles JSON event creation and ZeroMQ communication.
"""

import json
import zmq
import traceback
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from config import Config

class IPCCommunicator:
    """Handles communication with Electron frontend via ZeroMQ."""
    
    def __init__(self):
        """Initialize IPC communication."""
        self.context = None
        self.socket = None
        self.is_connected = False
        
        try:
            # Initialize ZeroMQ context
            self.context = zmq.Context()
            self.socket = self.context.socket(zmq.PUB)
            
            # Bind to port for communication with Electron
            self.socket.bind(f"tcp://*:{Config.IPC_PORT}")
            self.is_connected = True
            
            print(f"IPC communication initialized on port {Config.IPC_PORT}")
            
        except Exception as e:
            print(f"Failed to initialize IPC communication: {e}")
            self.is_connected = False
    
    def create_event_json(self, event_type: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a properly formatted JSON event for the Electron frontend.
        
        Args:
            event_type: Type of event ('user_focused' or 'user_unfocused')
            context_data: Context data from focus detection and scene analysis
            
        Returns:
            Formatted JSON event dictionary
        """
        # Get current UTC timestamp
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Create the event structure
        event = {
            "timestamp": timestamp,
            "event": event_type,
            "context": {
                "opencv_data": str(context_data.get('opencv_data', {})),
                "rekognition_data": str(context_data.get('rekognition_data', {})),
                "focus_metrics": {
                    "eye_aspect_ratio": context_data.get('eye_aspect_ratio', 0.0),
                    "head_pose": context_data.get('head_pose', (0.0, 0.0, 0.0)),
                    "gaze_direction": context_data.get('gaze_direction', (0.0, 0.0)),
                    "confidence": context_data.get('confidence', 0.0),
                    "face_detected": str(context_data.get('face_detected', "False"))
                },
                "session_info": {
                    "frame_rate": Config.FRAME_RATE,
                    "threshold": Config.CONSECUTIVE_FRAMES_THRESHOLD
                }
            }
        }
        
        return event
    
    def send_event(self, event_type: str, context_data: Dict[str, Any]) -> bool:
        """
        Send an event to the Electron frontend.
        
        Args:
            event_type: Type of event to send
            context_data: Context data for the event
            
        Returns:
            True if event was sent successfully, False otherwise
        """
        if not self.is_connected or not self.socket:
            print("IPC communication not available")
            return False
        
        try:
            # Create the event JSON
            event = self.create_event_json(event_type, context_data)
            
            # Convert to JSON string
            try:
                event_json = json.dumps(event, indent=2)
            except Exception as e:
                print(f"Event looked like this: {event}")
                print(f"Failed to convert event to JSON: {traceback.format_exc()}")
                return False
            
            # Send the event
            self.socket.send_string(event_json)
            
            if Config.DEBUG_MODE:
                print(f"Sent event: {event_type}")
                print(f"Event data: {event_json}")
            
            return True
            
        except Exception as e:
            print(f"Failed to send event: {traceback.format_exc()}")
            return False
    
    def send_focus_event(self, is_focused: bool, context_data: Dict[str, Any]) -> bool:
        """
        Send a focus state change event.
        
        Args:
            is_focused: Current focus state
            context_data: Context data from focus detection
            
        Returns:
            True if event was sent successfully, False otherwise
        """
        event_type = "user_focused" if is_focused else "user_unfocused"
        return self.send_event(event_type, context_data)
    
    def send_heartbeat(self) -> bool:
        """
        Send a heartbeat event to keep the connection alive.
        
        Returns:
            True if heartbeat was sent successfully, False otherwise
        """
        heartbeat_data = {
            "opencv_data": {"status": "active"},
            "rekognition_data": {"status": "active"},
            "heartbeat": True
        }
        
        return self.send_event("heartbeat", heartbeat_data)
    
    def close(self):
        """Close the IPC communication."""
        if self.socket:
            self.socket.close()
        if self.context:
            self.context.term()
        self.is_connected = False
        print("IPC communication closed")
