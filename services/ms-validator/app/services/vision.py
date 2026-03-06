import base64
import cv2
import numpy as np

FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
PROFILE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
EYE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")


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


def calc_contrast(gray_image) -> float:
    return float(np.std(gray_image))


def calc_sharpness(gray_image) -> float:
    sobelx = cv2.Sobel(gray_image, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray_image, cv2.CV_64F, 0, 1, ksize=3)
    return float(np.mean(np.sqrt(sobelx**2 + sobely**2)))


def detect_face(image) -> dict:
    """Detect face with detailed metrics: position, size, eye detection."""
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = FACE_CASCADE.detectMultiScale(
        gray, scaleFactor=1.06, minNeighbors=4, minSize=(int(w * 0.08), int(h * 0.08)),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        faces = PROFILE_CASCADE.detectMultiScale(
            gray, scaleFactor=1.08, minNeighbors=3, minSize=(int(w * 0.07), int(h * 0.07))
        )

    if len(faces) == 0:
        return {"detected": False, "centered": False, "eyes_detected": False, "face_ratio": 0.0, "count": 0}

    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    face_center_x = fx + fw / 2
    face_center_y = fy + fh / 2
    center_offset_x = abs(face_center_x - w / 2) / (w / 2)
    center_offset_y = abs(face_center_y - h / 2) / (h / 2)
    centered = center_offset_x < 0.45 and center_offset_y < 0.55
    face_ratio = (fw * fh) / (w * h)

    face_roi = gray[fy:fy + fh, fx:fx + fw]
    eyes = EYE_CASCADE.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=3, minSize=(int(fw * 0.08), int(fh * 0.06)))
    eyes_detected = len(eyes) >= 1

    return {
        "detected": True,
        "centered": centered,
        "eyes_detected": eyes_detected,
        "face_ratio": round(face_ratio, 4),
        "count": int(len(faces)),
        "center_offset": round(max(center_offset_x, center_offset_y), 3),
        "bbox": [int(fx), int(fy), int(fw), int(fh)]
    }


def detect_document_shape(image) -> dict:
    """Detect rectangular document with robust contour heuristics."""
    h, w = image.shape[:2]
    image_area = h * w
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    edges = cv2.Canny(blurred, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_contour = None
    best_score = 0.0
    best_area = 0.0

    def contour_score(contour):
        area = float(cv2.contourArea(contour))
        if area < image_area * 0.04:
            return 0.0, area

        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        vertices = len(approx)

        x, y, bw, bh = cv2.boundingRect(contour)
        if bw <= 0 or bh <= 0:
            return 0.0, area

        aspect_ratio = max(bw, bh) / max(1.0, min(bw, bh))
        # IDs/documents are usually rectangular in this range.
        aspect_ok = 1.15 <= aspect_ratio <= 2.4

        fill_ratio = area / float(max(1, bw * bh))
        rectangularity_ok = fill_ratio >= 0.45

        vertex_score = 1.0 if 4 <= vertices <= 8 else 0.5
        shape_score = 1.0 if (aspect_ok and rectangularity_ok) else 0.0
        area_score = min(1.0, area / (image_area * 0.35))

        score = (0.45 * shape_score) + (0.30 * area_score) + (0.25 * vertex_score)
        return score, area

    for contour in contours:
        score, area = contour_score(contour)
        if score > best_score or (score == best_score and area > best_area):
            best_score = score
            best_contour = contour
            best_area = area

    if best_contour is None or best_score < 0.42:
        adaptive = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours2, _ = cv2.findContours(adaptive, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours2:
            score, area = contour_score(contour)
            if score > best_score or (score == best_score and area > best_area):
                best_score = score
                best_contour = contour
                best_area = area

    if best_contour is None or best_score < 0.42:
        return {"detected": False, "area_ratio": 0.0, "angle": 0.0, "vertices": 0}

    area_ratio = best_area / image_area
    peri = cv2.arcLength(best_contour, True)
    approx = cv2.approxPolyDP(best_contour, 0.02 * peri, True)
    rect = cv2.minAreaRect(best_contour)
    angle = abs(rect[2])
    if angle > 45:
        angle = 90 - angle

    return {
        "detected": True,
        "area_ratio": round(area_ratio, 4),
        "angle": round(angle, 2),
        "vertices": len(approx),
        # Slightly relaxed framing to improve practical camera capture success.
        "well_framed": area_ratio > 0.11 and angle < 16
    }


def evaluate_quality(image) -> dict:
    """Comprehensive image quality assessment."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_value = calc_blur(gray)
    brightness = calc_brightness(gray)
    contrast = calc_contrast(gray)
    sharpness = calc_sharpness(gray)

    issues = []
    if blur_value < 50:
        issues.append("imagem_borrada")
    if brightness < 60:
        issues.append("baixa_iluminacao")
    if brightness > 220:
        issues.append("muita_luz")
    if contrast < 25:
        issues.append("baixo_contraste")

    quality_ok = blur_value >= 50 and 60 <= brightness <= 220 and contrast >= 25
    level = "good" if quality_ok else ("poor" if blur_value < 35 or brightness < 45 or brightness > 240 else "regular")

    return {
        "ok": quality_ok,
        "level": level,
        "blur": round(blur_value, 2),
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(sharpness, 2),
        "issues": issues
    }
