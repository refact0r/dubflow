#!/usr/bin/env python3
"""
Simple test script to verify TCP communication works
"""

import json
import time
from tcp_communication import TCPCommunicator

def main():
    print("🧪 Testing TCP communication...")
    
    # Create TCP communicator
    communicator = TCPCommunicator()
    
    if not communicator.is_connected:
        print("❌ Failed to initialize TCP communicator")
        return
    
    print("✅ TCP communicator initialized")
    print("📡 Waiting for Electron to connect...")
    
    # Wait a bit for Electron to connect
    time.sleep(2)
    
    # Send test events
    test_data = {
        'eye_aspect_ratio': 0.25,
        'head_pose': (0.1, 0.2, 0.0),
        'gaze_direction': (0.5, 0.3),
        'confidence': 0.85,
        'face_detected': True,
        'opencv_data': {'test': 'data'},
        'rekognition_data': {'test': 'data'}
    }
    
    print("📤 Sending test events...")
    
    # Send focus events
    for i in range(5):
        is_focused = i % 2 == 0
        event_type = "user_focused" if is_focused else "user_unfocused"
        
        print(f"  Sending {event_type} event...")
        success = communicator.send_focus_event(is_focused, test_data)
        
        if success:
            print(f"  ✅ {event_type} sent successfully")
        else:
            print(f"  ❌ Failed to send {event_type}")
        
        time.sleep(1)
    
    # Send heartbeat
    print("  Sending heartbeat...")
    success = communicator.send_heartbeat()
    if success:
        print("  ✅ Heartbeat sent successfully")
    else:
        print("  ❌ Failed to send heartbeat")
    
    print("🏁 Test completed")
    
    # Clean up
    communicator.close()

if __name__ == "__main__":
    main()
