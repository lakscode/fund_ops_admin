from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from models.models import User, UserOrganization
from schemas.schemas import RoleEnum, ROLE_PERMISSIONS
from auth.utils import get_current_active_user


def get_role_permissions(role: str) -> dict:
    """Get permissions for a specific role"""
    try:
        role_enum = RoleEnum(role)
        return ROLE_PERMISSIONS.get(role_enum, {})
    except ValueError:
        return {}


def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission"""
    permissions = get_role_permissions(role)
    return permissions.get(permission, False)


async def get_user_role_in_organization(
    user_id: int,
    organization_id: int,
    db: Session
) -> Optional[str]:
    """Get user's role in a specific organization"""
    mapping = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == organization_id
    ).first()
    return mapping.role if mapping else None


async def get_user_organizations_with_roles(
    user_id: int,
    db: Session
) -> List[dict]:
    """Get all organizations and roles for a user"""
    mappings = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id
    ).all()
    return [{"organization_id": m.organization_id, "role": m.role} for m in mappings]


def is_super_admin(user: User, db: Session) -> bool:
    """Check if user is a super admin in any organization"""
    if user.is_superuser:
        return True
    mappings = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.role == RoleEnum.SUPER_ADMIN.value
    ).first()
    return mappings is not None


class RoleChecker:
    """Dependency for checking user roles"""

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Super users bypass role checks
        if current_user.is_superuser:
            return current_user

        # Check if user has any of the allowed roles in any organization
        user_orgs = db.query(UserOrganization).filter(
            UserOrganization.user_id == current_user.id
        ).all()

        for org in user_orgs:
            if org.role in self.allowed_roles or org.role == RoleEnum.SUPER_ADMIN.value:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to perform this action"
        )


class OrganizationRoleChecker:
    """Dependency for checking user roles within a specific organization"""

    def __init__(self, allowed_roles: List[str], org_id_param: str = "organization_id"):
        self.allowed_roles = allowed_roles
        self.org_id_param = org_id_param

    async def __call__(
        self,
        organization_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Super users bypass role checks
        if current_user.is_superuser:
            return current_user

        # Check user's role in the specific organization
        mapping = db.query(UserOrganization).filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == organization_id
        ).first()

        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this organization"
            )

        if mapping.role not in self.allowed_roles and mapping.role != RoleEnum.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action"
            )

        return current_user


# Pre-defined role checkers for common use cases
require_super_admin = RoleChecker([RoleEnum.SUPER_ADMIN.value])
require_cfo_or_above = RoleChecker([RoleEnum.SUPER_ADMIN.value, RoleEnum.CFO.value, RoleEnum.GENERAL_PARTNER.value])
require_fund_admin = RoleChecker([RoleEnum.SUPER_ADMIN.value, RoleEnum.CFO.value, RoleEnum.FUND_ADMINISTRATOR.value, RoleEnum.GENERAL_PARTNER.value])
require_accountant_or_above = RoleChecker([RoleEnum.SUPER_ADMIN.value, RoleEnum.CFO.value, RoleEnum.FUND_ADMINISTRATOR.value, RoleEnum.FUND_ACCOUNTANT.value, RoleEnum.GENERAL_PARTNER.value])
require_auditor_access = RoleChecker([RoleEnum.SUPER_ADMIN.value, RoleEnum.CFO.value, RoleEnum.EXTERNAL_AUDITOR.value, RoleEnum.LEGAL_COMPLIANCE.value])
