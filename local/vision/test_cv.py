import cv2
cap = cv2.VideoCapture(0)
if not cap.isOpened():
        print("Error: Could not open video stream.")
        exit()
        
while True:
        ret, frame = cap.read() # Read a frame from the camera

        if not ret: # If frame is not read correctly, break the loop
            print("Error: Failed to grab frame.")
            break

        cv2.imshow('Webcam Feed', frame) # Display the frame in a window named 'Webcam Feed'

        # Exit the loop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break