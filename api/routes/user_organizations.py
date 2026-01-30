from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone

from database.database import get_db
from schemas.schemas import (
    UserOrganizationCreate,
    UserOrganizationUpdate,
    UserOrganizationResponse,
    OrganizationWithUsers
)
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/user-organizations", tags=["User-Organization Mappings"])


def get_repository():
    return MongoRepository("user_organizations", get_db())


async def get_role_by_id(role_id: str) -> Optional[dict]:
    """Get role by ID"""
    db = get_db()
    roles_repo = MongoRepository("roles", db)
    return await roles_repo.get_by_id(role_id)


async def get_role_by_name(role_name: str) -> Optional[dict]:
    """Get role by name"""
    db = get_db()
    roles_repo = MongoRepository("roles", db)
    roles = await roles_repo.get_by_field("name", role_name.lower())
    return roles[0] if roles else None


async def enrich_mapping_with_role(mapping: dict) -> dict:
    """Add role information to a user-organization mapping"""
    role_id = mapping.get("role_id")
    role_name = mapping.get("role")

    # If we have role_id, look up the role
    if role_id:
        role = await get_role_by_id(role_id)
        if role:
            mapping["role_name"] = role.get("name")
            mapping["role_display_name"] = role.get("display_name")
            mapping["role"] = role.get("name")  # Keep backward compatibility
    # If we only have role name (legacy data), try to find role_id
    elif role_name:
        role = await get_role_by_name(role_name)
        if role:
            mapping["role_id"] = role.get("id")
            mapping["role_name"] = role.get("name")
            mapping["role_display_name"] = role.get("display_name")

    return mapping


@router.post("/", response_model=UserOrganizationResponse, status_code=201)
async def assign_user_to_organization(mapping: UserOrganizationCreate):
    """Assign a user to an organization with a specific role"""
    db = get_db()

    # Check if user exists
    users_repo = MongoRepository("users", db)
    user = await users_repo.get_by_id(str(mapping.user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if organization exists
    orgs_repo = MongoRepository("organizations", db)
    org = await orgs_repo.get_by_id(str(mapping.organization_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check if mapping already exists
    mappings_repo = get_repository()
    existing = await mappings_repo.get_by_field("user_id", str(mapping.user_id))
    for e in existing:
        if str(e.get("organization_id")) == str(mapping.organization_id):
            raise HTTPException(status_code=400, detail="User already assigned to this organization")

    data = mapping.model_dump()

    # If role_id is provided, validate it and get role name
    if data.get("role_id"):
        role = await get_role_by_id(data["role_id"])
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        data["role"] = role.get("name")
    # If only role name is provided, look up role_id
    elif data.get("role"):
        role = await get_role_by_name(data["role"])
        if role:
            data["role_id"] = role.get("id")
        # Keep the role name even if role doesn't exist in collection (backward compatibility)

    data["joined_at"] = datetime.now(timezone.utc)
    data = create_document(data)
    result = await mappings_repo.create(data)
    return await enrich_mapping_with_role(result)


@router.get("/", response_model=List[UserOrganizationResponse])
async def get_all_mappings(skip: int = 0, limit: int = 100):
    """Get all user-organization mappings"""
    repo = get_repository()
    mappings = await repo.get_all(skip, limit)
    return [await enrich_mapping_with_role(m) for m in mappings]


@router.get("/user/{user_id}", response_model=List[UserOrganizationResponse])
async def get_user_organizations(user_id: str):
    """Get all organizations for a specific user"""
    repo = get_repository()
    mappings = await repo.get_by_field("user_id", user_id)
    return [await enrich_mapping_with_role(m) for m in mappings]


@router.get("/organization/{organization_id}", response_model=List[UserOrganizationResponse])
async def get_organization_users(organization_id: str):
    """Get all users for a specific organization"""
    repo = get_repository()
    mappings = await repo.get_by_field("organization_id", organization_id)
    return [await enrich_mapping_with_role(m) for m in mappings]


@router.get("/organization/{organization_id}/details", response_model=OrganizationWithUsers)
async def get_organization_with_users(organization_id: str):
    """Get organization with all its users and their roles"""
    db = get_db()

    orgs_repo = MongoRepository("organizations", db)
    org = await orgs_repo.get_by_id(organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    mappings_repo = MongoRepository("user_organizations", db)
    mappings = await mappings_repo.get_by_field("organization_id", organization_id)

    users_repo = MongoRepository("users", db)
    users = []
    for m in mappings:
        user = await users_repo.get_by_id(str(m.get("user_id")))
        if user:
            # Get role information
            role_info = await enrich_mapping_with_role(m)
            users.append({
                "user": user,
                "role": role_info.get("role"),
                "role_id": role_info.get("role_id"),
                "role_display_name": role_info.get("role_display_name"),
                "is_primary": m.get("is_primary")
            })
    org["users"] = users
    return org


@router.put("/{mapping_id}", response_model=UserOrganizationResponse)
async def update_user_organization_role(mapping_id: str, mapping_update: UserOrganizationUpdate):
    """Update a user's role in an organization"""
    repo = get_repository()

    # Get existing mapping
    existing = await repo.get_by_id(mapping_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = mapping_update.model_dump(exclude_unset=True)

    # If role_id is provided, validate it and update role name
    if update_data.get("role_id"):
        role = await get_role_by_id(update_data["role_id"])
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        update_data["role"] = role.get("name")
    # If only role name is provided, look up role_id
    elif update_data.get("role"):
        role = await get_role_by_name(update_data["role"])
        if role:
            update_data["role_id"] = role.get("id")

    update_data = update_document(update_data)
    mapping = await repo.update(mapping_id, update_data)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return await enrich_mapping_with_role(mapping)


@router.delete("/{mapping_id}", status_code=204)
async def remove_user_from_organization(mapping_id: str):
    """Remove a user from an organization"""
    repo = get_repository()
    deleted = await repo.delete(mapping_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return None


@router.delete("/user/{user_id}/organization/{organization_id}", status_code=204)
async def remove_user_from_organization_by_ids(user_id: str, organization_id: str):
    """Remove a user from an organization using user_id and organization_id"""
    repo = get_repository()
    mappings = await repo.get_by_field("user_id", user_id)
    for m in mappings:
        if str(m.get("organization_id")) == organization_id:
            await repo.delete(m.get("id"))
            return None
    raise HTTPException(status_code=404, detail="Mapping not found")
