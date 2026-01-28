from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import FundCreate, FundUpdate, FundResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/funds", tags=["Funds"])


def get_repository():
    return MongoRepository("funds", get_db())


@router.post("/", response_model=FundResponse, status_code=201)
async def create_fund(fund: FundCreate):
    repo = get_repository()
    data = create_document(fund.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[FundResponse])
async def get_all_funds(skip: int = 0, limit: int = 100):
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/organization/{organization_id}", response_model=List[FundResponse])
async def get_funds_by_organization(organization_id: str):
    """Get all funds for a specific organization"""
    repo = get_repository()
    return await repo.get_by_field("organization_id", organization_id)


@router.get("/{fund_id}", response_model=FundResponse)
async def get_fund(fund_id: str):
    repo = get_repository()
    fund = await repo.get_by_id(fund_id)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


@router.put("/{fund_id}", response_model=FundResponse)
async def update_fund(fund_id: str, fund_update: FundUpdate):
    repo = get_repository()
    update_data = update_document(fund_update.model_dump(exclude_unset=True))
    fund = await repo.update(fund_id, update_data)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


@router.delete("/{fund_id}", status_code=204)
async def delete_fund(fund_id: str):
    repo = get_repository()
    deleted = await repo.delete(fund_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Fund not found")
    return None
