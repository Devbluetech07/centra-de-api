import base64
import cv2
import numpy as np

FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def decode_base64_image(image_base64: str):
    try:
        payload = image_base64.split(",", 1)[-1]
        image_bytes = base64.b64decode(payload, validate=True)
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return image
    except Exception:
        return None


def calc_blur(gray_image) -> float:
    return float(cv2.Laplacian(gray_image, cv2.CV_64F).var())


def calc_brightness(gray_image) -> float:
    return float(np.mean(gray_image))


def detect_face(image) -> bool:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
    return len(faces) > 0


def detect_document_shape(image) -> bool:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 70, 180)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape
    image_area = h * w

    for contour in contours:
      area = cv2.contourArea(contour)
      if area < image_area * 0.12:
          continue
      peri = cv2.arcLength(contour, True)
      approx = cv2.approxPolyDP(contour, 0.03 * peri, True)
      if len(approx) == 4:
          return True
    return False


def evaluate_quality(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_value = calc_blur(gray)
    brightness = calc_brightness(gray)
    quality_ok = blur_value >= 60 and 70 <= brightness <= 210
    return quality_ok, blur_value, brightness
