from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, or_, text
from sqlalchemy.orm import Session, load_only

from app.api.deps import (
    get_current_claims,
    get_current_tenant_id,
    get_current_user,
    get_db,
    require_tenant_write,
)
from app.core.audit import audit
from app.db.models import (
    Assembly,
    Attachment,
    ExportJob,
    InspectionCheck,
    InspectionPlanTemplate,
    MaterialMaster,
    MaterialRecord,
    Project,
    ProjectMaterial,
    ProjectWelder,
    ProjectWps,
    Weld,
    WeldDefect,
    WeldInspection,
    WelderMaster,
    WpsMaster,
)
from app.schemas.projects import ProjectCreate, ProjectOut, ProjectUpdate
from app.api.v1.workflow_rollup import choose_default_template_id, normalize_project_status

router = APIRouter(prefix="/projects", tags=["projects"])

STATUS_MAP = {
    "concept": "concept",
    "open": "in_controle",
    "in controle": "in_controle",
    "in-controle": "in_controle",
    "in_controle": "in_controle",
    "gereed": "conform",
    "ready": "conform",
    "conform": "conform",
    "approved": "conform",
    "afgekeurd": "niet_conform",
    "rejected": "niet_conform",
    "niet_conform": "niet_conform",
    "niet-conform": "niet_conform",
    "not_ok": "niet_conform",
}

PROJECT_SORT_COLUMNS = {
    "code": Project.code,
    "name": Project.name,
    "client_name": Project.client_name,
    "execution_class": Project.execution_class,
    "acceptance_class": Project.acceptance_class,
    "status": Project.status,
    "created_at": Project.created_at,
    "updated_at": Project.updated_at,
}

ASSEMBLY_SORT_COLUMNS = {
    "code": Assembly.code,
    "name": Assembly.name,
    "status": Assembly.status,
    "created_at": Assembly.created_at,
    "updated_at": Assembly.updated_at,
}

WELD_SORT_COLUMNS = {
    "weld_no": Weld.weld_no,
    "status": Weld.status,
    "process": Weld.process,
    "material": Weld.material,
    "created_at": Weld.created_at,
    "updated_at": Weld.updated_at,
}

INSPECTION_SORT_COLUMNS = {
    "status": WeldInspection.overall_status,
    "inspector": WeldInspection.inspector,
    "inspected_at": WeldInspection.inspected_at,
    "created_at": WeldInspection.created_at,
    "updated_at": WeldInspection.updated_at,
}


class ApplyTemplateBody(ProjectUpdate):
    template_id: UUID
    mode: str = "merge"


class ApproveAllBody(ProjectUpdate):
    mode: str = "open_only"


class PagedListResponse(dict):
    pass


class ProjectSelectionBody(ProjectUpdate):
    ref_id: UUID


def _sort_clause(sort: str | None, direction: str | None, mapping: dict[str, Any], default_key: str):
    key = (sort or default_key).strip()
    column = mapping.get(key, mapping[default_key])
    return desc(column) if (direction or "desc").lower() == "desc" else asc(column)


def _page_slice(page: int, limit: int) -> tuple[int, int]:
    safe_page = max(1, int(page or 1))
    safe_limit = max(1, min(200, int(limit or 25)))
    start = (safe_page - 1) * safe_limit
    end = start + safe_limit
    return start, end


def _safe_str(value: Any) -> str | None:
    return None if value is None else str(value)


def _normalize_status(value: str | None, default: str = "conform") -> str:
    raw = (value or default).strip().lower()
    normalized = STATUS_MAP.get(raw, raw or default)
    return normalize_project_status(normalized, default)



def _project_or_404(db: Session, tenant_id: UUID, project_id: UUID) -> Project:
    row = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return row


def _project_or_404_safe(db: Session, tenant_id: UUID, project_id: UUID):
    try:
        return db.query(Project).options(
            load_only(
                Project.id,
                Project.code,
                Project.name,
                Project.status,
                Project.start_date,
                Project.end_date,
            )
        ).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    except Exception:
        row = db.execute(
            text(
                """
                SELECT id, code, name, status, start_date, end_date
                FROM projects
                WHERE id = :project_id AND tenant_id = :tenant_id
                LIMIT 1
                """
            ),
            {"project_id": str(project_id), "tenant_id": str(tenant_id)},
        ).mappings().first()
        return row


