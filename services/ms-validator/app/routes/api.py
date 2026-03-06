from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import ValidateDocumentRequest, ValidateFaceRequest, ValidateSelfieDocumentRequest
from app.services.validator import validate_document, validate_face, validate_selfie_document

router = APIRouter()


@router.get("/health")
def health():
    return {"success": True, "service": "ms-validator"}


@router.post("/api/v1/validate/document")
def validate_document_route(payload: ValidateDocumentRequest):
    result = validate_document(payload.imageBase64, payload.type, payload.side)
    return {"success": True, "data": result}


@router.post("/api/v1/validate/selfie-document")
def validate_selfie_document_route(payload: ValidateSelfieDocumentRequest):
    result = validate_selfie_document(payload.imageBase64)
    return {"success": True, "data": result}


@router.post("/api/v1/validate/face")
def validate_face_route(payload: ValidateFaceRequest):
    result = validate_face(payload.imageBase64)
    return {"success": True, "data": result}


@router.websocket("/ws/validate-document")
async def ws_validate_document(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            result = validate_document(payload.get("imageBase64", ""), payload.get("type", "rg"), payload.get("side", "front"))
            await websocket.send_json({"success": True, "data": result})
    except WebSocketDisconnect:
        return


@router.websocket("/ws/validate-selfie-document")
async def ws_validate_selfie_document(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            result = validate_selfie_document(payload.get("imageBase64", ""))
            await websocket.send_json({"success": True, "data": result})
    except WebSocketDisconnect:
        return


@router.websocket("/ws/validate-face")
async def ws_validate_face(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            result = validate_face(payload.get("imageBase64", ""))
            await websocket.send_json({"success": True, "data": result})
    except WebSocketDisconnect:
        return
