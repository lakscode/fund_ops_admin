"""
MongoDB Document Models
These are dictionary schemas for MongoDB collections
"""

from datetime import datetime, timezone
from typing import Optional, TypedDict


# Helper function to create document with timestamps
def create_document(data: dict) -> dict:
    """Add timestamps to a new document"""
    data["created_at"] = datetime.now(timezone.utc)
    data["updated_at"] = None
    return data


def update_document(data: dict) -> dict:
    """Update timestamp on document update"""
    data["updated_at"] = datetime.now(timezone.utc)
    return data


# Document type definitions for reference
class OrganizationDoc(TypedDict, total=False):
    _id: str
    name: str
    code: str
    description: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class UserDoc(TypedDict, total=False):
    _id: str
    username: str
    email: str
    hashed_password: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime]


class UserOrganizationDoc(TypedDict, total=False):
    _id: str
    user_id: str
    organization_id: str
    role: str  # super_admin, fund_accountant, fund_administrator, cfo, general_partner, investor, external_auditor, legal_compliance
    is_primary: bool
    joined_at: datetime
    updated_at: Optional[datetime]


class FundDoc(TypedDict, total=False):
    _id: str
    name: str
    description: Optional[str]
    fund_type: Optional[str]  # real_estate, private_equity, hedge_fund, venture_capital, infrastructure
    target_size: Optional[float]
    current_size: float
    currency: str
    vintage_year: Optional[int]
    status: str  # active, closed, fundraising
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime]


class InvestorDoc(TypedDict, total=False):
    _id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    investor_type: Optional[str]  # institutional, individual, family_office, pension_fund, endowment, sovereign_wealth
    commitment_amount: Optional[float]
    funded_amount: float
    fund_id: Optional[str]
    status: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class PropertyDoc(TypedDict, total=False):
    _id: str
    name: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    property_type: Optional[str]  # office, retail, industrial, residential, mixed_use, hotel
    acquisition_price: Optional[float]
    current_value: Optional[float]
    acquisition_date: Optional[datetime]
    fund_id: Optional[str]
    status: str  # active, under_development, sold, under_contract
    square_footage: Optional[int]
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
