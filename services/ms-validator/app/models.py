from pydantic import BaseModel


class ValidateDocumentRequest(BaseModel):
    imageBase64: str
    type: str
    side: str


class ValidateSelfieDocumentRequest(BaseModel):
    imageBase64: str


class ValidateFaceRequest(BaseModel):
    imageBase64: str
