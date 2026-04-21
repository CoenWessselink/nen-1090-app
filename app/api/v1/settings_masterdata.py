from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from app.api.deps import get_db, get_current_tenant_id, get_current_user, require_role
from app.core.audit import audit
from app.db.models import WpsMaster, MaterialMaster, WelderMaster, ProjectWps, ProjectMaterial, ProjectWelder, CompanySettings, WeldCoordinator, Attachment, Project

router = APIRouter(prefix="/settings", tags=["settings"])


def _safe_all(query, fallback=None):
    try:
        return query.all()
    except (ProgrammingError, OperationalError):
        return fallback if fallback is not None else []


def _safe_first(query, fallback=None):
    try:
        return query.first()
    except (ProgrammingError, OperationalError):
        return fallback


class WpsIn(BaseModel):
    kind: str = Field(default="WPS", pattern=r"^(WPS|WPQR)$")
    code: str
    title: str | None = None
    document_no: str | None = None
    version: str | None = None


class WpsOut(BaseModel):
    id: UUID
    kind: str
    code: str
    title: str | None = None
    document_no: str | None = None
    version: str | None = None

    class Config:
        from_attributes = True


@router.get("/wps", response_model=list[WpsOut])
def list_wps(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return _safe_all(db.query(WpsMaster).filter(WpsMaster.tenant_id == tenant_id).order_by(WpsMaster.kind.asc(), WpsMaster.code.asc()), [])


@router.post("/wps", response_model=WpsOut)
def create_wps(
    payload: WpsIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = WpsMaster(
        tenant_id=tenant_id,
        kind=payload.kind,
        code=payload.code.strip(),
        title=(payload.title or None),
        document_no=(payload.document_no or None),
        version=(payload.version or None),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="WPS code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_create", entity="wps_master", entity_id=str(row.id), meta={"kind": row.kind, "code": row.code})
    return row


class WpsPatch(BaseModel):
    kind: str | None = Field(default=None, pattern=r"^(WPS|WPQR)$")
    code: str | None = None
    title: str | None = None
    document_no: str | None = None
    version: str | None = None


@router.patch("/wps/{wps_id}", response_model=WpsOut)
def patch_wps(
    wps_id: UUID,
    payload: WpsPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WpsMaster).filter(WpsMaster.id == wps_id, WpsMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="WPS code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_update", entity="wps_master", entity_id=str(row.id))
    return row


@router.delete("/wps/{wps_id}")
def delete_wps(
    wps_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WpsMaster).filter(WpsMaster.id == wps_id, WpsMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectWps).filter(ProjectWps.tenant_id == tenant_id, ProjectWps.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_delete", entity="wps_master", entity_id=str(wps_id))
    return {"ok": True}


# --- Materials ---
class MaterialIn(BaseModel):
    code: str
    title: str | None = None


class MaterialOut(BaseModel):
    id: UUID
    code: str
    title: str | None = None

    class Config:
        from_attributes = True


@router.get("/materials", response_model=list[MaterialOut])
def list_materials(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return _safe_all(db.query(MaterialMaster).filter(MaterialMaster.tenant_id == tenant_id).order_by(MaterialMaster.code.asc()), [])


@router.post("/materials", response_model=MaterialOut)
def create_material(
    payload: MaterialIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = MaterialMaster(tenant_id=tenant_id, code=payload.code.strip(), title=(payload.title or None))
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_create", entity="materials_master", entity_id=str(row.id))
    return row


class MaterialPatch(BaseModel):
    code: str | None = None
    title: str | None = None


@router.patch("/materials/{material_id}", response_model=MaterialOut)
def patch_material(
    material_id: UUID,
    payload: MaterialPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(MaterialMaster).filter(MaterialMaster.id == material_id, MaterialMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_update", entity="materials_master", entity_id=str(row.id))
    return row


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(MaterialMaster).filter(MaterialMaster.id == material_id, MaterialMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectMaterial).filter(ProjectMaterial.tenant_id == tenant_id, ProjectMaterial.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_delete", entity="materials_master", entity_id=str(material_id))
    return {"ok": True}


# --- Welders ---
class WelderIn(BaseModel):
    code: str
    name: str | None = None


class WelderOut(BaseModel):
    id: UUID
    code: str
    name: str | None = None

    class Config:
        from_attributes = True


@router.get("/welders", response_model=list[WelderOut])
def list_welders(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return _safe_all(db.query(WelderMaster).filter(WelderMaster.tenant_id == tenant_id).order_by(WelderMaster.code.asc()), [])


@router.post("/welders", response_model=WelderOut)
def create_welder(
    payload: WelderIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = WelderMaster(tenant_id=tenant_id, code=payload.code.strip(), name=(payload.name or None))
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Welder code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_create", entity="welders_master", entity_id=str(row.id))
    return row


class WelderPatch(BaseModel):
    code: str | None = None
    name: str | None = None


@router.patch("/welders/{welder_id}", response_model=WelderOut)
def patch_welder(
    welder_id: UUID,
    payload: WelderPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WelderMaster).filter(WelderMaster.id == welder_id, WelderMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Welder code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_update", entity="welders_master", entity_id=str(row.id))
    return row


@router.delete("/welders/{welder_id}")
def delete_welder(
    welder_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WelderMaster).filter(WelderMaster.id == welder_id, WelderMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectWelder).filter(ProjectWelder.tenant_id == tenant_id, ProjectWelder.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_delete", entity="welders_master", entity_id=str(welder_id))
    return {"ok": True}


# --- Company settings ---
class CompanySettingsIn(BaseModel):
    company_name: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    kvk_number: str | None = None
    vat_number: str | None = None
    logo_attachment_id: UUID | None = None


class CompanySettingsOut(CompanySettingsIn):
    id: UUID | None = None
    tenant_id: UUID | None = None
    logo_download_url: str | None = None

    class Config:
        from_attributes = True


def _serialize_company_settings(row: CompanySettings | None, tenant_id: UUID) -> dict:
    if not row:
        return {
            "id": None,
            "tenant_id": tenant_id,
            "company_name": None,
            "address_line_1": None,
            "address_line_2": None,
            "postal_code": None,
            "city": None,
            "country": None,
            "phone": None,
            "email": None,
            "website": None,
            "kvk_number": None,
            "vat_number": None,
            "logo_attachment_id": None,
            "logo_download_url": None,
        }
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "company_name": row.company_name,
        "address_line_1": row.address_line_1,
        "address_line_2": row.address_line_2,
        "postal_code": row.postal_code,
        "city": row.city,
        "country": row.country,
        "phone": row.phone,
        "email": row.email,
        "website": row.website,
        "kvk_number": row.kvk_number,
        "vat_number": row.vat_number,
        "logo_attachment_id": row.logo_attachment_id,
        "logo_download_url": f"/api/v1/attachments/{row.logo_attachment_id}/download" if row.logo_attachment_id else None,
    }


@router.get("/company", response_model=CompanySettingsOut)
def get_company_settings(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    row = _safe_first(db.query(CompanySettings).filter(CompanySettings.tenant_id == tenant_id), None)
    return _serialize_company_settings(row, tenant_id)


@router.put("/company", response_model=CompanySettingsOut)
def update_company_settings(
    payload: CompanySettingsIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = _safe_first(db.query(CompanySettings).filter(CompanySettings.tenant_id == tenant_id), None)
    if not row:
        row = CompanySettings(tenant_id=tenant_id)
        db.add(row)
        db.flush()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_company_update", entity="company_settings", entity_id=str(row.id))
    return _serialize_company_settings(row, tenant_id)


@router.post("/company/logo", response_model=CompanySettingsOut)
async def upload_company_logo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    import json
    import os
    import uuid
    from pathlib import Path

    storage_root = Path(__file__).resolve().parents[4] / "storage" / "attachments"
    att_id = uuid.uuid4()
    tenant_dir = storage_root / str(tenant_id) / str(att_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    filename = os.path.basename(file.filename or "logo")
    storage_path = tenant_dir / filename
    size = 0
    with storage_path.open("wb") as handle:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
            size += len(chunk)
    attachment = Attachment(
        id=att_id,
        tenant_id=tenant_id,
        scope_type="company",
        scope_id=tenant_id,
        kind="logo",
        filename=filename,
        storage_path=str(storage_path),
        mime_type=file.content_type,
        size_bytes=size,
        meta_json=json.dumps({"uploaded_via": "settings/company/logo"}),
        uploaded_by=getattr(user, "id", None),
    )
    db.add(attachment)
    row = _safe_first(db.query(CompanySettings).filter(CompanySettings.tenant_id == tenant_id), None)
    if not row:
        row = CompanySettings(tenant_id=tenant_id)
        db.add(row)
        db.flush()
    row.logo_attachment_id = attachment.id
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_company_logo_upload", entity="company_settings", entity_id=str(row.id), meta={"attachment_id": str(attachment.id), "filename": filename})
    return _serialize_company_settings(row, tenant_id)


# --- Weld coordinators ---
class WeldCoordinatorIn(BaseModel):
    code: str
    name: str | None = None
    process: str | None = None
    qualification: str | None = None
    certificate_no: str | None = None
    certificate_valid_until: str | None = None
    is_active: bool = True
    notes: str | None = None


class WeldCoordinatorOut(BaseModel):
    id: UUID
    code: str
    name: str | None = None
    process: str | None = None
    qualification: str | None = None
    certificate_no: str | None = None
    certificate_valid_until: str | None = None
    is_active: bool = True
    notes: str | None = None

    class Config:
        from_attributes = True


@router.get("/weld-coordinators", response_model=list[WeldCoordinatorOut])
def list_weld_coordinators(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return _safe_all(db.query(WeldCoordinator).filter(WeldCoordinator.tenant_id == tenant_id).order_by(WeldCoordinator.code.asc()), [])


@router.post("/weld-coordinators", response_model=WeldCoordinatorOut)
def create_weld_coordinator(
    payload: WeldCoordinatorIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = WeldCoordinator(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_weld_coordinator_create", entity="weld_coordinator", entity_id=str(row.id))
    return row


class WeldCoordinatorPatch(BaseModel):
    code: str | None = None
    name: str | None = None
    process: str | None = None
    qualification: str | None = None
    certificate_no: str | None = None
    certificate_valid_until: str | None = None
    is_active: bool | None = None
    notes: str | None = None


@router.patch("/weld-coordinators/{coordinator_id}", response_model=WeldCoordinatorOut)
def patch_weld_coordinator(
    coordinator_id: UUID,
    payload: WeldCoordinatorPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WeldCoordinator).filter(WeldCoordinator.id == coordinator_id, WeldCoordinator.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_weld_coordinator_update", entity="weld_coordinator", entity_id=str(row.id))
    return row


@router.delete("/weld-coordinators/{coordinator_id}")
def delete_weld_coordinator(
    coordinator_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WeldCoordinator).filter(WeldCoordinator.id == coordinator_id, WeldCoordinator.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_weld_coordinator_delete", entity="weld_coordinator", entity_id=str(coordinator_id))
    return {"ok": True}



class ClientOut(BaseModel):
    id: str
    code: str | None = None
    name: str


@router.get("/clients", response_model=list[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    rows = (
        db.query(Project.client_name)
        .filter(Project.tenant_id == tenant_id, Project.client_name.isnot(None))
        .distinct()
        .order_by(Project.client_name.asc())
        .all()
    )
    items: list[ClientOut] = []
    for idx, (client_name,) in enumerate(rows, start=1):
        name = (client_name or '').strip()
        if not name:
            continue
        items.append(ClientOut(id=f'client-{idx}', code=name, name=name))
    if not items:
        fallback = ['CWS Staalbouw', 'Demo Opdrachtgever', 'Interne productie']
        items = [ClientOut(id=f'client-fallback-{idx}', code=name, name=name) for idx, name in enumerate(fallback, start=1)]
    return items


class ProcessOut(BaseModel):
    id: str
    code: str
    name: str


@router.get("/processes", response_model=list[ProcessOut])
def list_processes(
    _db: Session = Depends(get_db),
    _tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return [
        ProcessOut(id='process-135', code='135', name='135 (MAG)'),
        ProcessOut(id='process-111', code='111', name='111 (BMBE)'),
        ProcessOut(id='process-141', code='141', name='141 (TIG)'),
    ]
