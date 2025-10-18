"""
Setup script for LockInDubs vision system.
Handles installation and initial configuration.
"""

import os
import sys
import subprocess
import shutil

def install_requirements():
    """Install Python requirements."""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install requirements: {e}")
        return False

def setup_environment():
    """Set up environment configuration."""
    print("Setting up environment configuration...")
    
    env_file = ".env"
    env_template = "env_template.txt"
    
    if os.path.exists(env_file):
        print(f"✓ Environment file {env_file} already exists")
        return True
    
    if not os.path.exists(env_template):
        print(f"✗ Template file {env_template} not found")
        return False
    
    try:
        shutil.copy(env_template, env_file)
        print(f"✓ Created {env_file} from template")
        print(f"⚠️  Please edit {env_file} with your AWS credentials and preferences")
        return True
    except Exception as e:
        print(f"✗ Failed to create environment file: {e}")
        return False

def check_camera():
    """Check if camera is available."""
    print("Checking camera availability...")
    try:
        import cv2
        camera = cv2.VideoCapture(0)
        if camera.isOpened():
            print("✓ Camera is available")
            camera.release()
            return True
        else:
            print("✗ Camera not available")
            return False
    except ImportError:
        print("✗ OpenCV not installed")
        return False
    except Exception as e:
        print(f"✗ Camera check failed: {e}")
        return False

def check_aws_credentials():
    """Check if AWS credentials are configured."""
    print("Checking AWS credentials...")
    
    env_file = ".env"
    if not os.path.exists(env_file):
        print("✗ Environment file not found")
        return False
    
    try:
        with open(env_file, 'r') as f:
            content = f.read()
            
        if "your_aws_access_key_here" in content:
            print("⚠️  AWS credentials not configured in .env file")
            return False
        else:
            print("✓ AWS credentials appear to be configured")
            return True
    except Exception as e:
        print(f"✗ Failed to check AWS credentials: {e}")
        return False

def run_tests():
    """Run basic tests."""
    print("Running basic tests...")
    try:
        # Test imports
        from focus_detector import FocusDetector
        from aws_rekognition import RekognitionAnalyzer
        from ipc_communication import IPCCommunicator
        from config import Config
        
        print("✓ All modules imported successfully")
        
        # Test component initialization
        detector = FocusDetector()
        analyzer = RekognitionAnalyzer()
        communicator = IPCCommunicator()
        
        print("✓ All components initialized successfully")
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False

def main():
    """Main setup function."""
    print("LockInDubs Vision System Setup")
    print("=" * 40)
    
    success = True
    
    # Install requirements
    if not install_requirements():
        success = False
    
    # Setup environment
    if not setup_environment():
        success = False
    
    # Check camera
    if not check_camera():
        success = False
    
    # Check AWS credentials
    if not check_aws_credentials():
        success = False
    
    # Run tests
    if not run_tests():
        success = False
    
    print("\n" + "=" * 40)
    if success:
        print("✓ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Edit .env file with your AWS credentials")
        print("2. Run: python main.py")
        print("3. Or test components: python test_vision.py")
    else:
        print("✗ Setup completed with errors")
        print("Please resolve the issues above before running the system")
    
    return success

if __name__ == "__main__":
    main()
