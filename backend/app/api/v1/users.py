from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update profile details (name, avatar, bio) for current authenticated user.
    """
    if user_update.name is not None:
        clean_name = user_update.name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên hiển thị không được để trống."
            )
        current_user.name = clean_name
    
    if user_update.avatar is not None and user_update.avatar.strip():
        current_user.avatar = user_update.avatar.strip()

    if user_update.bio is not None:
        current_user.bio = user_update.bio.strip()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.get("/me", response_model=UserResponse)
def get_my_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Retrieve profile details for the currently authenticated user at /users/me.
    """
    return UserResponse.model_validate(current_user)


@router.get("/{identifier}", response_model=UserResponse)
def get_user_by_identifier(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieve public profile of a user by username or numeric ID.
    """
    if identifier.isdigit():
        user = db.query(User).filter(User.id == int(identifier)).first()
    else:
        user = db.query(User).filter(User.username == identifier.lower()).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng này."
        )

    return UserResponse.model_validate(user)