def _project_card(row: Project) -> dict[str, Any]:
    normalized_status = _normalize_status(getattr(row, "status", None), default="in_controle")
    return {
        "id": _safe_str(row.id),
        "code": row.code,
        "name": row.name,
        "client_name": row.client_name,
        "execution_class": row.execution_class,
        "acceptance_class": row.acceptance_class,
        "locked": bool(getattr(row, "locked", False)),
        "default_template_id": _safe_str(getattr(row, "default_template_id", None)),
        "inspection_template_id": _safe_str(getattr(row, "default_template_id", None)),
        "status": normalized_status,
        "status_badge": normalized_status,
        "is_non_conform": normalized_status == "niet_conform",
        "start_date": row.start_date.isoformat() if row.start_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "edit_url": f"/projects/{_safe_str(row.id)}",
        "compliance_url": f"/api/v1/projects/{_safe_str(row.id)}/compliance",
        "ce_dossier_url": f"/api/v1/projects/{_safe_str(row.id)}/ce-dossier",
    }


def _assembly_card(row: Assembly) -> dict[str, Any]:
    return {
        "id": _safe_str(row.id),
        "project_id": _safe_str(row.project_id),
        "code": row.code,
        "name": row.name,
        "drawing_no": row.drawing_no,
        "revision": row.revision,
        "status": row.status,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _weld_card(row: Weld) -> dict[str, Any]:
    return {
        "id": _safe_str(row.id),
        "project_id": _safe_str(row.project_id),
        "weld_no": row.weld_no,
        "location": row.location,
        "wps": row.wps,
        "process": row.process,
        "material": row.material,
        "thickness": row.thickness,
        "welders": row.welders,
        "vt_status": row.vt_status,
        "ndo_status": row.ndo_status,
        "photos": int(row.photos or 0),
        "status": row.status,
        "result": row.result,
        "inspector": row.inspector,
        "inspected_at": row.inspected_at.isoformat() if row.inspected_at else None,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _inspection_card(row: WeldInspection) -> dict[str, Any]:
    checks_total = len(getattr(row, "checks", []) or [])
    approved_checks = len([c for c in (getattr(row, "checks", []) or []) if getattr(c, "approved", False)])
    return {
        "id": _safe_str(row.id),
        "project_id": _safe_str(row.project_id),
        "weld_id": _safe_str(row.weld_id),
        "inspector": row.inspector,
        "inspected_at": row.inspected_at.isoformat() if row.inspected_at else None,
        "status": row.overall_status,
        "overall_status": row.overall_status,
        "remarks": row.remarks,
        "checks_total": checks_total,
        "checks_approved": approved_checks,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _document_card(row: Attachment) -> dict[str, Any]:
    meta = {}
    try:
        meta = json.loads(getattr(row, "meta_json", None) or "{}")
    except Exception:
        meta = {}
    return {
        "id": _safe_str(row.id),
        "project_id": _safe_str(meta.get("project_id") or row.scope_id),
        "title": meta.get("title") or row.filename,
        "type": meta.get("type") or row.kind or "document",
        "status": meta.get("status") or "actief",
        "version": str(meta.get("version") or "1.0"),
        "filename": row.filename,
        "mime_type": row.mime_type,
        "size_bytes": int(row.size_bytes or 0),
        "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
    }


def _export_card(row: ExportJob) -> dict[str, Any]:
    return {
        "id": _safe_str(row.id),
        "project_id": _safe_str(row.project_id),
        "export_type": row.export_type,
        "status": row.status,
        "bundle_type": row.bundle_type,
        "requested_by": row.requested_by,
        "file_path": row.file_path,
        "message": row.message,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }


def _paged(items: list[dict[str, Any]], page: int, limit: int) -> dict[str, Any]:
    total = len(items)
    start, end = _page_slice(page, limit)
    safe_page = max(1, int(page or 1))
    safe_limit = max(1, min(200, int(limit or 25)))
    return {"items": items[start:end], "total": total, "page": safe_page, "limit": safe_limit}


def _apply_project_payload(row: Project, payload: dict[str, Any], db: Session | None = None, tenant_id: UUID | None = None) -> Project:
    for field in ["code", "name", "client_name", "execution_class", "acceptance_class", "start_date", "end_date", "default_template_id", "coordinator_id", "notes"]:
        if field in payload:
            setattr(row, field, payload[field])
    if "status" in payload and payload["status"] is not None:
        row.status = _normalize_status(payload["status"], default=row.status or "conform")
    elif not getattr(row, "status", None):
        row.status = "conform"
    if "locked" in payload and payload["locked"] is not None:
        row.locked = bool(payload["locked"])
    if db is not None and tenant_id is not None and getattr(row, "execution_class", None) and not getattr(row, "default_template_id", None):
        row.default_template_id = choose_default_template_id(db, tenant_id, row.execution_class)
    return row


def _bulk_add(db: Session, tenant_id, user_id, project_id: UUID, master_model, link_model, kind: str):
    masters = db.query(master_model).filter(master_model.tenant_id == tenant_id).all()
    if not masters:
        return 0
    existing = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id).all()
    existing_ids = {e.ref_id for e in existing}
    to_add = [m for m in masters if m.id not in existing_ids]
    for m in to_add:
        db.add(link_model(tenant_id=tenant_id, project_id=project_id, ref_id=m.id, added_by=user_id))
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=f"add_all_{kind}", entity="project", entity_id=str(project_id), meta={"added": len(to_add)})
    return len(to_add)


def _list_selected_refs(db: Session, tenant_id: UUID, project_id: UUID, link_model, master_model, label_keys: tuple[str, ...]):
    rows = db.query(link_model, master_model).join(master_model, master_model.id == link_model.ref_id).filter(
        link_model.tenant_id == tenant_id,
        link_model.project_id == project_id,
    ).order_by(master_model.created_at.asc()).all()
    items: list[dict[str, Any]] = []
    for link, master in rows:
        label = None
        for key in label_keys:
            value = getattr(master, key, None)
            if value:
                label = str(value)
                break
        items.append({
            "id": _safe_str(getattr(master, "id", None)),
            "ref_id": _safe_str(getattr(link, "ref_id", None)),
            "project_id": _safe_str(getattr(link, "project_id", None)),
            "label": label or _safe_str(getattr(master, "id", None)),
            "name": getattr(master, "name", None),
            "code": getattr(master, "code", None),
            "kind": getattr(master, "kind", None),
            "added_at": getattr(link, "added_at", None).isoformat() if getattr(link, "added_at", None) else None,
        })
    return items


def _create_selected_ref(db: Session, tenant_id: UUID, user_id: UUID, project_id: UUID, ref_id: UUID, link_model, master_model, action: str):
    _project_or_404(db, tenant_id, project_id)
    master = db.query(master_model).filter(master_model.id == ref_id, master_model.tenant_id == tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Referentie niet gevonden")
    existing = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id, link_model.ref_id == ref_id).first()
    if existing:
        return {"ok": True, "exists": True, "ref_id": str(ref_id)}
    db.add(link_model(tenant_id=tenant_id, project_id=project_id, ref_id=ref_id, added_by=user_id))
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=action, entity="project", entity_id=str(project_id), meta={"ref_id": str(ref_id)})
    return {"ok": True, "created": True, "ref_id": str(ref_id)}


