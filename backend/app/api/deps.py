from typing import Generator, Optional, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# OAuth2 scheme looks for 'Authorization: Bearer <token>' in header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False
)


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Return the User if valid token is provided, or None if anonymous."""
    if not token:
        return None
    
    payload = decode_token(token)
    if not payload:
        return None
    
    token_type = payload.get("type")
    if token_type != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None
    
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id_int).first()
    if user and not user.is_active:
        return None
    return user


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Dependency that mandates an authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản chưa được xác thực hoặc phiên đăng nhập đã hết hạn.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency that ensures user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản người dùng đã bị vô hiệu hóa hoặc bị khóa."
        )
    return current_user


def require_role(*allowed_roles: str) -> Callable:
    """Dependency factory checking if user possesses any of the required roles or is superuser."""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.is_superuser:
            return current_user
        
        user_role_names = {role.name.lower() for role in current_user.roles}
        allowed = {r.lower() for r in allowed_roles}
        
        if not user_role_names.intersection(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: {', '.join(allowed_roles)}."
            )
        return current_user
    
    return role_checker
