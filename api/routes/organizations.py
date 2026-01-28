from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import OrganizationCreate, OrganizationUpdate, OrganizationResponse, OrganizationWithFunds
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/organizations", tags=["Organizations"])


def get_repository():
    return MongoRepository("organizations", get_db())


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(organization: OrganizationCreate):
    repo = get_repository()
    data = create_document(organization.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[OrganizationResponse])
async def get_all_organizations(skip: int = 0, limit: int = 100):
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(organization_id: str):
    repo = get_repository()
    organization = await repo.get_by_id(organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.get("/{organization_id}/funds", response_model=OrganizationWithFunds)
async def get_organization_with_funds(organization_id: str):
    """Get organization with all its funds"""
    orgs_repo = get_repository()
    org = await orgs_repo.get_by_id(organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    funds_repo = MongoRepository("funds", get_db())
    funds = await funds_repo.get_by_field("organization_id", organization_id)
    org["funds"] = funds
    return org


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(organization_id: str, organization_update: OrganizationUpdate):
    repo = get_repository()
    update_data = update_document(organization_update.model_dump(exclude_unset=True))
    organization = await repo.update(organization_id, update_data)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.delete("/{organization_id}", status_code=204)
async def delete_organization(organization_id: str):
    repo = get_repository()
    deleted = await repo.delete(organization_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Organization not found")
    return None
