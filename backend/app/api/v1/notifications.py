from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db, SessionLocal
from app.core.security import decode_token
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse,
    NotificationListResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# WebSocket Realtime Notification Manager
class ConnectionManager:
    def __init__(self):
        # Map user_id to active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.loop = None

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        import asyncio
        try:
            self.loop = asyncio.get_running_loop()
        except Exception:
            pass
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(user_id, dead)

    def send_personal_message_threadsafe(self, user_id: int, message: dict):
        if user_id not in self.active_connections:
            return
        import asyncio
        if self.loop and self.loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(self.send_personal_message(user_id, message), self.loop)
            except Exception:
                pass


ws_manager = ConnectionManager()


def dispatch_realtime_notification(user_id: int, notif_dict: dict):
    """Safely dispatches a notification payload over WebSocket to active users."""
    try:
        ws_manager.send_personal_message_threadsafe(user_id, notif_dict)
    except Exception:
        pass


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    type_filter: Optional[str] = Query(None, description="Filter: like, comment, reply, follow, post, system"),
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Get user notifications with filtering and unread count badge.
    """
    query = db.query(Notification).filter(Notification.recipient_id == current_user.id)

    if type_filter and type_filter.lower() != "all":
        query = query.filter(Notification.type == type_filter.lower())

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    offset = (page - 1) * limit
    notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

    unread_count = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read == False)
        .count()
    )

    items = [NotificationResponse.model_validate(n) for n in notifications]
    return NotificationListResponse(items=items, total=total, unread_count=unread_count)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get unread notifications count for header badge.
    """
    count = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark a single notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo."
        )

    notif.is_read = True
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return NotificationResponse.model_validate(notif)


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark all notifications of current user as read.
    """
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}


@router.delete("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete all notifications for current user.
    """
    deleted_count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {
        "message": "Đã xóa toàn bộ thông báo thành công.",
        "deleted_count": deleted_count
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a single notification.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo."
        )

    db.delete(notif)
    db.commit()
    return {"message": "Đã xóa thông báo thành công."}


@router.websocket("/ws")
async def websocket_notifications(websocket: WebSocket, token: Optional[str] = Query(None)):
    """
    Realtime WebSocket notification feed for authenticated user.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    sub = payload.get("sub")
    if not sub:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify user exists and is currently active
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    finally:
        db.close()

    await ws_manager.connect(user_id, websocket)

    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except Exception:
        pass
    finally:
        ws_manager.disconnect(user_id, websocket)
