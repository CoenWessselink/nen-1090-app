from fastapi import APIRouter

from app.api.v1 import (
    auth,
    projects,
    welds,
    welds_admin,
    inspections,
    settings_inspection_templates,
    settings_masterdata,
    attachments,
    weld_defects,
    platform,
    billing,
    tenant_billing,
    tenant_status,
    health,
)
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.audit import router as audit_router
from app.api.v1.exports_global import router as exports_global_router
from app.api.v1.ce_export_contract import router as ce_export_contract_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, tags=["health"])

api_router.include_router(projects.router)
api_router.include_router(welds.router)
api_router.include_router(welds_admin.router)
api_router.include_router(inspections.router)
api_router.include_router(settings_inspection_templates.router)
api_router.include_router(settings_masterdata.router)
api_router.include_router(attachments.router)
api_router.include_router(weld_defects.router)

# Platform / SaaS (Klantbeheer)
api_router.include_router(platform.router)
api_router.include_router(billing.router)
api_router.include_router(tenant_billing.router)
api_router.include_router(tenant_status.router)

# Extra compatibility and audit routers
api_router.include_router(dashboard_router)
api_router.include_router(audit_router)
api_router.include_router(exports_global_router)
api_router.include_router(ce_export_contract_router)
