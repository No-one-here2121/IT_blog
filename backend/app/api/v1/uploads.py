import os
import uuid
from typing import Set
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.models.user import User
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/uploads", tags=["File Uploads & Assets"])

ALLOWED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml"
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Section 16: Secure file upload with size limit, extension whitelist, and MIME verification.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên tệp tin không hợp lệ."
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng tệp không được hỗ trợ ({ext}). Chỉ chấp nhận: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )

    if not file.content_type or file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MIME type không hợp lệ. Vui lòng tải lên tệp ảnh chuẩn."
        )

    # Read and check size
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp tin tải lên rỗng (0 bytes)."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail=f"Kích thước tệp vượt quá giới hạn cho phép (Tối đa 5MB, hiện tại {len(content) / (1024 * 1024):.1f}MB)."
        )

    # Generate safe random filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/{unique_filename}",
        "filename": unique_filename,
        "original_name": file.filename,
        "size_bytes": len(content),
        "content_type": file.content_type
    }
