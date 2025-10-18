"""
Simple TCP communication module for sending events to Electron frontend.
Uses TCP sockets instead of ZeroMQ to avoid ES module issues.
"""

import json
import socket
import traceback
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from config import Config

class TCPCommunicator:
    """Handles communication with Electron frontend via TCP sockets."""
    
    def __init__(self):
        """Initialize TCP communication."""
        self.socket = None
        self.is_connected = False
        self.port = Config.IPC_PORT
        self.host = 'localhost'
        
        try:
            # Create TCP socket
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            
            # Bind to port for communication with Electron
            self.socket.bind((self.host, self.port))
            self.socket.listen(1)
            self.is_connected = True
            
            print(f"TCP communication initialized on port {self.port}")
            
            # Start accepting connections in a separate thread
            self.connection_thread = threading.Thread(target=self._accept_connections, daemon=True)
            self.connection_thread.start()
            
        except Exception as e:
            print(f"Failed to initialize TCP communication: {e}")
            self.is_connected = False
    
    def _accept_connections(self):
        """Accept incoming connections from Electron."""
        while self.is_connected:
            try:
                client_socket, address = self.socket.accept()
                print(f"Electron connected from {address}")
                
                # Store the client socket for sending messages
                self.client_socket = client_socket
                
            except Exception as e:
                if self.is_connected:
                    print(f"Error accepting connection: {e}")
    
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
        
        #print("Rekognition data in create_event: ", context_data)

        
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
        if not self.is_connected or not hasattr(self, 'client_socket'):
            return False
        
        try:
            print("For event type ", event_type, " the context_data is ", context_data)
            # Create the event JSON
            event = self.create_event_json(event_type, context_data)
            
            # Convert to JSON string and add newline
            event_json = json.dumps(event) + '\n'
            
            # Send the event
            self.client_socket.send(event_json.encode('utf-8'))
            
            # if Config.DEBUG_MODE:
            #     print(f"Sent event: {event_type}")
            #     print(f"Event data: {event_json.strip()}")
            
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
        """Close the TCP communication."""
        self.is_connected = False
        
        if hasattr(self, 'client_socket'):
            try:
                self.client_socket.close()
            except:
                pass
        
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        
        print("TCP communication closed")
