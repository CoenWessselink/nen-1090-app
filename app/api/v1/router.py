from fastapi import APIRouter

from app.api.v1 import (
    assemblies,
    attachments,
    audit,
    auth,
    billing,
    compliance,
    dashboard,
    exports,
    exports_global,
    health,
    inspections,
    onboarding,
    ops,
    photos,
    platform,
    platform_enterprise,
    project_documents,
    projects,
    reporting_search,
    settings_inspection_templates,
    settings_masterdata,
    tenant_billing,
    tenant_billing_enterprise,
    tenant_status,
    weld_defects,
    welds,
    welds_admin,
)
from app.api.v1.ce_export_contract import router as ce_export_contract_router
from app.api.v1.compat_contracts import router as compat_contracts_router

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(projects.router)
api_router.include_router(welds.router)
api_router.include_router(welds_admin.router)
api_router.include_router(inspections.router)
api_router.include_router(assemblies.router)
api_router.include_router(photos.router)
api_router.include_router(settings_inspection_templates.router)
api_router.include_router(settings_masterdata.router)
api_router.include_router(attachments.router)
api_router.include_router(weld_defects.router)
api_router.include_router(project_documents.router)
api_router.include_router(compliance.router)
api_router.include_router(exports.router)
api_router.include_router(reporting_search.router)
api_router.include_router(platform.router)
api_router.include_router(platform_enterprise.router)
api_router.include_router(billing.router)
api_router.include_router(tenant_billing.router)
api_router.include_router(tenant_billing_enterprise.router)
api_router.include_router(tenant_status.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit.router)
api_router.include_router(exports_global.router)
api_router.include_router(compat_contracts_router)
api_router.include_router(ce_export_contract_router)
api_router.include_router(onboarding.router)
api_router.include_router(ops.router)
