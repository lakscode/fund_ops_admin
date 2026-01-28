from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Literal
from datetime import datetime

from database.database import get_db
from schemas.schemas import PropertyCreate, PropertyUpdate, PropertyResponse
from repositories.mongo_repository import MongoRepository
from models.models import create_document, update_document
from utils.import_export import (
    export_to_xlsx, export_to_json,
    import_from_xlsx, import_from_json,
    validate_and_convert_row,
    generate_template_xlsx, generate_template_json
)

router = APIRouter(prefix="/properties", tags=["Properties"])

# Export fields configuration
PROPERTY_EXPORT_FIELDS = [
    'name', 'address', 'city', 'state', 'country', 'property_type',
    'acquisition_price', 'current_value', 'acquisition_date', 'status',
    'square_footage', 'description'
]
PROPERTY_FIELD_TYPES = {
    'name': str,
    'address': str,
    'city': str,
    'state': str,
    'country': str,
    'property_type': str,
    'acquisition_price': float,
    'current_value': float,
    'acquisition_date': datetime,
    'status': str,
    'square_footage': float,
    'description': str,
}
PROPERTY_REQUIRED_FIELDS = ['name']

# Valid values for validation
VALID_PROPERTY_TYPES = ['multifamily', 'office', 'retail', 'industrial', 'mixed_use', 'land', 'hotel', 'self_storage', 'senior_living', 'student_housing']
VALID_PROPERTY_STATUSES = ['active', 'pending', 'under_contract', 'sold']

PROPERTY_SAMPLE_DATA = [
    {
        'name': 'Sunset Apartments',
        'address': '123 Main Street',
        'city': 'Los Angeles',
        'state': 'CA',
        'country': 'USA',
        'property_type': 'multifamily',
        'acquisition_price': 5000000,
        'current_value': 5500000,
        'acquisition_date': '2024-01-15',
        'status': 'active',
        'square_footage': 25000,
        'description': 'Multi-family residential complex'
    },
    {
        'name': 'Downtown Office Tower',
        'address': '456 Business Ave',
        'city': 'New York',
        'state': 'NY',
        'country': 'USA',
        'property_type': 'office',
        'acquisition_price': 15000000,
        'current_value': 16000000,
        'acquisition_date': '2023-06-20',
        'status': 'active',
        'square_footage': 75000,
        'description': 'Class A office building'
    }
]


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


@router.get("/export", response_class=StreamingResponse)
async def export_properties(
    organization_id: str = Query(..., description="Organization ID to export properties from"),
    format: Literal["xlsx", "json"] = Query("xlsx", description="Export format")
):
    """Export properties to XLSX or JSON file"""
    db = get_db()

    # First get all funds for this organization
    funds_repo = MongoRepository("funds", db)
    funds = await funds_repo.get_by_field("organization_id", organization_id)
    fund_ids = [fund["id"] for fund in funds]

    if not fund_ids:
        properties = []
    else:
        repo = get_repository()
        properties = await repo.get_by_field_in("fund_id", fund_ids)

    timestamp = datetime.now().strftime('%Y-%m-%d')

    if format == "xlsx":
        output = export_to_xlsx(properties, PROPERTY_EXPORT_FIELDS, "Properties")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=properties_export_{timestamp}.xlsx"}
        )
    else:
        output = export_to_json(properties, PROPERTY_EXPORT_FIELDS)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=properties_export_{timestamp}.json"}
        )


@router.get("/template", response_class=StreamingResponse)
async def download_property_template(
    format: Literal["xlsx", "json"] = Query("xlsx", description="Template format")
):
    """Download import template for properties"""
    if format == "xlsx":
        output = generate_template_xlsx(PROPERTY_EXPORT_FIELDS, PROPERTY_SAMPLE_DATA, "Properties Template")
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=properties_template.xlsx"}
        )
    else:
        output = generate_template_json(PROPERTY_EXPORT_FIELDS, PROPERTY_SAMPLE_DATA)
        return StreamingResponse(
            output,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=properties_template.json"}
        )


@router.post("/import")
async def import_properties(
    fund_id: str = Query(..., description="Fund ID to import properties to"),
    file: UploadFile = File(..., description="XLSX or JSON file to import")
):
    """Import properties from XLSX or JSON file"""
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

    def validate_property_type(value):
        if value and value not in VALID_PROPERTY_TYPES:
            return False, f"Invalid property type: {value}. Valid types: {', '.join(VALID_PROPERTY_TYPES)}"
        return True, ""

    def validate_status(value):
        if value and value not in VALID_PROPERTY_STATUSES:
            return False, f"Invalid status: {value}. Valid statuses: {', '.join(VALID_PROPERTY_STATUSES)}"
        return True, ""

    field_validators = {
        'property_type': validate_property_type,
        'status': validate_status
    }

    for idx, row in enumerate(data, 1):
        converted, row_errors = validate_and_convert_row(
            row, idx, PROPERTY_REQUIRED_FIELDS, PROPERTY_FIELD_TYPES, field_validators
        )

        if row_errors:
            errors.extend(row_errors)
            failed += 1
            continue

        try:
            property_data = {
                'name': converted.get('name'),
                'address': converted.get('address'),
                'city': converted.get('city'),
                'state': converted.get('state'),
                'country': converted.get('country'),
                'property_type': converted.get('property_type', 'multifamily'),
                'acquisition_price': converted.get('acquisition_price'),
                'current_value': converted.get('current_value'),
                'acquisition_date': converted.get('acquisition_date'),
                'status': converted.get('status', 'active'),
                'square_footage': converted.get('square_footage'),
                'description': converted.get('description'),
                'fund_id': fund_id
            }
            doc = create_document(property_data)
            await repo.create(doc)
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx}: Failed to create property - {str(e)}")

    return {"success": success, "failed": failed, "errors": errors}


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
