from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import UserCreate, UserUpdate, UserResponse, UserWithOrganizations
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/users", tags=["Users"])


def get_repository():
    return MongoRepository("users", get_db())


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    repo = get_repository()
    data = create_document(user.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[UserResponse])
async def get_all_users(skip: int = 0, limit: int = 100):
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/organization/{organization_id}", response_model=List[dict])
async def get_users_by_organization(organization_id: str):
    """Get all users for a specific organization with their roles"""
    db = get_db()

    # Check if organization exists
    orgs_repo = MongoRepository("organizations", db)
    org = await orgs_repo.get_by_id(organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get all user-organization mappings for this organization
    mappings_repo = MongoRepository("user_organizations", db)
    mappings = await mappings_repo.get_by_field("organization_id", organization_id)

    # Get user details for each mapping
    users_repo = MongoRepository("users", db)
    users = []
    for m in mappings:
        user = await users_repo.get_by_id(str(m.get("user_id")))
        if user:
            users.append({
                "id": user.get("id"),
                "email": user.get("email"),
                "username": user.get("username"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "phone": user.get("phone"),
                "is_active": user.get("is_active"),
                "role": m.get("role"),
                "is_primary": m.get("is_primary"),
                "joined_at": m.get("joined_at")
            })
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    repo = get_repository()
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/organizations", response_model=UserWithOrganizations)
async def get_user_with_organizations(user_id: str):
    db = get_db()

    users_repo = MongoRepository("users", db)
    user = await users_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_orgs_repo = MongoRepository("user_organizations", db)
    user_orgs = await user_orgs_repo.get_by_field("user_id", user_id)

    orgs_repo = MongoRepository("organizations", db)
    organizations = []
    for uo in user_orgs:
        org = await orgs_repo.get_by_id(str(uo.get("organization_id")))
        if org:
            organizations.append({
                "id": org.get("id"),
                "name": org.get("name"),
                "code": org.get("code"),
                "role": uo.get("role"),
                "is_primary": uo.get("is_primary")
            })
    user["organizations"] = organizations
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_update: UserUpdate):
    repo = get_repository()
    update_data = update_document(user_update.model_dump(exclude_unset=True))
    user = await repo.update(user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str):
    repo = get_repository()
    deleted = await repo.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return None
