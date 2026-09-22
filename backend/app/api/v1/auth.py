import re
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token
)
from app.core.config import settings
from app.models.user import User, Role
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    PasswordChangeRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse
)
from app.api.deps import get_current_active_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account with email, username, full name and password.
    Returns Access and Refresh JWT tokens with profile.
    """
    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký trong hệ thống."
        )

    clean_username = user_in.username.lower().strip()
    if len(clean_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng (username) phải có ít nhất 3 ký tự."
        )

    if not re.match(r"^[a-zA-Z0-9_.-]+$", clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng chỉ được chứa chữ cái, số, dấu gạch dưới, gạch ngang và dấu chấm."
        )

    clean_password = user_in.password.strip() if user_in.password else ""
    if len(clean_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu phải có ít nhất 6 ký tự."
        )

    clean_name = user_in.name.strip() if user_in.name else ""
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ và tên không được để trống."
        )

    # Check if username exists
    existing_username = db.query(User).filter(User.username == clean_username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng (username) này đã tồn tại, vui lòng chọn tên khác."
        )

    # Create new user
    new_user = User(
        email=user_in.email.lower().strip(),
        username=clean_username,
        name=clean_name,
        hashed_password=get_password_hash(clean_password),
        avatar=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}"
    )

    # Assign default 'user' role (create if not yet seeded in fresh DB)
    default_role = db.query(Role).filter(Role.name == "user").first()
    if not default_role:
        default_role = Role(name="user", description="Thành viên tiêu chuẩn")
        db.add(default_role)
        db.flush()
    new_user.roles.append(default_role)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate tokens
    access_token = create_access_token(subject=new_user.id)
    refresh_token = create_refresh_token(subject=new_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with username or email and password.
    Returns Access and Refresh JWT tokens.
    """
    identifier = login_in.identifier.lower().strip() if login_in.identifier else ""
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập hoặc email không được để trống."
        )

    clean_password = login_in.password.strip() if login_in.password else ""
    if not clean_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu không được để trống."
        )

    user = db.query(User).filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()

    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị vô hiệu hóa."
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_in: TokenRefresh, db: Session = Depends(get_db)):
    """
    Exchange a valid Refresh Token for a new pair of Access and Refresh Tokens.
    """
    payload = decode_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn."
        )

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn."
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại hoặc đã bị khóa."
        )

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Get profile information of currently authenticated user.
    """
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Change current user password with old password verification.
    """
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác."
        )

    clean_new_pass = data.new_password.strip() if data.new_password else ""
    if len(clean_new_pass) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự."
        )

    if data.old_password == clean_new_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu hiện tại."
        )

    current_user.hashed_password = get_password_hash(clean_new_pass)
    db.commit()
    return MessageResponse(message="Đổi mật khẩu thành công.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset token. In production, this sends an email with the link.
    """
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not user.is_active:
        # Avoid user enumeration, return generic success message
        return MessageResponse(
            message="Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi."
        )

    reset_token = create_reset_token(subject=user.id)
    # Return reset_token directly in response message for development/testing ease
    return MessageResponse(
        message=f"Token khôi phục mật khẩu (hiệu lực 15 phút): {reset_token}"
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using a valid reset token.
    """
    payload = decode_token(data.token)
    if not payload or payload.get("type") != "reset_password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khôi phục mật khẩu không hợp lệ hoặc đã hết hạn."
        )

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khôi phục mật khẩu không hợp lệ hoặc đã hết hạn."
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng không tồn tại hoặc đã bị vô hiệu hóa."
        )

    clean_new_pass = data.new_password.strip() if data.new_password else ""
    if len(clean_new_pass) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự."
        )

    user.hashed_password = get_password_hash(clean_new_pass)
    db.commit()
    return MessageResponse(message="Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.")

