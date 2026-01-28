from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import InvestorCreate, InvestorUpdate, InvestorResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/investors", tags=["Investors"])


def get_repository():
    return MongoRepository("investors", get_db())


@router.post("/", response_model=InvestorResponse, status_code=201)
async def create_investor(investor: InvestorCreate):
    repo = get_repository()
    data = create_document(investor.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[InvestorResponse])
async def get_all_investors(skip: int = 0, limit: int = 100):
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/fund/{fund_id}", response_model=List[InvestorResponse])
async def get_investors_by_fund(fund_id: str):
    repo = get_repository()
    return await repo.get_by_field("fund_id", fund_id)


@router.get("/organization/{organization_id}", response_model=List[InvestorResponse])
async def get_investors_by_organization(organization_id: str):
    """Get all investors belonging to a specific organization"""
    repo = get_repository()
    return await repo.get_by_field("organization_id", organization_id)


@router.get("/{investor_id}", response_model=InvestorResponse)
async def get_investor(investor_id: str):
    repo = get_repository()
    investor = await repo.get_by_id(investor_id)
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    return investor


@router.put("/{investor_id}", response_model=InvestorResponse)
async def update_investor(investor_id: str, investor_update: InvestorUpdate):
    repo = get_repository()
    update_data = update_document(investor_update.model_dump(exclude_unset=True))
    investor = await repo.update(investor_id, update_data)
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    return investor


@router.delete("/{investor_id}", status_code=204)
async def delete_investor(investor_id: str):
    repo = get_repository()
    deleted = await repo.delete(investor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Investor not found")
    return None
