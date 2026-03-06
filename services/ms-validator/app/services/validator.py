from app.services.vision import decode_base64_image, detect_document_shape, detect_face, evaluate_quality


def validate_document(image_base64: str, doc_type: str, side: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "documentDetected": False,
            "feedback": "Imagem invalida ou corrompida",
            "confidence": 0.0,
            "quality": "bad",
            "validationIssues": ["imagem_invalida"],
            "metrics": {"blur": 0.0, "brightness": 0.0, "contrast": 0.0, "sharpness": 0.0},
            "documentType": doc_type,
            "side": side,
        }

    doc_result = detect_document_shape(image)
    quality = evaluate_quality(image)

    issues = list(quality["issues"])
    feedback_parts = []
    confidence = 0.0

    if not doc_result["detected"]:
        feedback_parts.append("Ajuste o documento dentro do enquadramento")
        confidence = 0.15
    else:
        confidence = 0.5
        if doc_result.get("well_framed"):
            confidence += 0.25
        else:
            if doc_result["area_ratio"] < 0.15:
                issues.append("documento_pequeno")
                feedback_parts.append("Aproxime o documento da camera")
            if doc_result["angle"] > 12:
                issues.append("documento_inclinado")
                feedback_parts.append("Alinhe o documento reto")

        if quality["ok"]:
            confidence += 0.2

    # Keep guidance strict, but allow capture in realistic conditions:
    # detected document + acceptable framing + at least regular quality.
    area_ratio = float(doc_result.get("area_ratio", 0.0))
    framing_ok = doc_result.get("well_framed", False) or area_ratio >= 0.10
    quality_tolerable = bool(quality["ok"]) or quality.get("level") == "regular"
    can_capture = doc_result["detected"] and framing_ok and quality_tolerable

    if can_capture:
        confidence = max(confidence, 0.92)
        feedback = "Documento posicionado corretamente — pronto para captura"
    elif not feedback_parts:
        feedback = "Ajuste enquadramento, iluminacao e nitidez"
    else:
        feedback = ". ".join(feedback_parts)

    if not quality["ok"] and quality["issues"]:
        quality_feedback = []
        if "imagem_borrada" in quality["issues"]:
            quality_feedback.append("segure firme para evitar tremor")
        if "baixa_iluminacao" in quality["issues"]:
            quality_feedback.append("melhore a iluminacao")
        if "muita_luz" in quality["issues"]:
            quality_feedback.append("reduza reflexos e brilho excessivo")
        if "baixo_contraste" in quality["issues"]:
            quality_feedback.append("melhore o contraste")
        if quality_feedback:
            feedback += " — " + ", ".join(quality_feedback)

    return {
        "canCapture": can_capture,
        "documentDetected": doc_result["detected"],
        "feedback": feedback,
        "confidence": round(min(confidence, 1.0), 3),
        "quality": quality["level"],
        "validationIssues": issues,
        "metrics": {
            "blur": quality["blur"],
            "brightness": quality["brightness"],
            "contrast": quality["contrast"],
            "sharpness": quality["sharpness"],
            "doc_area_ratio": doc_result.get("area_ratio", 0.0),
            "doc_angle": doc_result.get("angle", 0.0),
        },
        "documentType": doc_type,
        "side": side,
    }