def _delete_selected_ref(db: Session, tenant_id: UUID, user_id: UUID, project_id: UUID, ref_id: UUID, link_model, action: str):
    _project_or_404(db, tenant_id, project_id)
    row = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id, link_model.ref_id == ref_id).first()
    if not row:
        return {"ok": True, "removed": False, "ref_id": str(ref_id)}
    db.delete(row)
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=action, entity="project", entity_id=str(project_id), meta={"ref_id": str(ref_id)})
    return {"ok": True, "removed": True, "ref_id": str(ref_id)}


@router.get("")
def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str = "created_at",
    direction: str = "desc",
    status: str | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
):
    query = db.query(Project).filter(Project.tenant_id == tenant_id)
    if status:
        query = query.filter(Project.status == _normalize_status(status, default=status))
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Project.code.ilike(needle),
                Project.name.ilike(needle),
                Project.client_name.ilike(needle),
                Project.execution_class.ilike(needle),
                Project.acceptance_class.ilike(needle),
                Project.status.ilike(needle),
            )
        )
    rows = query.order_by(_sort_clause(sort, direction, PROJECT_SORT_COLUMNS, "created_at")).all()
    return _paged([_project_card(row) for row in rows], page, limit)


@router.post("")
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    row = Project(tenant_id=tenant_id)
    _apply_project_payload(row, payload.model_dump(exclude_unset=True), db=db, tenant_id=tenant_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_create", entity="project", entity_id=str(row.id), meta={"code": row.code, "role": claims.get("role")})
    return _project_card(row)


@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
):

