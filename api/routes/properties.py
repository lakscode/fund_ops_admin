from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import PropertyCreate, PropertyUpdate, PropertyResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/properties", tags=["Properties"])


def get_repository():
    return MongoRepository("properties", get_db())


@router.post("/", response_model=PropertyResponse, status_code=201)
async def create_property(property_data: PropertyCreate):
    repo = get_repository()
    data = create_document(property_data.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[PropertyResponse])
async def get_all_properties(skip: int = 0, limit: int = 100):
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/fund/{fund_id}", response_model=List[PropertyResponse])
async def get_properties_by_fund(fund_id: str):
    repo = get_repository()
    return await repo.get_by_field("fund_id", fund_id)


@router.get("/organization/{organization_id}", response_model=List[PropertyResponse])
async def get_properties_by_organization(organization_id: str):
    """Get all properties for funds belonging to a specific organization"""
    db = get_db()

    # First get all funds for this organization
    funds_repo = MongoRepository("funds", db)
    funds = await funds_repo.get_by_field("organization_id", organization_id)
    fund_ids = [fund["id"] for fund in funds]

    if not fund_ids:
        return []

    # Get all properties for these funds
    repo = get_repository()
    return await repo.get_by_field_in("fund_id", fund_ids)


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    repo = get_repository()
    property_doc = await repo.get_by_id(property_id)
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_doc


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, property_update: PropertyUpdate):
    repo = get_repository()
    update_data = update_document(property_update.model_dump(exclude_unset=True))
    property_doc = await repo.update(property_id, update_data)
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_doc


@router.delete("/{property_id}", status_code=204)
async def delete_property(property_id: str):
    repo = get_repository()
    deleted = await repo.delete(property_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Property not found")
    return None
