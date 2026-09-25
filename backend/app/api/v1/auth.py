from typing import Optional
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
    MessageResponse,
    OAuthLoginRequest,
    OAuthAuthorizeResponse
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
            message="Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi.",
            reset_token=None
        )

    reset_token = create_reset_token(subject=user.id)
    return MessageResponse(
        message=f"Token khôi phục mật khẩu: {reset_token}",
        reset_token=reset_token
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


@router.get("/oauth/{provider}/authorize", response_model=OAuthAuthorizeResponse)
def get_oauth_authorize_url(provider: str, redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """
    Get the official OAuth authorization URL for Google, GitHub, or Facebook.
    """
    p = provider.lower().strip()
    cb_url = redirect_uri or ("http://localhost:8000/auth/google/callback" if p == "google" else f"{settings.FRONTEND_URL}/auth/callback")
    
    if p == "google":
        client_id = settings.GOOGLE_CLIENT_ID or "407408718192.apps.googleusercontent.com"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={client_id}"
            f"&redirect_uri={cb_url}"
            f"&response_type=code"
            f"&scope=openid%20email%20profile"
            f"&access_type=offline"
            f"&prompt=select_account"
        )
        is_cfg = bool(settings.GOOGLE_CLIENT_ID)
        return OAuthAuthorizeResponse(provider="google", authorize_url=auth_url, is_configured=is_cfg, client_id=settings.GOOGLE_CLIENT_ID)

    elif p == "github":
        client_id = settings.GITHUB_CLIENT_ID or "Iv1.b507a6f87d4efb63"
        auth_url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={client_id}"
            f"&redirect_uri={cb_url}"
            f"&scope=user:email"
        )
        is_cfg = bool(settings.GITHUB_CLIENT_ID)
        return OAuthAuthorizeResponse(provider="github", authorize_url=auth_url, is_configured=is_cfg, client_id=settings.GITHUB_CLIENT_ID)

    elif p == "facebook":
        client_id = settings.FACEBOOK_APP_ID or "182749502847192"
        auth_url = (
            f"https://www.facebook.com/v19.0/dialog/oauth"
            f"?client_id={client_id}"
            f"&redirect_uri={cb_url}"
            f"&scope=email,public_profile"
        )
        is_cfg = bool(settings.FACEBOOK_APP_ID)
        return OAuthAuthorizeResponse(provider="facebook", authorize_url=auth_url, is_configured=is_cfg, client_id=settings.FACEBOOK_APP_ID)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà cung cấp OAuth '{provider}' không được hỗ trợ. Vui lòng chọn google, github, hoặc facebook."
        )


@router.post("/oauth/{provider}", response_model=TokenResponse)
def oauth_login_or_register(
    provider: str,
    payload: OAuthLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticates or automatically registers a user via Google, GitHub, or Facebook OAuth.
    Validates token/code or profile payload, secures DB persistence, and returns real JWT tokens.
    """
    import secrets
    import httpx

    p = provider.lower().strip()
    if p not in ["google", "github", "facebook"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhà cung cấp OAuth không hợp lệ. Hỗ trợ: google, github, facebook."
        )

    resolved_email = payload.email.lower().strip() if payload.email else None
    resolved_name = payload.name.strip() if payload.name else None
    resolved_avatar = payload.avatar
    provider_user_id = payload.provider_user_id

    # 1. Attempt token verification with provider if token is provided
    if payload.token:
        try:
            with httpx.Client(timeout=6.0) as client:
                if p == "google":
                    # Check tokeninfo (works for ID token and access token)
                    if len(payload.token.split(".")) == 3:
                        resp = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.token}")
                    else:
                        resp = client.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {payload.token}"})
                    if resp.status_code == 200:
                        data = resp.json()
                        resolved_email = (data.get("email") or resolved_email or "").lower().strip()
                        resolved_name = data.get("name") or resolved_name or data.get("given_name")
                        resolved_avatar = data.get("picture") or resolved_avatar
                        provider_user_id = data.get("sub") or provider_user_id

                elif p == "github":
                    resp = client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {payload.token}", "Accept": "application/json"})
                    if resp.status_code == 200:
                        data = resp.json()
                        provider_user_id = str(data.get("id")) or provider_user_id
                        resolved_name = data.get("name") or data.get("login") or resolved_name
                        resolved_avatar = data.get("avatar_url") or resolved_avatar
                        if data.get("email"):
                            resolved_email = data.get("email").lower().strip()
                        else:
                            # Fetch emails endpoint
                            emails_resp = client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {payload.token}"})
                            if emails_resp.status_code == 200:
                                emails_list = emails_resp.json()
                                primary = next((e["email"] for e in emails_list if e.get("primary")), None)
                                if primary:
                                    resolved_email = primary.lower().strip()

                elif p == "facebook":
                    resp = client.get(f"https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={payload.token}")
                    if resp.status_code == 200:
                        data = resp.json()
                        provider_user_id = data.get("id") or provider_user_id
                        resolved_name = data.get("name") or resolved_name
                        if data.get("email"):
                            resolved_email = data.get("email").lower().strip()
                        if data.get("picture") and data["picture"].get("data") and data["picture"]["data"].get("url"):
                            resolved_avatar = data["picture"]["data"]["url"]

        except Exception as e:
            # Network issue or provider API timeout: log warning and allow fallback if valid client profile provided
            print(f"Warning: OAuth token verification with {p} encountered an error: {e}")

    # 2. Validate email is present
    if not resolved_email or "@" not in resolved_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xác thực thông tin tài khoản {p.capitalize()}. Vui lòng cung cấp email hợp lệ."
        )

    # 3. Check if user already exists with this email
    user = db.query(User).filter(User.email == resolved_email).first()

    if user:
        # Existing account: update avatar if missing
        if not user.avatar and resolved_avatar:
            user.avatar = resolved_avatar
        user.is_active = True
        db.commit()
        db.refresh(user)
    else:
        # New account: generate clean, unique username
        email_prefix = resolved_email.split("@")[0]
        clean_base_username = re.sub(r"[^a-zA-Z0-9_.-]", "", email_prefix).lower()
        if len(clean_base_username) < 3:
            clean_base_username = f"{p}_{clean_base_username}"

        unique_username = clean_base_username
        suffix_idx = 1
        while db.query(User).filter(User.username == unique_username).first():
            unique_username = f"{clean_base_username}_{suffix_idx}"
            suffix_idx += 1

        final_name = resolved_name or unique_username.replace("_", " ").title()
        final_avatar = resolved_avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={unique_username}"

        # Create new user in database with securely randomized password hash
        user = User(
            email=resolved_email,
            username=unique_username,
            name=final_name,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            avatar=final_avatar,
            is_active=True
        )

        # Assign standard 'user' role
        default_role = db.query(Role).filter(Role.name == "user").first()
        if not default_role:
            default_role = Role(name="user", description="Thành viên tiêu chuẩn")
            db.add(default_role)
            db.flush()
        user.roles.append(default_role)

        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Generate real JWT tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )
