from fastapi import APIRouter, HTTPException
from typing import List
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
    data["joined_at"] = datetime.now(timezone.utc)
    data = create_document(data)
    return await mappings_repo.create(data)


@router.get("/", response_model=List[UserOrganizationResponse])
async def get_all_mappings(skip: int = 0, limit: int = 100):
    """Get all user-organization mappings"""
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/user/{user_id}", response_model=List[UserOrganizationResponse])
async def get_user_organizations(user_id: str):
    """Get all organizations for a specific user"""
    repo = get_repository()
    return await repo.get_by_field("user_id", user_id)


@router.get("/organization/{organization_id}", response_model=List[UserOrganizationResponse])
async def get_organization_users(organization_id: str):
    """Get all users for a specific organization"""
    repo = get_repository()
    return await repo.get_by_field("organization_id", organization_id)


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
            users.append({
                "user": user,
                "role": m.get("role"),
                "is_primary": m.get("is_primary")
            })
    org["users"] = users
    return org


@router.put("/{mapping_id}", response_model=UserOrganizationResponse)
async def update_user_organization_role(mapping_id: str, mapping_update: UserOrganizationUpdate):
    """Update a user's role in an organization"""
    repo = get_repository()
    update_data = update_document(mapping_update.model_dump(exclude_unset=True))
    mapping = await repo.update(mapping_id, update_data)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping


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
