from fastapi import APIRouter

router = APIRouter(prefix="/settings")

@router.get("/wps")
def wps():
    return []

@router.get("/welders")
def welders():
    return []

@router.get("/weld-coordinators")
def coords():
    return []
