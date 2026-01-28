from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Literal
from datetime import datetime

from database.database import get_db
from schemas.schemas import FundCreate, FundUpdate, FundResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document
from utils.import_export import (
    export_to_xlsx, export_to_json,
    import_from_xlsx, import_from_json,
    validate_and_convert_row,
    generate_template_xlsx, generate_template_json
)

router = APIRouter(prefix="/funds", tags=["Funds"])

# Export fields configuration
FUND_EXPORT_FIELDS = ['name', 'fund_type', 'target_size', 'current_size', 'currency', 'status', 'description']
FUND_FIELD_TYPES = {
    'name': str,
    'fund_type': str,
    'target_size': float,
    'current_size': float,
    'currency': str,
    'status': str,
    'description': str,
}
FUND_REQUIRED_FIELDS = ['name']

# Valid values for validation
VALID_FUND_TYPES = ['real_estate', 'private_equity', 'hedge_fund', 'venture_capital', 'infrastructure']
VALID_FUND_STATUSES = ['active', 'closed', 'fundraising']

FUND_SAMPLE_DATA = [
    {
        'name': 'Growth Fund I',
        'fund_type': 'private_equity',
        'target_size': 100000000,
        'current_size': 75000000,
        'currency': 'USD',
        'status': 'active',
        'description': 'Private equity growth fund'
    },
    {
        'name': 'Real Estate Fund II',
        'fund_type': 'real_estate',
        'target_size': 250000000,
        'current_size': 120000000,
        'currency': 'USD',
        'status': 'fundraising',
        'description': 'Commercial real estate fund'
    }
]


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


@router.get("/export", response_class=StreamingResponse)
async def export_funds(
    organization_id: str = Query(..., description="Organization ID to export funds from"),
    format: Literal["xlsx", "json"] = Query("xlsx", description="Export format")
):
    """Export funds to XLSX or JSON file"""
    repo = get_repository()
    funds = await repo.get_by_field("organization_id", organization_id)

    timestamp = datetime.now().strftime('%Y-%m-%d')

    if format == "xlsx":
        output = export_to_xlsx(funds, FUND_EXPORT_FIELDS, "Funds")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=funds_export_{timestamp}.xlsx"}
        )
    else:
        output = export_to_json(funds, FUND_EXPORT_FIELDS)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=funds_export_{timestamp}.json"}
        )


@router.get("/template", response_class=StreamingResponse)
async def download_fund_template(
    format: Literal["xlsx", "json"] = Query("xlsx", description="Template format")
):
    """Download import template for funds"""
    if format == "xlsx":
        output = generate_template_xlsx(FUND_EXPORT_FIELDS, FUND_SAMPLE_DATA, "Funds Template")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=funds_template.xlsx"}
        )
    else:
        output = generate_template_json(FUND_EXPORT_FIELDS, FUND_SAMPLE_DATA)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=funds_template.json"}
        )


@router.post("/import")
async def import_funds(
    organization_id: str = Query(..., description="Organization ID to import funds to"),
    file: UploadFile = File(..., description="XLSX or JSON file to import")
):
    """Import funds from XLSX or JSON file"""
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""

    # Parse file based on extension
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        data, parse_errors = import_from_xlsx(content)
    elif filename.endswith('.json'):
        data, parse_errors = import_from_json(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use .xlsx or .json")

    if parse_errors and not data:
        return {"success": 0, "failed": 0, "errors": parse_errors}

    # Validate and import each row
    repo = get_repository()
    success = 0
    failed = 0
    errors = list(parse_errors)

    def validate_fund_type(value):
        if value and value not in VALID_FUND_TYPES:
            return False, f"Invalid fund type: {value}. Valid types: {', '.join(VALID_FUND_TYPES)}"
        return True, ""

    def validate_status(value):
        if value and value not in VALID_FUND_STATUSES:
            return False, f"Invalid status: {value}. Valid statuses: {', '.join(VALID_FUND_STATUSES)}"
        return True, ""

    field_validators = {
        'fund_type': validate_fund_type,
        'status': validate_status
    }

    for idx, row in enumerate(data, 1):
        converted, row_errors = validate_and_convert_row(
            row, idx, FUND_REQUIRED_FIELDS, FUND_FIELD_TYPES, field_validators
        )

        if row_errors:
            errors.extend(row_errors)
            failed += 1
            continue

        try:
            fund_data = {
                'name': converted.get('name'),
                'fund_type': converted.get('fund_type'),
                'target_size': converted.get('target_size'),
                'current_size': converted.get('current_size', 0),
                'currency': converted.get('currency', 'USD'),
                'status': converted.get('status', 'active'),
                'description': converted.get('description'),
                'organization_id': organization_id
            }
            doc = create_document(fund_data)
            await repo.create(doc)
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx}: Failed to create fund - {str(e)}")

    return {"success": success, "failed": failed, "errors": errors}


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
