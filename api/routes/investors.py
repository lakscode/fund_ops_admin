from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Literal
from datetime import datetime

from database.database import get_db
from schemas.schemas import InvestorCreate, InvestorUpdate, InvestorResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document
from utils.import_export import (
    export_to_xlsx, export_to_json,
    import_from_xlsx, import_from_json,
    validate_and_convert_row,
    generate_template_xlsx, generate_template_json
)

router = APIRouter(prefix="/investors", tags=["Investors"])

# Export fields configuration
INVESTOR_EXPORT_FIELDS = [
    'name', 'email', 'phone', 'investor_type', 'commitment_amount', 'funded_amount',
    'address', 'city', 'state', 'country', 'status', 'is_active'
]
INVESTOR_FIELD_TYPES = {
    'name': str,
    'email': str,
    'phone': str,
    'investor_type': str,
    'commitment_amount': float,
    'funded_amount': float,
    'address': str,
    'city': str,
    'state': str,
    'country': str,
    'status': str,
    'is_active': bool,
}
INVESTOR_REQUIRED_FIELDS = ['name']

# Valid values for validation
VALID_INVESTOR_TYPES = ['institutional', 'individual', 'family_office', 'pension_fund', 'endowment', 'sovereign_wealth']
VALID_INVESTOR_STATUSES = ['active', 'inactive', 'pending']

INVESTOR_SAMPLE_DATA = [
    {
        'name': 'Acme Capital Partners',
        'email': 'invest@acmecapital.com',
        'phone': '+1-555-0100',
        'investor_type': 'institutional',
        'commitment_amount': 5000000,
        'funded_amount': 2500000,
        'address': '100 Wall Street',
        'city': 'New York',
        'state': 'NY',
        'country': 'USA',
        'status': 'active',
        'is_active': True
    },
    {
        'name': 'Smith Family Office',
        'email': 'investments@smithfo.com',
        'phone': '+1-555-0200',
        'investor_type': 'family_office',
        'commitment_amount': 2000000,
        'funded_amount': 1000000,
        'address': '500 Park Avenue',
        'city': 'Chicago',
        'state': 'IL',
        'country': 'USA',
        'status': 'active',
        'is_active': True
    }
]


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


@router.get("/export", response_class=StreamingResponse)
async def export_investors(
    organization_id: str = Query(..., description="Organization ID to export investors from"),
    format: Literal["xlsx", "json"] = Query("xlsx", description="Export format")
):
    """Export investors to XLSX or JSON file"""
    repo = get_repository()
    investors = await repo.get_by_field("organization_id", organization_id)

    timestamp = datetime.now().strftime('%Y-%m-%d')

    if format == "xlsx":
        output = export_to_xlsx(investors, INVESTOR_EXPORT_FIELDS, "Investors")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=investors_export_{timestamp}.xlsx"}
        )
    else:
        output = export_to_json(investors, INVESTOR_EXPORT_FIELDS)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=investors_export_{timestamp}.json"}
        )


@router.get("/template", response_class=StreamingResponse)
async def download_investor_template(
    format: Literal["xlsx", "json"] = Query("xlsx", description="Template format")
):
    """Download import template for investors"""
    if format == "xlsx":
        output = generate_template_xlsx(INVESTOR_EXPORT_FIELDS, INVESTOR_SAMPLE_DATA, "Investors Template")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=investors_template.xlsx"}
        )
    else:
        output = generate_template_json(INVESTOR_EXPORT_FIELDS, INVESTOR_SAMPLE_DATA)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=investors_template.json"}
        )


@router.post("/import")
async def import_investors(
    organization_id: str = Query(..., description="Organization ID to import investors to"),
    file: UploadFile = File(..., description="XLSX or JSON file to import")
):
    """Import investors from XLSX or JSON file"""
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

    def validate_investor_type(value):
        if value and value not in VALID_INVESTOR_TYPES:
            return False, f"Invalid investor type: {value}. Valid types: {', '.join(VALID_INVESTOR_TYPES)}"
        return True, ""

    def validate_status(value):
        if value and value not in VALID_INVESTOR_STATUSES:
            return False, f"Invalid status: {value}. Valid statuses: {', '.join(VALID_INVESTOR_STATUSES)}"
        return True, ""

    field_validators = {
        'investor_type': validate_investor_type,
        'status': validate_status
    }

    for idx, row in enumerate(data, 1):
        converted, row_errors = validate_and_convert_row(
            row, idx, INVESTOR_REQUIRED_FIELDS, INVESTOR_FIELD_TYPES, field_validators
        )

        if row_errors:
            errors.extend(row_errors)
            failed += 1
            continue

        try:
            investor_data = {
                'name': converted.get('name'),
                'email': converted.get('email'),
                'phone': converted.get('phone'),
                'investor_type': converted.get('investor_type'),
                'commitment_amount': converted.get('commitment_amount'),
                'funded_amount': converted.get('funded_amount', 0),
                'address': converted.get('address'),
                'city': converted.get('city'),
                'state': converted.get('state'),
                'country': converted.get('country'),
                'status': converted.get('status', 'active'),
                'is_active': converted.get('is_active', True),
                'organization_id': organization_id
            }
            doc = create_document(investor_data)
            await repo.create(doc)
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx}: Failed to create investor - {str(e)}")

    return {"success": success, "failed": failed, "errors": errors}


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
