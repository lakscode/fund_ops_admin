from fastapi import APIRouter, HTTPException
from typing import List

from database.database import get_db
from schemas.schemas import InvestorFundCreate, InvestorFundUpdate, InvestorFundResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document

router = APIRouter(prefix="/investor-funds", tags=["Investor Fund Allocations"])


def get_repository():
    return MongoRepository("investor_funds", get_db())


@router.post("/", response_model=InvestorFundResponse, status_code=201)
async def create_investor_fund(investor_fund: InvestorFundCreate):
    """Create a new investor-fund allocation"""
    repo = get_repository()
    data = create_document(investor_fund.model_dump())
    return await repo.create(data)


@router.get("/", response_model=List[InvestorFundResponse])
async def get_all_investor_funds(skip: int = 0, limit: int = 100):
    """Get all investor-fund allocations"""
    repo = get_repository()
    return await repo.get_all(skip, limit)


@router.get("/investor/{investor_id}", response_model=List[InvestorFundResponse])
async def get_funds_by_investor(investor_id: str):
    """Get all fund allocations for a specific investor"""
    repo = get_repository()
    return await repo.get_by_field("investor_id", investor_id)


@router.get("/fund/{fund_id}", response_model=List[InvestorFundResponse])
async def get_investors_by_fund(fund_id: str):
    """Get all investor allocations for a specific fund"""
    repo = get_repository()
    return await repo.get_by_field("fund_id", fund_id)


@router.get("/organization/{organization_id}", response_model=List[InvestorFundResponse])
async def get_investor_funds_by_organization(organization_id: str):
    """Get all investor-fund allocations for funds belonging to a specific organization"""
    db = get_db()

    # First get all funds for this organization
    funds_repo = MongoRepository("funds", db)
    funds = await funds_repo.get_by_field("organization_id", organization_id)
    fund_ids = [fund["id"] for fund in funds]

    if not fund_ids:
        return []

    # Get all investor-fund allocations for these funds
    repo = get_repository()
    return await repo.get_by_field_in("fund_id", fund_ids)


@router.get("/{investor_fund_id}", response_model=InvestorFundResponse)
async def get_investor_fund(investor_fund_id: str):
    """Get a specific investor-fund allocation"""
    repo = get_repository()
    investor_fund = await repo.get_by_id(investor_fund_id)
    if not investor_fund:
        raise HTTPException(status_code=404, detail="Investor-fund allocation not found")
    return investor_fund


@router.put("/{investor_fund_id}", response_model=InvestorFundResponse)
async def update_investor_fund(investor_fund_id: str, investor_fund_update: InvestorFundUpdate):
    """Update an investor-fund allocation"""
    repo = get_repository()
    update_data = update_document(investor_fund_update.model_dump(exclude_unset=True))
    investor_fund = await repo.update(investor_fund_id, update_data)
    if not investor_fund:
        raise HTTPException(status_code=404, detail="Investor-fund allocation not found")
    return investor_fund


@router.delete("/{investor_fund_id}", status_code=204)
async def delete_investor_fund(investor_fund_id: str):
    """Delete an investor-fund allocation"""
    repo = get_repository()
    deleted = await repo.delete(investor_fund_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Investor-fund allocation not found")
    return None