row = _project_or_404_safe(db, tenant_id, project_id)
if not row:
    raise HTTPException(status_code=404, detail="Project not found")
if isinstance(row, dict) or hasattr(row, "keys"):
    return {
        "id": str(row.get("id")),
        "code": row.get("code"),
        "name": row.get("name"),
        "client_name": None,
        "execution_class": None,
        "acceptance_class": None,
        "locked": False,
        "default_template_id": None,
        "inspection_template_id": None,
        "status": row.get("status") or "in_controle",
        "status_badge": row.get("status") or "in_controle",
        "is_non_conform": (row.get("status") or "") == "niet_conform",
        "start_date": row.get("start_date").isoformat() if row.get("start_date") else None,
        "end_date": row.get("end_date").isoformat() if row.get("end_date") else None,
        "created_at": None,
        "updated_at": None,
        "edit_url": f"/projects/{project_id}",
        "compliance_url": f"/api/v1/projects/{project_id}/compliance",
        "ce_dossier_url": f"/api/v1/projects/{project_id}/ce-dossier",
    }
return _project_card(row)


@router.patch("/{project_id}")
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    row = _project_or_404(db, tenant_id, project_id)
    data = payload.model_dump(exclude_unset=True)
    if getattr(row, "locked", False):
        want_unlock = ("locked" in data and data.get("locked") is False)
        if not (want_unlock and claims.get("role") in ("tenant_admin", "platform_admin")):
            raise HTTPException(status_code=423, detail="Project is locked")
    _apply_project_payload(row, data, db=db, tenant_id=tenant_id)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_update", entity="project", entity_id=str(row.id), meta={"fields": sorted(data.keys())})
    return _project_card(row)