def validate_face(image_base64: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "faceDetected": False,
            "feedback": "Imagem invalida ou corrompida",
            "quality": "bad",
            "validationIssues": ["imagem_invalida"],
            "metrics": {"blur": 0.0, "brightness": 0.0, "contrast": 0.0, "sharpness": 0.0},
        }

    face_result = detect_face(image)
    quality = evaluate_quality(image)

    issues = list(quality["issues"])
    feedback_parts = []

    if not face_result["detected"]:
        issues.append("rosto_nao_detectado")
        feedback_parts.append("Posicione seu rosto de frente para a camera")
    else:
        if not face_result["centered"]:
            issues.append("rosto_descentralizado")
            feedback_parts.append("Centralize o rosto no enquadramento")
        if face_result["face_ratio"] < 0.03:
            issues.append("rosto_muito_distante")
            feedback_parts.append("Aproxime-se da camera")
        if face_result["face_ratio"] > 0.6:
            issues.append("rosto_muito_proximo")
            feedback_parts.append("Afaste-se um pouco da camera")
        if face_result["count"] > 1:
            issues.append("multiplos_rostos")
            feedback_parts.append("Apenas uma pessoa deve estar no enquadramento")

    quality_tolerable = bool(quality["ok"]) or quality.get("level") == "regular"
    single_face_scene = face_result.get("count", 0) <= 1
    can_capture = (
        face_result["detected"]
        and quality_tolerable
        and single_face_scene
        and face_result.get("face_ratio", 0.0) >= 0.018
    )

    if can_capture:
        feedback = "Rosto detectado e centralizado — pronto para captura"
    elif not feedback_parts:
        feedback = "Centralize o rosto e ajuste a iluminacao"
    else:
        feedback = ". ".join(feedback_parts)

    if not quality["ok"] and quality["issues"]:
        quality_hints = []
        if "imagem_borrada" in quality["issues"]:
            quality_hints.append("segure firme")
        if "baixa_iluminacao" in quality["issues"]:
            quality_hints.append("melhore a iluminacao")
        if "muita_luz" in quality["issues"]:
            quality_hints.append("reduza o brilho")
        if quality_hints:
            feedback += " — " + ", ".join(quality_hints)

    return {
        "canCapture": can_capture,
        "faceDetected": face_result["detected"],
        "faceCentered": face_result.get("centered", False),
        "eyesDetected": face_result.get("eyes_detected", False),
        "feedback": feedback,
        "quality": quality["level"],
        "validationIssues": issues,
        "metrics": {
            "blur": quality["blur"],
            "brightness": quality["brightness"],
            "contrast": quality["contrast"],
            "sharpness": quality["sharpness"],
            "face_ratio": face_result.get("face_ratio", 0.0),
            "center_offset": face_result.get("center_offset", 0.0),
        },
    }


def validate_selfie_document(image_base64: str):
    image = decode_base64_image(image_base64)
    if image is None:
        return {
            "canCapture": False,
            "bothValid": False,
            "faceStatus": {"detected": False, "centered": False, "eyes_detected": False},
            "docStatus": {"detected": False, "readable": False, "well_framed": False},
            "feedback": "Imagem invalida ou corrompida",
            "validationIssues": ["imagem_invalida"],
            "metrics": {},
        }

    h, w = image.shape[:2]

    face_region = image[0:int(h * 0.68), :]
    face_result = detect_face(face_region)
    if not face_result["detected"]:
        # Fallback to full frame when user positioning varies.
        face_result = detect_face(image)

    doc_region = image[int(h * 0.30):, :]
    doc_result = detect_document_shape(doc_region)
    if not doc_result["detected"]:
        # Fallback to full frame improves practical detection reliability.
        doc_result = detect_document_shape(image)

    quality = evaluate_quality(image)

    issues = list(quality["issues"])
    feedback_parts = []

    if not face_result["detected"]:
        issues.append("rosto_nao_detectado")
        feedback_parts.append("Posicione seu rosto na parte superior")

    if not doc_result["detected"]:
        issues.append("documento_nao_detectado")
        feedback_parts.append("Segure o documento visivel na parte inferior")

    if face_result["detected"] and not face_result["centered"]:
        issues.append("rosto_descentralizado")
        feedback_parts.append("Centralize o rosto")

    # Ultra-tolerant mode for selfie+document flow:
    # prioritize successful capture in real-world conditions.
    quality_tolerable = True
    doc_tolerable = (
        bool(doc_result["detected"])
        or float(doc_result.get("area_ratio", 0.0)) >= 0.05
    )
    can_capture = (
        face_result["detected"]
        and doc_tolerable
        and quality_tolerable
        and face_result.get("face_ratio", 0.0) >= 0.008
    )

    if can_capture:
        feedback = "Rosto e documento detectados — pronto para captura"
    elif not feedback_parts:
        feedback = "Posicione rosto e documento no enquadramento"
    else:
        feedback = ". ".join(feedback_parts)

    if not quality["ok"] and quality["issues"]:
        quality_hints = []
        if "imagem_borrada" in quality["issues"]:
            quality_hints.append("segure firme")
        if "baixa_iluminacao" in quality["issues"]:
            quality_hints.append("melhore a luz")
        if quality_hints:
            feedback += " — " + ", ".join(quality_hints)

    return {
        "canCapture": can_capture,
        "bothValid": can_capture,
        "faceStatus": {
            "detected": face_result["detected"],
            "centered": face_result.get("centered", False),
            "eyes_detected": face_result.get("eyes_detected", False),
        },
        "docStatus": {
            "detected": doc_result["detected"],
            "readable": quality["ok"],
            "well_framed": doc_result.get("well_framed", False),
        },
        "feedback": feedback,
        "validationIssues": issues,
        "metrics": {
            "blur": quality["blur"],
            "brightness": quality["brightness"],
            "contrast": quality["contrast"],
            "face_ratio": face_result.get("face_ratio", 0.0),
            "doc_area_ratio": doc_result.get("area_ratio", 0.0),
        },
    }
