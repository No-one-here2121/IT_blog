from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.event import Event, EventRegistration
from app.schemas.event import (
    EventCreate,
    EventResponse,
    EventRegistrationCreate,
    EventRegistrationResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/events", tags=["Events & Workshops"])


@router.get("", response_model=List[EventResponse])
def get_events(
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List IT webinars, workshops, conferences, and meetups.
    """
    query = db.query(Event)
    if event_type:
        query = query.filter(Event.event_type == event_type.lower())
    if status:
        query = query.filter(Event.status == status.lower())

    return query.order_by(Event.start_time.asc()).all()


@router.get("/registrations/me", response_model=List[EventRegistrationResponse])
def get_my_event_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all event registrations for current user (Section 46).
    """
    regs = db.query(EventRegistration).filter(EventRegistration.user_id == current_user.id).order_by(EventRegistration.created_at.desc()).all()
    results = []
    for r in regs:
        results.append(EventRegistrationResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            full_name=r.full_name,
            email=r.email,
            notes=r.notes,
            created_at=r.created_at,
            event_title=r.event.title if r.event else None,
            event_slug=r.event.slug if r.event else None,
            start_time=r.event.start_time if r.event else None
        ))
    return results


@router.get("/{id_or_slug}", response_model=EventResponse)
def get_event_detail(id_or_slug: str, db: Session = Depends(get_db)):
    """
    Get IT event details.
    """
    if id_or_slug.isdigit():
        event = db.query(Event).filter(Event.id == int(id_or_slug)).first()
    else:
        event = db.query(Event).filter(Event.slug == id_or_slug).first()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sự kiện không tồn tại")
    return event


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    clean_title = data.title.strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề sự kiện không được để trống."
        )

    clean_desc = data.description.strip() if data.description else ""
    if not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mô tả sự kiện không được để trống."
        )

    clean_org = data.organizer.strip() if data.organizer else ""
    if not clean_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đơn vị tổ chức không được để trống."
        )

    if data.start_time and data.end_time and data.end_time < data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc sự kiện không thể trước thời gian bắt đầu."
        )

    valid_event_types = {"workshop", "webinar", "meetup", "conference"}
    clean_event_type = data.event_type.lower().strip() if data.event_type else "workshop"
    if clean_event_type not in valid_event_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loại sự kiện không hợp lệ. Cho phép: {', '.join(sorted(valid_event_types))}."
        )

    base_slug = slugify(clean_title) or "su-kien"
    slug = base_slug
    counter = 1
    while db.query(Event).filter(Event.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    event = Event(
        title=clean_title,
        slug=slug,
        description=clean_desc,
        organizer=clean_org,
        event_type=clean_event_type,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        online_url=data.online_url,
        registration_url=data.registration_url,
        banner_image=data.banner_image,
        status="upcoming"
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{id}/register", response_model=EventRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_for_event(
    id: int,
    data: EventRegistrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Register/RSVP for an IT workshop or webinar (Section 46).
    """
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sự kiện không tồn tại.")

    if event.status == "ended":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sự kiện này đã kết thúc, không thể đăng ký vé tham gia."
        )

    existing = db.query(EventRegistration).filter(
        EventRegistration.event_id == id,
        EventRegistration.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bạn đã đăng ký tham gia sự kiện này rồi.")

    clean_name = data.full_name.strip() if data.full_name else (current_user.name.strip() if current_user.name else "")
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ và tên người đăng ký không được để trống."
        )

    clean_email = data.email.strip() if data.email else (current_user.email.strip() if current_user.email else "")
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email liên hệ không được để trống."
        )

    registration = EventRegistration(
        event_id=id,
        user_id=current_user.id,
        full_name=clean_name,
        email=clean_email,
        notes=data.notes
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    return EventRegistrationResponse(
        id=registration.id,
        event_id=registration.event_id,
        user_id=registration.user_id,
        full_name=registration.full_name,
        email=registration.email,
        notes=registration.notes,
        created_at=registration.created_at,
        event_title=event.title,
        event_slug=event.slug,
        start_time=event.start_time
    )


@router.get("/{id}/registrations", response_model=List[EventRegistrationResponse])
def get_event_registrations(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    View registrations for an event (Section 46).
    """
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sự kiện không tồn tại.")

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    is_organizer = (
        not event.organizer or
        event.organizer.lower() in [current_user.name.lower(), current_user.username.lower(), current_user.email.lower()]
    )
    is_registered = db.query(EventRegistration).filter(
        EventRegistration.event_id == id,
        EventRegistration.user_id == current_user.id
    ).first() is not None

    if not is_admin and not is_organizer and not is_registered:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Ban tổ chức, Ban quản trị hoặc người tham gia đã đăng ký mới có quyền xem danh sách người tham gia sự kiện này."
        )

    regs = db.query(EventRegistration).filter(EventRegistration.event_id == id).order_by(EventRegistration.created_at.desc()).all()
    results = []
    for r in regs:
        results.append(EventRegistrationResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            full_name=r.full_name,
            email=r.email,
            notes=r.notes,
            created_at=r.created_at,
            event_title=event.title,
            event_slug=event.slug,
            start_time=event.start_time
        ))
    return results


@router.delete("/{id}/register", status_code=status.HTTP_200_OK)
def cancel_event_registration(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cancel registration / refund ticket for an event.
    """
    registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == id,
        EventRegistration.user_id == current_user.id
    ).first()
    if not registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông tin đăng ký vé của bạn.")

    db.delete(registration)
    db.commit()
    return {"message": "Đã hủy đăng ký vé sự kiện thành công.", "event_id": id}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an event. Admin, moderator, or organizer can delete.
    """
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sự kiện không tồn tại.")

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if not is_admin:
        is_organizer = (event.organizer and (event.organizer.lower() in [current_user.name.lower(), current_user.username.lower()]))
        if not is_organizer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa sự kiện này.")

    db.query(EventRegistration).filter(EventRegistration.event_id == id).delete(synchronize_session=False)
    db.delete(event)
    db.commit()
    return None