@router.put("/{project_id}")
def update_project_put(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return update_project(project_id, payload, db=db, tenant_id=tenant_id, user=user, claims=claims)


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    row = _project_or_404(db, tenant_id, project_id)
    if getattr(row, "locked", False) and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_delete", entity="project", entity_id=str(project_id), meta={"role": claims.get("role")})
    return {"ok": True, "id": str(project_id)}


@router.get("/{project_id}/assemblies")
def list_project_assemblies(
    project_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str = "created_at",
    direction: str = "desc",
    status: str | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    query = db.query(Assembly).filter(Assembly.tenant_id == tenant_id, Assembly.project_id == project_id)
    if status:
        query = query.filter(Assembly.status == status)
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(or_(Assembly.code.ilike(needle), Assembly.name.ilike(needle), Assembly.drawing_no.ilike(needle), Assembly.revision.ilike(needle)))
    rows = query.order_by(_sort_clause(sort, direction, ASSEMBLY_SORT_COLUMNS, "created_at")).all()
    return _paged([_assembly_card(row) for row in rows], page, limit)


@router.get("/{project_id}/welds")
def list_project_welds(
    project_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str = "created_at",
    direction: str = "desc",
    status: str | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    query = db.query(Weld).filter(Weld.tenant_id == tenant_id, Weld.project_id == project_id)
    if status:
        query = query.filter(Weld.status == _normalize_status(status, default=status))
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(or_(Weld.weld_no.ilike(needle), Weld.location.ilike(needle), Weld.wps.ilike(needle), Weld.process.ilike(needle), Weld.material.ilike(needle), Weld.welders.ilike(needle), Weld.status.ilike(needle)))
    rows = query.order_by(_sort_clause(sort, direction, WELD_SORT_COLUMNS, "created_at")).all()
    return _paged([_weld_card(row) for row in rows], page, limit)


@router.get("/{project_id}/inspections")
def list_project_inspections(
    project_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str = "created_at",
    direction: str = "desc",
    status: str | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    query = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id)
    if status:
        query = query.filter(WeldInspection.overall_status == status)
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(or_(WeldInspection.inspector.ilike(needle), WeldInspection.remarks.ilike(needle), WeldInspection.overall_status.ilike(needle)))
    rows = query.order_by(_sort_clause(sort, direction, INSPECTION_SORT_COLUMNS, "created_at")).all()
    return _paged([_inspection_card(row) for row in rows], page, limit)


@router.get("/{project_id}/documents")
def list_project_documents(
    project_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    search: str | None = None,
    sort: str = "uploaded_at",
    direction: str = "desc",
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    rows = db.query(Attachment).filter(
        Attachment.tenant_id == tenant_id,
        Attachment.scope_type == "project",
        Attachment.scope_id == project_id,
        Attachment.deleted_at.is_(None),
    ).all()
    cards = [_document_card(row) for row in rows]
    if search:
        needle = search.strip().lower()
        cards = [card for card in cards if needle in json.dumps(card, ensure_ascii=False).lower()]
    cards = sorted(cards, key=lambda x: x.get(sort) or "", reverse=(direction or "desc").lower()=="desc")
    return _paged(cards, page, limit)


@router.get("/{project_id}/exports")
def list_project_exports(
    project_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    rows = db.query(ExportJob).filter(ExportJob.tenant_id == tenant_id, ExportJob.project_id == project_id).order_by(ExportJob.created_at.desc()).all()
    return _paged([_export_card(row) for row in rows], page, limit)


def _ce_action(project_id: UUID, key: str, completed: bool, count: int = 0) -> dict[str, Any]:
    action_map = {
        "project_core": {
            "type": "project_edit",
            "label": "Project wijzigen",
            "method": "PATCH",
            "endpoint": f"/api/v1/projects/{project_id}",
        },
        "execution_class": {
            "type": "project_edit",
            "label": "EXC / template instellen",
            "method": "PATCH",
            "endpoint": f"/api/v1/projects/{project_id}",
        },
        "welds_present": {
            "type": "navigate",
            "label": "Lassen openen",
            "method": "GET",
            "endpoint": f"/api/v1/projects/{project_id}/welds",
        },
        "inspections_present": {
            "type": "navigate",
            "label": "Inspecties openen",
            "method": "GET",
            "endpoint": f"/api/v1/projects/{project_id}/inspections",
        },
        "documents_present": {
            "type": "navigate",
            "label": "Documenten openen",
            "method": "GET",
            "endpoint": f"/api/v1/projects/{project_id}/documents",
        },
        "wps_present": {
            "type": "mutate",
            "label": "Alle WPS koppelen",
            "method": "POST",
            "endpoint": f"/api/v1/projects/{project_id}/wps/add-all",
        },
        "materials_present": {
            "type": "mutate",
            "label": "Alle materialen koppelen",
            "method": "POST",
            "endpoint": f"/api/v1/projects/{project_id}/materials/add-all",
        },
        "welders_present": {
            "type": "mutate",
            "label": "Alle lassers koppelen",
            "method": "POST",
            "endpoint": f"/api/v1/projects/{project_id}/welders/add-all",
        },
        "open_defects": {
            "type": "navigate",
            "label": "Defecten controleren",
            "method": "GET",
            "endpoint": f"/api/v1/projects/{project_id}/welds",
        },
    }
    action = action_map.get(key, {
        "type": "navigate",
        "label": "Onderdeel openen",
        "method": "GET",
        "endpoint": f"/api/v1/projects/{project_id}",
    }).copy()
    action["completed"] = completed
    action["count"] = count
    return action


@router.get("/{project_id}/ce-dossier")
def get_project_ce_dossier(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    project = _project_or_404(db, tenant_id, project_id)
    welds = db.query(Weld).filter(Weld.tenant_id == tenant_id, Weld.project_id == project_id).all()
    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id).all()
    defects = db.query(WeldDefect).filter(WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.deleted_at.is_(None)).all()
    documents = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type.in_(["project", "weld", "inspection"]), Attachment.deleted_at.is_(None)).all()
    documents = [row for row in documents if str(getattr(row, "scope_id", "")) == str(project_id) or _safe_str(getattr(row, "scope_id", None)) in {_safe_str(getattr(w, "id", None)) for w in welds} or _safe_str(getattr(row, "scope_id", None)) in {_safe_str(getattr(i, "id", None)) for i in inspections}]
    wps_links = db.query(ProjectWps).filter(ProjectWps.tenant_id == tenant_id, ProjectWps.project_id == project_id).all()
    material_links = db.query(ProjectMaterial).filter(ProjectMaterial.tenant_id == tenant_id, ProjectMaterial.project_id == project_id).all()
    welder_links = db.query(ProjectWelder).filter(ProjectWelder.tenant_id == tenant_id, ProjectWelder.project_id == project_id).all()

    raw_checklist = [
        {"key": "project_core", "label": "Projectbasis aanwezig", "completed": bool(project.code and project.name), "count": 1 if project.code and project.name else 0, "why": "Projectnummer en projectnaam zijn vereist voor CE-dossieropbouw."},
        {"key": "execution_class", "label": "EXC-klasse ingesteld", "completed": bool(project.execution_class and project.default_template_id), "count": 1 if project.execution_class else 0, "why": "Executieklasse en inspectietemplate bepalen de vereiste controles."},
        {"key": "welds_present", "label": "Lassen geregistreerd", "completed": len(welds) > 0, "count": len(welds), "why": "Zonder lassen is geen lasdossier of inspectiestroom mogelijk."},
        {"key": "inspections_present", "label": "Inspecties aanwezig", "completed": len(inspections) > 0, "count": len(inspections), "why": "Inspecties zijn nodig om conformiteit aantoonbaar vast te leggen."},
        {"key": "documents_present", "label": "Documenten gekoppeld", "completed": len(documents) > 0, "count": len(documents), "why": "Documenten en foto’s vormen de bewijslaag van het dossier."},
        {"key": "wps_present", "label": "WPS gekoppeld", "completed": len(wps_links) > 0, "count": len(wps_links), "why": "WPS moet aantoonbaar gekoppeld zijn aan het project."},
        {"key": "materials_present", "label": "Materialen gekoppeld", "completed": len(material_links) > 0, "count": len(material_links), "why": "Materiaalcertificaten en records zijn onderdeel van traceerbaarheid."},
        {"key": "welders_present", "label": "Lassers gekoppeld", "completed": len(welder_links) > 0, "count": len(welder_links), "why": "Lassers moeten aantoonbaar bekend en gekoppeld zijn."},
        {"key": "open_defects", "label": "Geen open defecten", "completed": len([d for d in defects if (d.assessment or '').lower() not in ('repaired','accepted','closed')]) == 0, "count": len(defects), "why": "Open defecten blokkeren een conform eindresultaat."},
    ]
    checklist = []
    for item in raw_checklist:
        status = "conform" if item["completed"] else "niet_conform"
        checklist.append({
            **item,
            "status": status,
            "action": _ce_action(project_id, item["key"], item["completed"], item.get("count", 0)),
        })
    missing_items = [item for item in checklist if not item["completed"]]
    completed = len([item for item in checklist if item["completed"]])
    score = round((completed / len(checklist)) * 100, 2) if checklist else 100.0
    overall_status = "niet_conform" if any(item["key"] in {"execution_class", "open_defects"} and not item["completed"] for item in checklist) else "conform" if not missing_items else "in_controle"
    return {
        "project": _project_card(project),
        "project_id": str(project_id),
        "status": overall_status,
        "score": score,
        "summary": {
            "welds": len(welds),
            "inspections": len(inspections),
            "defects": len(defects),
            "documents": len(documents),
            "wps": len(wps_links),
            "materials": len(material_links),
            "welders": len(welder_links),
        },
        "checklist": checklist,
        "missing_items": missing_items,
        "refresh": {
            "project": f"/api/v1/projects/{project_id}",
            "compliance": f"/api/v1/projects/{project_id}/compliance",
            "ce_dossier": f"/api/v1/projects/{project_id}/ce-dossier",
        },
    }


@router.get("/{project_id}/ce-dossier/actions/{check_key}")
def get_project_ce_dossier_action(
    project_id: UUID,
    check_key: str,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    payload = get_project_ce_dossier(project_id=project_id, db=db, tenant_id=tenant_id, _user=_user)
    for item in payload["checklist"]:
        if item["key"] == check_key:
            return item
    raise HTTPException(status_code=404, detail="Checklist item not found")


@router.get("/{project_id}/compliance")
def get_project_compliance(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    payload = get_project_ce_dossier(project_id=project_id, db=db, tenant_id=tenant_id, _user=_user)
    return {
        "project_id": str(project_id),
        "status": payload["status"],
        "score": payload["score"],
        "summary": payload["summary"],
        "checklist": payload["checklist"],
        "missing_items": payload["missing_items"],
    }




@router.post('/{project_id}/apply-inspection-template')
def apply_project_inspection_template_legacy(
    project_id: UUID,
    payload: ApplyTemplateBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return apply_project_inspection_template(project_id, payload, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)
@router.post("/{project_id}/inspection-template/apply")
def apply_inspection_template(
    project_id: UUID,
    body: ApplyTemplateBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    project = _project_or_404(db, tenant_id, project_id)
    template = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.id == body.template_id, InspectionPlanTemplate.tenant_id == tenant_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    mode = (body.mode or "merge").lower()
    if mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    if mode == "replace" and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        items = json.loads(template.items_json or "[]")
    except Exception:
        items = []
    wanted: list[tuple[str, str]] = []
    for item in items:
        group_key = str(item.get("groep") or item.get("group") or item.get("group_key") or "pre")
        criterion_key = str(item.get("key") or item.get("criterion_key") or "").strip()
        if criterion_key:
            wanted.append((group_key, criterion_key))
    wanted = list(dict.fromkeys(wanted))

    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id).all()
    added = 0
    removed = 0
    for inspection in inspections:
        existing_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == inspection.id).all()
        existing_by_key = {(c.group_key, c.criterion_key): c for c in existing_checks}
        if mode == "replace":
            wanted_set = set(wanted)
            for check in existing_checks:
                if (check.group_key, check.criterion_key) not in wanted_set:
                    db.delete(check)
                    removed += 1
        for group_key, criterion_key in wanted:
            if (group_key, criterion_key) in existing_by_key:
                continue
            db.add(InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=inspection.id,
                group_key=group_key,
                criterion_key=criterion_key,
                applicable=True,
                approved=False,
                comment=None,
            ))
            added += 1
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="apply_inspection_template", entity="project", entity_id=str(project.id), meta={"template_id": str(body.template_id), "mode": mode, "checks_added": added, "checks_removed": removed})
    return {"ok": True, "mode": mode, "checks_added": added, "checks_removed": removed}


@router.get("/{project_id}/selected/materials")
def list_selected_materials(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    return _list_selected_refs(db, tenant_id, project_id, ProjectMaterial, MaterialMaster, ("name", "code", "grade"))


@router.post("/{project_id}/selected/materials")
def add_selected_material(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _create_selected_ref(db, tenant_id, user.id, project_id, body.ref_id, ProjectMaterial, MaterialMaster, "project_material_link_add")


@router.delete("/{project_id}/selected/materials/{ref_id}")
def delete_selected_material(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _delete_selected_ref(db, tenant_id, user.id, project_id, ref_id, ProjectMaterial, "project_material_link_remove")


@router.get("/{project_id}/selected/wps")
def list_selected_wps(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    return _list_selected_refs(db, tenant_id, project_id, ProjectWps, WpsMaster, ("name", "code"))


@router.post("/{project_id}/selected/wps")
def add_selected_wps(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _create_selected_ref(db, tenant_id, user.id, project_id, body.ref_id, ProjectWps, WpsMaster, "project_wps_link_add")


@router.delete("/{project_id}/selected/wps/{ref_id}")
def delete_selected_wps(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _delete_selected_ref(db, tenant_id, user.id, project_id, ref_id, ProjectWps, "project_wps_link_remove")


@router.get("/{project_id}/selected/welders")
def list_selected_welders(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    return _list_selected_refs(db, tenant_id, project_id, ProjectWelder, WelderMaster, ("name", "code", "welder_no"))


@router.post("/{project_id}/selected/welders")
def add_selected_welder(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _create_selected_ref(db, tenant_id, user.id, project_id, body.ref_id, ProjectWelder, WelderMaster, "project_welder_link_add")


@router.delete("/{project_id}/selected/welders/{ref_id}")
def delete_selected_welder(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    return _delete_selected_ref(db, tenant_id, user.id, project_id, ref_id, ProjectWelder, "project_welder_link_remove")


@router.post("/{project_id}/wps/add-all")
def add_all_wps(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    _project_or_404(db, tenant_id, project_id)
    n = _bulk_add(db, tenant_id, user.id, project_id, WpsMaster, ProjectWps, "wps")
    return {"ok": True, "wps_added": n}


@router.post("/{project_id}/materials/add-all")
def add_all_materials(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    _project_or_404(db, tenant_id, project_id)
    n = _bulk_add(db, tenant_id, user.id, project_id, MaterialMaster, ProjectMaterial, "materials")
    return {"ok": True, "materials_added": n}


@router.post("/{project_id}/welders/add-all")
def add_all_welders(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _write=Depends(require_tenant_write),
):
    _project_or_404(db, tenant_id, project_id)
    n = _bulk_add(db, tenant_id, user.id, project_id, WelderMaster, ProjectWelder, "welders")
    return {"ok": True, "welders_added": n}


@router.post("/{project_id}/approve-all")
def approve_all_project(
    project_id: UUID,
    body: ApproveAllBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    project = _project_or_404(db, tenant_id, project_id)
    mode = (body.mode or "open_only").lower()
    if mode not in ("open_only", "overwrite_all"):
        raise HTTPException(status_code=400, detail="Invalid mode")

    welds = db.query(Weld).filter(Weld.tenant_id == tenant_id, Weld.project_id == project_id).all()
    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id).all()
    updated_welds = 0
    updated_inspections = 0

    for weld in welds:
        current = _normalize_status(weld.status, default=weld.status or "concept")
        if mode == "overwrite_all" or current in ("concept", "in_controle"):
            if weld.status != "gereed":
                weld.status = "gereed"
                weld.result = "ok"
                weld.vt_status = "ok"
                updated_welds += 1

    for inspection in inspections:
        current = _normalize_status(inspection.overall_status, default=inspection.overall_status or "open")
        if mode == "overwrite_all" or current in ("concept", "open", "in_controle"):
            if inspection.overall_status != "ok":
                inspection.overall_status = "ok"
                updated_inspections += 1
            for check in (getattr(inspection, "checks", []) or []):
                if not getattr(check, "approved", False):
                    check.approved = True

    open_defects = db.query(WeldDefect).filter(
        WeldDefect.tenant_id == tenant_id,
        WeldDefect.project_id == project_id,
        WeldDefect.deleted_at.is_(None),
    ).all()
    for defect in open_defects:
        if mode == "overwrite_all" or (defect.assessment or "open").lower() in ("open", "concept", "in_controle"):
            defect.assessment = "accepted"

    project.status = "gereed"
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_approve_all", entity="project", entity_id=str(project_id), meta={"mode": mode, "updated_welds": updated_welds, "updated_inspections": updated_inspections})
    return {
        "ok": True,
        "project_id": str(project_id),
        "mode": mode,
        "approvedWelds": updated_welds,
        "inspectionsSetOk": updated_inspections,
        "projectsMarkedReady": 1,
        "count": 1,
        "action": "approve_all",
    }


@router.get("/{project_id}/audit")
def get_project_audit(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _project_or_404(db, tenant_id, project_id)
    from app.db.models import AuditLog
    rows = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id, AuditLog.entity == "project", AuditLog.entity_id == str(project_id)).order_by(AuditLog.created_at.desc()).all()
    items = []
    for row in rows:
        items.append({
            "id": _safe_str(row.id),
            "action": row.action,
            "entity": row.entity,
            "entity_id": row.entity_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "meta": row.meta if hasattr(row, 'meta') else None,
        })
    return {"items": items, "total": len(items), "page": 1, "limit": len(items) or 1}
