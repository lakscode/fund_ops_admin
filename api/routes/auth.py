from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from config import settings
from database.database import get_db
from schemas.schemas import (
    UserRegister,
    UserResponse,
    Token,
    ChangePassword,
    RoleEnum,
    ROLE_PERMISSIONS
)
from auth.utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user
)
from repositories.mongo_repository import MongoRepository
from models.models import create_document

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserRegister):
    """Register a new user"""
    repo = MongoRepository("users", get_db())

    # Check if email already exists
    existing_users = await repo.get_by_field("email", user_data.email)
    if existing_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_users = await repo.get_by_field("username", user_data.username)
    if existing_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create user with hashed password
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["is_active"] = True
    user_dict["is_superuser"] = False
    user_dict = create_document(user_dict)

    return await repo.create(user_dict)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    repo = MongoRepository("users", get_db())
    users = await repo.get_by_field("username", form_data.username)

    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = users[0]
    if not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.get("id"))},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current authenticated user information"""
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: dict = Depends(get_current_active_user)
):
    """Change the current user's password"""
    if not verify_password(password_data.current_password, current_user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    repo = MongoRepository("users", get_db())
    new_hash = get_password_hash(password_data.new_password)
    await repo.update(str(current_user.get("id")), {"hashed_password": new_hash})

    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_active_user)):
    """Logout (client should discard the token)"""
    return {"message": "Successfully logged out"}


@router.get("/roles")
async def get_available_roles():
    """Get all available roles with their permissions"""
    roles = []
    for role in RoleEnum:
        role_info = {
            "role": role.value,
            "name": role.name.replace("_", " ").title(),
            "permissions": ROLE_PERMISSIONS.get(role, {})
        }
        roles.append(role_info)
    return {"roles": roles}


@router.get("/roles/{role_name}")
async def get_role_permissions(role_name: str):
    """Get permissions for a specific role"""
    try:
        role = RoleEnum(role_name)
        return {
            "role": role.value,
            "name": role.name.replace("_", " ").title(),
            "permissions": ROLE_PERMISSIONS.get(role, {})
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found"
        )
