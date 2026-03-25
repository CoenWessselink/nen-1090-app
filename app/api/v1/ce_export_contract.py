from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_db
from app.db.models import Assembly, Project, Weld, WeldInspection

router = APIRouter(tags=["ce_export"])


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def _serialize_project(project: Project | None) -> dict | None:
    if not project:
        return None
    return {
        "id": str(project.id),
        "code": getattr(project, "code", None),
        "name": getattr(project, "name", None),
        "client_name": getattr(project, "client_name", None),
        "execution_class": getattr(project, "execution_class", None),
        "acceptance_class": getattr(project, "acceptance_class", None),
        "status": getattr(project, "status", None),
        "locked": bool(getattr(project, "locked", False)),
        "start_date": getattr(project.start_date, "isoformat", lambda: None)() if getattr(project, "start_date", None) else None,
        "end_date": getattr(project.end_date, "isoformat", lambda: None)() if getattr(project, "end_date", None) else None,
    }


def _serialize_assembly(row: Assembly) -> dict:
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "code": row.code,
        "name": row.name,
        "drawing_no": row.drawing_no,
        "revision": row.revision,
        "status": row.status,
        "notes": getattr(row, "notes", None),
    }


def _serialize_weld(row: Weld) -> dict:
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "weld_no": getattr(row, "weld_no", None),
        "weld_number": getattr(row, "weld_no", None),
        "location": getattr(row, "location", None),
        "process": getattr(row, "process", None),
        "material": getattr(row, "material", None),
        "thickness": getattr(row, "thickness", None),
        "welders": getattr(row, "welders", None),
        "wps": getattr(row, "wps", None),
        "vt_status": getattr(row, "vt_status", None),
        "ndo_status": getattr(row, "ndo_status", None),
        "status": getattr(row, "status", None),
        "result": getattr(row, "result", None),
        "inspector": getattr(row, "inspector", None),
        "inspected_at": row.inspected_at.isoformat() if getattr(row, "inspected_at", None) else None,
        "photos": getattr(row, "photos", 0),
        "notes": getattr(row, "notes", None),
    }


def _serialize_inspection(row: WeldInspection) -> dict:
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "weld_id": str(row.weld_id),
        "inspector": getattr(row, "inspector", None),
        "inspected_at": row.inspected_at.isoformat() if getattr(row, "inspected_at", None) else None,
        "status": getattr(row, "overall_status", None),
        "overall_status": getattr(row, "overall_status", None),
        "remarks": getattr(row, "remarks", None),
        "checks": [
            {
                "id": str(check.id),
                "group_key": getattr(check, "group_key", None),
                "criterion_key": getattr(check, "criterion_key", None),
                "applicable": bool(getattr(check, "applicable", False)),
                "approved": bool(getattr(check, "approved", False)),
                "comment": getattr(check, "comment", None),
            }
            for check in getattr(row, "checks", []) or []
        ],
    }


def _resolve_project(session: Session, tenant_id, project_ref: str) -> tuple[Project | None, str]:
    ref = (project_ref or "").strip()
    projects = (
        session.query(Project)
        .filter(Project.tenant_id == tenant_id)
        .order_by(Project.created_at.asc(), Project.name.asc())
        .all()
    )
    if not projects:
        return None, "no_projects"

    # 1. Exact UUID / ID match
    for project in projects:
        if str(project.id) == ref:
            return project, "id"

    # 2. Numeric 1-based index match
    if ref.isdigit():
        index = int(ref) - 1
        if 0 <= index < len(projects):
            return projects[index], "index"

    # 3. Exact project code match
    norm_ref = _normalize(ref)
    for project in projects:
        if _normalize(getattr(project, "code", None)) == norm_ref and norm_ref:
            return project, "code"

    # 4. Exact project name match
    for project in projects:
        if _normalize(getattr(project, "name", None)) == norm_ref and norm_ref:
            return project, "name"

    # 5. Contains project code / name
    for project in projects:
        if norm_ref and (
            norm_ref in _normalize(getattr(project, "code", None))
            or norm_ref in _normalize(getattr(project, "name", None))
        ):
            return project, "contains"

    # 6. Safe fallback to first project
    return projects[0], "fallback_first"


@router.get("/ce_export/{project_ref}")
def ce_export_contract(
    project_ref: str,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
):
    project, resolution = _resolve_project(db, tenant_id, project_ref)
    if not project:
        raise HTTPException(status_code=404, detail="No projects found for tenant")

    assemblies = (
        db.query(Assembly)
        .filter(Assembly.tenant_id == tenant_id, Assembly.project_id == project.id)
        .order_by(Assembly.code.asc())
        .all()
    )
    welds = (
        db.query(Weld)
        .filter(Weld.tenant_id == tenant_id, Weld.project_id == project.id)
        .order_by(Weld.created_at.asc(), Weld.weld_no.asc())
        .all()
    )
    inspections = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project.id)
        .order_by(WeldInspection.created_at.asc())
        .all()
    )

    photo_items = []
    for weld in welds:
        photo_count = int(getattr(weld, "photos", 0) or 0)
        for idx in range(photo_count):
            photo_items.append(
                {
                    "id": f"{weld.id}:{idx + 1}",
                    "project_id": str(project.id),
                    "weld_id": str(weld.id),
                    "name": f"{getattr(weld, 'weld_no', 'weld')}-photo-{idx + 1}",
                    "source": "weld.photos_counter",
                }
            )

    generated_at = datetime.now(timezone.utc).isoformat()

    return {
        "generated_at": generated_at,
        "requested_ref": project_ref,
        "resolved_by": resolution,
        "ready_for_export": True,
        "project": _serialize_project(project),
        "assemblies": [_serialize_assembly(row) for row in assemblies],
        "welds": [_serialize_weld(row) for row in welds],
        "inspections": [_serialize_inspection(row) for row in inspections],
        "photos": photo_items,
        "counts": {
            "assemblies": len(assemblies),
            "welds": len(welds),
            "inspections": len(inspections),
            "photos": len(photo_items),
        },
        "meta": {
            "contract": "ce_export_compat_v1",
            "accepts": ["uuid", "1_based_index", "project_code", "project_name", "contains", "fallback_first"],
        },
    }
