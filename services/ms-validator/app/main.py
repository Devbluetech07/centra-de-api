from fastapi import FastAPI
from app.routes.api import router

app = FastAPI(title="ms-validator", version="0.1.0")
app.include_router(router)
