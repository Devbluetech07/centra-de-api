from app.services.vision import decode_base64_image, detect_document_shape, detect_face, evaluate_quality


def _quality_level(quality_ok: bool, blur_value: float, brightness: float) -> str:
    if quality_ok:
        return "good"
    if blur_value < 45 or brightness < 60 or brightness > 230:
        return "poor"
    return "regular"


def _quality_issues(blur_value: float, brightness: float):
    issues = []
    if blur_value < 60:
        issues.append("imagem_borrada")
    if brightness < 70:
        issues.append("baixa_iluminacao")
    if brightness > 210:
        issues.append("muita_luz")
    return issues


def validate_document(image_base64: str, doc_type: str, side: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "documentDetected": False,
            "feedback": "Imagem invalida",
            "confidence": 0.0,
            "quality": "bad",
            "documentType": doc_type,
            "side": side,
        }

    has_doc = detect_document_shape(image)
    quality_ok, blur_value, brightness = evaluate_quality(image)
    issues = _quality_issues(blur_value, brightness)
    if not has_doc:
        issues.append("documento_nao_detectado")
    can_capture = bool(has_doc and quality_ok)

    return {
        "canCapture": can_capture,
        "documentDetected": has_doc,
        "feedback": "Documento posicionado corretamente" if can_capture else "Ajuste enquadramento, luz e nitidez",
        "confidence": 0.92 if can_capture else 0.38,
        "quality": _quality_level(quality_ok, blur_value, brightness),
        "validationIssues": issues,
        "metrics": {"blur": blur_value, "brightness": brightness},
        "documentType": doc_type,
        "side": side,
    }


def validate_face(image_base64: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "faceDetected": False,
            "feedback": "Imagem invalida",
            "quality": "bad",
            "validationIssues": ["imagem_invalida"],
            "metrics": {"blur": 0.0, "brightness": 0.0},
        }

    has_face = detect_face(image)
    quality_ok, blur_value, brightness = evaluate_quality(image)
    issues = _quality_issues(blur_value, brightness)
    if not has_face:
        issues.append("rosto_nao_detectado")

    can_capture = bool(has_face and quality_ok)
    return {
        "canCapture": can_capture,
        "faceDetected": has_face,
        "feedback": "Rosto validado" if can_capture else "Centralize o rosto e ajuste a iluminação",
        "quality": _quality_level(quality_ok, blur_value, brightness),
        "validationIssues": issues,
        "metrics": {"blur": blur_value, "brightness": brightness},
    }


def validate_selfie_document(image_base64: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "bothValid": False,
            "faceStatus": {"detected": False, "centered": False},
            "docStatus": {"detected": False, "readable": False},
            "feedback": "Imagem invalida",
        }

    has_face = detect_face(image)
    has_doc = detect_document_shape(image)
    quality_ok, blur_value, brightness = evaluate_quality(image)
    issues = _quality_issues(blur_value, brightness)
    if not has_face:
        issues.append("rosto_nao_detectado")
    if not has_doc:
        issues.append("documento_nao_detectado")

    can_capture = bool(has_face and has_doc and quality_ok)
    return {
        "canCapture": can_capture,
        "bothValid": can_capture,
        "faceStatus": {"detected": has_face, "centered": has_face},
        "docStatus": {"detected": has_doc, "readable": quality_ok},
        "feedback": "Rosto e documento validados" if can_capture else "Posicione rosto e documento no enquadramento",
        "validationIssues": issues,
        "metrics": {"blur": blur_value, "brightness": brightness},
    }
