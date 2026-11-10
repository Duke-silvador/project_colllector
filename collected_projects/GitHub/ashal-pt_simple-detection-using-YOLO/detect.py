"""Simple YOLO object detection.

Usage:
    python detect.py image path/to/photo.jpg     # detect objects in an image
    python detect.py webcam                      # live detection from webcam (press q to quit)
"""
import sys

import cv2
from ultralytics import YOLO

# "n" = nano: the smallest and fastest YOLO model. The weights file
# (about 6 MB) is downloaded automatically the first time you run this.
model = YOLO("yolov8n.pt")

CONF_THRESHOLD = 0.4  # ignore detections the model is less than 40% sure about


def detect_image(path):
    results = model(path, conf=CONF_THRESHOLD)
    result = results[0]

    # Print every detection as text
    for box in result.boxes:
        class_name = model.names[int(box.cls)]
        confidence = float(box.conf)
        x1, y1, x2, y2 = [round(v) for v in box.xyxy[0].tolist()]
        print(f"{class_name:<12} {confidence:.2f}  box=({x1}, {y1}) -> ({x2}, {y2})")

    # Save an annotated copy of the image next to the original
    annotated = result.plot()  # numpy image with boxes + labels drawn
    out_path = "output.jpg"
    cv2.imwrite(out_path, annotated)
    print(f"\nFound {len(result.boxes)} objects. Saved annotated image to {out_path}")


def detect_webcam():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam.")
        return

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        result = model(frame, conf=CONF_THRESHOLD, verbose=False)[0]
        cv2.imshow("YOLO webcam (press q to quit)", result.plot())
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "image":
        detect_image(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "webcam":
        detect_webcam()
    else:
        print(__doc__)