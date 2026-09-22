from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.ads import Ad, AdCampaign, AdClick
from app.schemas.ads import (
    AdResponse,
    AdCreate,
    AdStatusUpdate,
    AdCampaignCreate,
    AdCampaignResponse,
    AdClickResponse
)
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/ads", tags=["IT Ads & Developer Promotions"])


DEFAULT_ADS = [
    {
        "title": "AWS Cloud Credits cho Nhà phát triển",
        "description": "Nhận ngay $300 credit trải nghiệm triển khai hệ thống phân tán trên nền tảng AWS Cloud.",
        "creative_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
        "target_url": "https://aws.amazon.com/free",
        "category": "cloud"
    },
    {
        "title": "JetBrains All Products Pack - Bản quyền sinh viên & Dev",
        "description": "Bộ công cụ IDE lập trình số 1 thế giới dành cho lập trình viên Python, Go, Java và Rust.",
        "creative_url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
        "target_url": "https://www.jetbrains.com",
        "category": "tools"
    }
]


def ensure_default_ads(db: Session):
    count = db.query(Ad).count()
    if count == 0:
        for a in DEFAULT_ADS:
            db.add(Ad(**a, status="active"))
        db.commit()


@router.get("/active", response_model=List[AdResponse])
def get_active_ads(
    category: Optional[str] = None,
    limit: int = Query(default=2, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get active targeted IT ads. Automatically increments impression counter.
    """
    ensure_default_ads(db)
    query = db.query(Ad).filter(Ad.status == "active")
    if category:
        query = query.filter(Ad.category == category.lower())

    ads = query.order_by(Ad.id.asc()).limit(limit).all()
    for ad in ads:
        ad.impressions_count += 1
    db.commit()

    return ads


@router.post("/{id}/click", response_model=AdClickResponse)
def record_ad_click(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Record an ad click and return the target destination URL.
    """
    ad = db.query(Ad).filter(Ad.id == id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quảng cáo không tồn tại")

    if ad.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quảng cáo này hiện không còn hoạt động."
        )

    ad.clicks_count += 1
    click_event = AdClick(
        ad_id=ad.id,
        user_id=current_user.id if current_user else None
    )
    db.add(click_event)
    db.commit()

    return AdClickResponse(
        ad_id=ad.id,
        clicks_count=ad.clicks_count,
        target_url=ad.target_url
    )


@router.get("", response_model=List[AdResponse])
def get_all_ads(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all IT promotional ads (admin & management).
    """
    ensure_default_ads(db)
    query = db.query(Ad)
    if category:
        query = query.filter(Ad.category == category.lower())
    if status_filter:
        query = query.filter(Ad.status == status_filter.lower())
    return query.order_by(Ad.id.desc()).all()


@router.post("", response_model=AdResponse, status_code=status.HTTP_201_CREATED)
def create_ad(
    data: AdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new IT promotion ad.
    """
    if not data.title or not data.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề quảng cáo không được để trống."
        )
    if not data.target_url or not data.target_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đường dẫn đích (target_url) không được để trống."
        )
    if data.campaign_id is not None:
        campaign = db.query(AdCampaign).filter(AdCampaign.id == data.campaign_id).first()
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chiến dịch quảng cáo không tồn tại."
            )

    ad = Ad(
        campaign_id=data.campaign_id,
        title=data.title.strip(),
        description=data.description,
        creative_url=data.creative_url,
        target_url=data.target_url.strip(),
        category=data.category,
        status="active"
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ad


@router.put("/{id}/status", response_model=AdResponse)
def update_ad_status(
    id: int,
    data: AdStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update ad status (active / paused).
    """
    ad = db.query(Ad).filter(Ad.id == id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quảng cáo không tồn tại")
    clean_status = data.status.lower()
    valid_statuses = {"active", "paused", "inactive", "archived"}
    if clean_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái quảng cáo không hợp lệ."
        )
    ad.status = clean_status
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ad


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ad(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an ad campaign.
    """
    ad = db.query(Ad).filter(Ad.id == id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quảng cáo không tồn tại")
    db.query(AdClick).filter(AdClick.ad_id == id).delete(synchronize_session=False)
    db.delete(ad)
    db.commit()
    return None
