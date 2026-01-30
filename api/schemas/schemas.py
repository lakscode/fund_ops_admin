from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    # System Roles
    SUPER_ADMIN = "super_admin"  # Can manage users across all organizations

    # Fund Operations Roles
    FUND_ACCOUNTANT = "fund_accountant"
    FUND_ADMINISTRATOR = "fund_administrator"
    CFO = "cfo"  # CFOs / Finance Leads
    GENERAL_PARTNER = "general_partner"  # General Partners / Investment Professionals
    INVESTOR = "investor"
    EXTERNAL_AUDITOR = "external_auditor"
    LEGAL_COMPLIANCE = "legal_compliance"  # Legal/Compliance Teams

    # Generic Roles (backward compatibility)
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"


# Role permissions mapping
ROLE_PERMISSIONS = {
    RoleEnum.SUPER_ADMIN: {
        "can_manage_organizations": True,
        "can_manage_users": True,
        "can_manage_funds": True,
        "can_view_all_data": True,
        "can_manage_investors": True,
        "can_manage_properties": True,
        "can_view_financials": True,
        "can_approve_transactions": True,
    },
    RoleEnum.CFO: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": True,
        "can_view_all_data": True,
        "can_manage_investors": True,
        "can_manage_properties": True,
        "can_view_financials": True,
        "can_approve_transactions": True,
    },
    RoleEnum.FUND_ADMINISTRATOR: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": True,
        "can_view_all_data": True,
        "can_manage_investors": True,
        "can_manage_properties": True,
        "can_view_financials": True,
        "can_approve_transactions": False,
    },
    RoleEnum.FUND_ACCOUNTANT: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": False,
        "can_view_all_data": True,
        "can_manage_investors": False,
        "can_manage_properties": False,
        "can_view_financials": True,
        "can_approve_transactions": False,
    },
    RoleEnum.GENERAL_PARTNER: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": True,
        "can_view_all_data": True,
        "can_manage_investors": True,
        "can_manage_properties": True,
        "can_view_financials": True,
        "can_approve_transactions": True,
    },
    RoleEnum.INVESTOR: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": False,
        "can_view_all_data": False,
        "can_manage_investors": False,
        "can_manage_properties": False,
        "can_view_financials": False,  # Only own investments
        "can_approve_transactions": False,
    },
    RoleEnum.EXTERNAL_AUDITOR: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": False,
        "can_view_all_data": True,
        "can_manage_investors": False,
        "can_manage_properties": False,
        "can_view_financials": True,
        "can_approve_transactions": False,
    },
    RoleEnum.LEGAL_COMPLIANCE: {
        "can_manage_organizations": False,
        "can_manage_users": False,
        "can_manage_funds": False,
        "can_view_all_data": True,
        "can_manage_investors": False,
        "can_manage_properties": False,
        "can_view_financials": True,
        "can_approve_transactions": False,
    },
}


# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = True


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Authentication Schemas
class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


# Role Schemas
class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: Optional[dict] = None
    is_system: Optional[bool] = False
    is_active: Optional[bool] = True


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[dict] = None
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# UserOrganization Schemas
class UserOrganizationBase(BaseModel):
    user_id: str
    organization_id: str
    role_id: Optional[str] = None  # Reference to roles collection
    role: Optional[str] = "viewer"  # Kept for backward compatibility
    is_primary: Optional[bool] = False


class UserOrganizationCreate(UserOrganizationBase):
    pass


class UserOrganizationUpdate(BaseModel):
    role_id: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[bool] = None


class UserOrganizationResponse(UserOrganizationBase):
    id: str
    role_id: Optional[str] = None
    role: Optional[str] = None
    role_name: Optional[str] = None  # Populated from role lookup
    role_display_name: Optional[str] = None  # Populated from role lookup
    joined_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserWithOrganizations(UserResponse):
    organizations: Optional[List[Any]] = []


class OrganizationWithUsers(OrganizationResponse):
    users: Optional[List[Any]] = []


# Fund Schemas
class FundBase(BaseModel):
    name: str
    fund_type: Optional[str] = None
    target_size: Optional[float] = None
    current_size: Optional[float] = 0
    currency: Optional[str] = "USD"
    status: Optional[str] = "active"
    description: Optional[str] = None
    organization_id: Optional[str] = None


class FundCreate(FundBase):
    pass


class FundUpdate(BaseModel):
    name: Optional[str] = None
    fund_type: Optional[str] = None
    target_size: Optional[float] = None
    current_size: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    organization_id: Optional[str] = None


class FundResponse(FundBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationWithFunds(OrganizationResponse):
    funds: Optional[List[Any]] = []


# Investor Schemas
class InvestorBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    investor_type: Optional[str] = None
    commitment_amount: Optional[float] = None
    funded_amount: Optional[float] = 0
    organization_id: Optional[str] = None
    fund_id: Optional[str] = None
    status: Optional[str] = "active"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = True


class InvestorCreate(InvestorBase):
    pass


class InvestorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    investor_type: Optional[str] = None
    commitment_amount: Optional[float] = None
    funded_amount: Optional[float] = None
    organization_id: Optional[str] = None
    fund_id: Optional[str] = None
    status: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None


class InvestorResponse(InvestorBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# InvestorFund Schemas (Many-to-Many mapping between Investors and Funds)
class InvestorFundBase(BaseModel):
    investor_id: str
    fund_id: str
    allocation_percentage: Optional[float] = 100.0  # Percentage of investor's commitment allocated to this fund
    commitment_amount: Optional[float] = None  # Amount committed to this specific fund
    funded_amount: Optional[float] = 0  # Amount already funded to this fund
    status: Optional[str] = "active"


class InvestorFundCreate(InvestorFundBase):
    pass


class InvestorFundUpdate(BaseModel):
    allocation_percentage: Optional[float] = None
    commitment_amount: Optional[float] = None
    funded_amount: Optional[float] = None
    status: Optional[str] = None


class InvestorFundResponse(InvestorFundBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvestorWithFunds(InvestorResponse):
    fund_allocations: Optional[List[Any]] = []


class FundWithInvestors(FundResponse):
    investor_allocations: Optional[List[Any]] = []


# Property Schemas
class PropertyBase(BaseModel):
    name: str
    address: Optional[str] = None
    property_type: Optional[str] = None
    acquisition_price: Optional[float] = None
    current_value: Optional[float] = None
    acquisition_date: Optional[datetime] = None
    fund_id: Optional[str] = None
    status: Optional[str] = "active"
    square_footage: Optional[float] = None
    description: Optional[str] = None


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    property_type: Optional[str] = None
    acquisition_price: Optional[float] = None
    current_value: Optional[float] = None
    acquisition_date: Optional[datetime] = None
    fund_id: Optional[str] = None
    status: Optional[str] = None
    square_footage: Optional[float] = None
    description: Optional[str] = None


class PropertyResponse(PropertyBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
