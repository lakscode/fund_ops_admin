from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone

from database.database import get_db
from schemas.schemas import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
)
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/roles", tags=["Roles"])


def get_repository():
    return MongoRepository("roles", get_db())


# Default system roles
DEFAULT_ROLES = [
    {
        "name": "admin",
        "display_name": "Admin",
        "description": "Full administrative access to the organization",
        "permissions": {
            "can_manage_users": True,
            "can_manage_funds": True,
            "can_manage_investors": True,
            "can_manage_properties": True,
            "can_view_all_data": True,
            "can_view_financials": True,
            "can_approve_transactions": True,
        },
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "fund_manager",
        "display_name": "Fund Manager",
        "description": "Can manage funds, investors, and properties",
        "permissions": {
            "can_manage_users": False,
            "can_manage_funds": True,
            "can_manage_investors": True,
            "can_manage_properties": True,
            "can_view_all_data": True,
            "can_view_financials": True,
            "can_approve_transactions": True,
        },
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "analyst",
        "display_name": "Analyst",
        "description": "Can view and analyze data but cannot make changes",
        "permissions": {
            "can_manage_users": False,
            "can_manage_funds": False,
            "can_manage_investors": False,
            "can_manage_properties": False,
            "can_view_all_data": True,
            "can_view_financials": True,
            "can_approve_transactions": False,
        },
        "is_system": True,
        "is_active": True,
    },
    {
        "name": "viewer",
        "display_name": "Viewer",
        "description": "Read-only access to data",
        "permissions": {
            "can_manage_users": False,
            "can_manage_funds": False,
            "can_manage_investors": False,
            "can_manage_properties": False,
            "can_view_all_data": True,
            "can_view_financials": False,
            "can_approve_transactions": False,
        },
        "is_system": True,
        "is_active": True,
    },
]


@router.post("/seed", response_model=List[RoleResponse])
async def seed_default_roles():
    """Seed default system roles (run once during initial setup)"""
    repo = get_repository()
    created_roles = []

    for role_data in DEFAULT_ROLES:
        # Check if role already exists
        existing = await repo.get_by_field("name", role_data["name"])
        if not existing:
            data = create_document(role_data.copy())
            created = await repo.create(data)
            created_roles.append(created)

    return created_roles


@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(role: RoleCreate):
    """Create a new role"""
    repo = get_repository()

    # Check if role name already exists
    existing = await repo.get_by_field("name", role.name)
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    data = role.model_dump()
    data = create_document(data)
    return await repo.create(data)


@router.get("/", response_model=List[RoleResponse])
async def get_all_roles(skip: int = 0, limit: int = 100, active_only: bool = False):
    """Get all roles"""
    repo = get_repository()
    roles = await repo.get_all(skip, limit)

    if active_only:
        roles = [r for r in roles if r.get("is_active", True)]

    return roles


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(role_id: str):
    """Get a specific role by ID"""
    repo = get_repository()
    role = await repo.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.get("/name/{role_name}", response_model=RoleResponse)
async def get_role_by_name(role_name: str):
    """Get a specific role by name"""
    repo = get_repository()
    roles = await repo.get_by_field("name", role_name.lower())
    if not roles:
        raise HTTPException(status_code=404, detail="Role not found")
    return roles[0]


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, role_update: RoleUpdate):
    """Update a role"""
    repo = get_repository()

    # Check if role exists
    existing = await repo.get_by_id(role_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")

    # Prevent modifying system roles' name
    if existing.get("is_system") and role_update.name:
        raise HTTPException(status_code=400, detail="Cannot change name of system roles")

    update_data = update_document(role_update.model_dump(exclude_unset=True))
    role = await repo.update(role_id, update_data)
    return role


@router.delete("/{role_id}", status_code=204)
async def delete_role(role_id: str):
    """Delete a role (system roles cannot be deleted)"""
    repo = get_repository()

    # Check if role exists
    existing = await repo.get_by_id(role_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")

    # Prevent deleting system roles
    if existing.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system roles")

    # Check if role is in use
    db = get_db()
    user_orgs_repo = MongoRepository("user_organizations", db)
    users_with_role = await user_orgs_repo.get_by_field("role_id", role_id)
    if users_with_role:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role - it is assigned to {len(users_with_role)} user(s)"
        )

    deleted = await repo.delete(role_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Role not found")
    return None
