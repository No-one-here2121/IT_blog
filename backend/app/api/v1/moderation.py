from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.core.database import get_db
from datetime import datetime, timezone
from app.models.moderation import Report, ReportStatus, BugReport, BugReportStatus, AuditLog
from app.models.post import Post, PostStatus
from app.models.comment import Comment, CommentLike
from app.models.user import User, Role
from app.models.gamification import ReputationLog
from app.models.notification import Notification
from app.schemas.moderation import (
    ReportCreate,
    ReportResponse,
    ReportResolve,
    BugReportCreate,
    BugReportUpdate,
    BugReportResponse,
    AuditLogResponse,
    AdminStatsResponse,
    AdminUserResponse,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate
)
from app.schemas.user import AuthorSummary
from app.api.deps import get_current_active_user, require_role, get_current_user_optional

router = APIRouter(tags=["Moderation & Admin"])


def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Utility to persist audit log records for administrative and critical actions."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip_address
    )
    db.add(entry)
    db.flush()


# 1. User Submits a Report
@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    clean_reason = report_in.reason.strip() if report_in.reason else ""
    if not clean_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lý do báo cáo vi phạm không được để trống."
        )

    clean_target_type = report_in.target_type.lower().strip()
    if clean_target_type not in ["post", "comment", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại đối tượng báo cáo không hợp lệ (chỉ chấp nhận: post, comment, user)."
        )

    resolved_target_id = None
    target_raw = str(report_in.target_id).strip()
    if target_raw.isdigit():
        resolved_target_id = int(target_raw)
    elif clean_target_type == "post" and target_raw.startswith("post_"):
        num_part = target_raw.split("post_")[-1]
        if num_part.isdigit():
            resolved_target_id = int(num_part)
        else:
            post_alias = db.query(Post.id).filter(Post.slug == target_raw).first()
            if post_alias:
                resolved_target_id = post_alias[0]
    elif clean_target_type == "user":
        if target_raw in ["demo_admin", "admin"]:
            u = db.query(User).filter((User.username == "admin") | (User.is_superuser == True)).first()
            if u:
                resolved_target_id = u.id
        elif target_raw in ["demo_moderator", "mod", "moderator"]:
            u = db.query(User).filter((User.username == "mod_dev") | (User.email == "mod@itblog.dev")).first()
            if u:
                resolved_target_id = u.id
        elif target_raw in ["demo_user", "hoang.dev"]:
            u = db.query(User).filter((User.username == "hoang_dev") | (User.email == "hoang.dev@itblog.vn")).first()
            if u:
                resolved_target_id = u.id
        else:
            u = db.query(User).filter(User.username == target_raw.lower()).first()
            if u:
                resolved_target_id = u.id

    if resolved_target_id is None:
        try:
            resolved_target_id = int(target_raw)
        except (ValueError, TypeError):
            resolved_target_id = -1

    if clean_target_type == "post":
        if not db.query(Post.id).filter(Post.id == resolved_target_id).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết bị báo cáo không tồn tại."
            )
    elif clean_target_type == "comment":
        if not db.query(Comment.id).filter(Comment.id == resolved_target_id).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bình luận bị báo cáo không tồn tại."
            )
    elif clean_target_type == "user":
        if resolved_target_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn không thể tự báo cáo chính mình."
            )
        if not db.query(User.id).filter(User.id == resolved_target_id).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Người dùng bị báo cáo không tồn tại."
            )

    new_report = Report(
        reporter_id=current_user.id,
        target_type=clean_target_type,
        target_id=resolved_target_id,
        reason=clean_reason,
        details=report_in.details.strip() if report_in.details else None
    )
    db.add(new_report)

    # Log to audit
    log_audit(
        db,
        user_id=current_user.id,
        action="submit_report",
        target_type=clean_target_type,
        target_id=resolved_target_id,
        details=f"Lý do: {clean_reason}",
        ip_address=request.client.host if request.client else None
    )

    db.commit()
    db.refresh(new_report)

    return ReportResponse(
        id=new_report.id,
        reporter=AuthorSummary.model_validate(current_user),
        target_type=new_report.target_type,
        target_id=new_report.target_id,
        reason=new_report.reason,
        details=new_report.details,
        status=new_report.status,
        resolved_by=new_report.resolved_by,
        created_at=new_report.created_at
    )


# 2. Admin/Moderator Lists Reports
@router.get("/admin/reports", response_model=List[ReportResponse])
def get_reports(
    status_filter: Optional[str] = Query(None, description="Filter: pending, resolved, dismissed"),
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    """
    List violation reports (Requires Admin or Moderator role).
    """
    query = db.query(Report)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Report.status == status_filter.lower())

    reports = query.order_by(desc(Report.created_at)).all()
    results = []
    for r in reports:
        results.append(
            ReportResponse(
                id=r.id,
                reporter=AuthorSummary.model_validate(r.reporter),
                target_type=r.target_type,
                target_id=r.target_id,
                reason=r.reason,
                details=r.details,
                status=r.status,
                resolved_by=r.resolved_by,
                created_at=r.created_at
            )
        )
    return results


# 3. Admin/Moderator Resolves Report
@router.put("/admin/reports/{report_id}", response_model=ReportResponse)
def resolve_report(
    report_id: int,
    resolve_in: ReportResolve,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "moderator"))
):
    """
    Resolve or dismiss report with optional punitive action.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy báo cáo vi phạm."
        )

    valid_statuses = {ReportStatus.RESOLVED.value, ReportStatus.DISMISSED.value}
    resolved_status = resolve_in.status.lower().strip()
    if resolved_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái xử lý không hợp lệ. Các trạng thái hợp lệ: {', '.join(sorted(valid_statuses))}."
        )

    valid_actions = {"none", "remove_content", "ban_user"}
    clean_action = resolve_in.action.lower().strip() if resolve_in.action else "none"
    if clean_action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hành động xử lý không hợp lệ. Các hành động hợp lệ: {', '.join(sorted(valid_actions))}."
        )

    report.status = resolved_status
    report.resolved_by = current_user.id

    # Optional Action
    action_desc = f"Trạng thái: {resolved_status}"
    if clean_action == "remove_content":
        if report.target_type == "post":
            post = db.query(Post).filter(Post.id == report.target_id).first()
            if post:
                post.status = PostStatus.REJECTED.value
                action_desc += " | Đã từ chối bài viết"
        elif report.target_type == "comment":
            comment = db.query(Comment).filter(Comment.id == report.target_id).first()
            if comment:
                db.query(CommentLike).filter(CommentLike.comment_id == comment.id).delete(synchronize_session=False)
                db.query(ReputationLog).filter(
                    ReputationLog.reference_id == comment.id,
                    ReputationLog.action == "accepted_answer"
                ).delete(synchronize_session=False)
                db.query(Notification).filter(
                    Notification.entity_type == "comment",
                    Notification.entity_id == comment.id
                ).delete(synchronize_session=False)
                db.query(Comment).filter(Comment.parent_id == comment.id).update({"parent_id": None}, synchronize_session=False)
                db.delete(comment)
                action_desc += " | Đã xóa bình luận"
    elif clean_action == "ban_user":
        user_to_ban = None
        if report.target_type == "user":
            user_to_ban = db.query(User).filter(User.id == report.target_id).first()
        elif report.target_type == "post":
            post = db.query(Post).filter(Post.id == report.target_id).first()
            if post:
                user_to_ban = db.query(User).filter(User.id == post.author_id).first()
        elif report.target_type == "comment":
            comment = db.query(Comment).filter(Comment.id == report.target_id).first()
            if comment:
                user_to_ban = db.query(User).filter(User.id == comment.author_id).first()
        if user_to_ban and not user_to_ban.is_superuser:
            user_to_ban.is_active = False
            action_desc += f" | Đã khóa tài khoản {user_to_ban.username}"

    log_audit(
        db,
        user_id=current_user.id,
        action=f"resolve_report_{resolve_in.status}",
        target_type=report.target_type,
        target_id=report.target_id,
        details=action_desc,
        ip_address=request.client.host if request.client else None
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportResponse(
        id=report.id,
        reporter=AuthorSummary.model_validate(report.reporter),
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        details=report.details,
        status=report.status,
        resolved_by=report.resolved_by,
        created_at=report.created_at
    )


# 4. Admin Dashboard Statistics
@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    """
    Get system-wide metrics: Users, Posts, Comments, Total Views, Pending items.
    """
    total_users = db.query(User).count()
    total_posts = db.query(Post).count()
    total_comments = db.query(Comment).count()
    total_views = db.query(func.coalesce(func.sum(Post.views), 0)).scalar()
    pending_posts = db.query(Post).filter(Post.status == PostStatus.PENDING.value).count()
    pending_reports = db.query(Report).filter(Report.status == ReportStatus.PENDING.value).count()
    pending_bugs = db.query(BugReport).filter(BugReport.status == BugReportStatus.PENDING.value).count()

    return AdminStatsResponse(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
        total_views=int(total_views),
        pending_posts_count=pending_posts,
        pending_reports_count=pending_reports,
        pending_bugs_count=pending_bugs
    )


# 5. Admin Audit Logs
@router.get("/admin/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin"))
):
    """
    Retrieve recent administrative audit logs (Admin only).
    """
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    results = []
    for l in logs:
        results.append(
            AuditLogResponse(
                id=l.id,
                user=AuthorSummary.model_validate(l.user) if l.user else None,
                action=l.action,
                target_type=l.target_type,
                target_id=l.target_id,
                details=l.details,
                ip_address=l.ip_address,
                created_at=l.created_at
            )
        )
    return results


# 6. Admin User Management Endpoints
@router.get("/admin/users", response_model=List[AdminUserResponse])
def get_admin_users(
    search: Optional[str] = Query(None),
    role_filter: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    """
    Retrieve registered users for administrative management.
    """
    query = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.name.ilike(s), User.username.ilike(s), User.email.ilike(s)))

    users = query.order_by(desc(User.created_at)).limit(limit).all()
    user_ids = [u.id for u in users]
    post_counts = {}
    if user_ids:
        post_counts = dict(
            db.query(Post.author_id, func.count(Post.id))
            .filter(Post.author_id.in_(user_ids))
            .group_by(Post.author_id)
            .all()
        )

    results = []
    for u in users:
        role_names = [r.name for r in u.roles]
        if role_filter and role_filter != "all":
            if role_filter.lower() not in [rn.lower() for rn in role_names]:
                continue
        p_count = post_counts.get(u.id, 0)
        results.append(
            AdminUserResponse(
                id=u.id,
                username=u.username,
                name=u.name,
                email=u.email,
                avatar=u.avatar,
                bio=u.bio,
                is_active=u.is_active,
                is_superuser=u.is_superuser,
                roles=role_names,
                posts_count=p_count,
                created_at=u.created_at
            )
        )
    return results


@router.put("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_in: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin"))
):
    """
    Promote or demote user role (Admin only).
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này.")

    if target_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thay đổi vai trò của tài khoản Quản trị viên tối cao."
        )

    role_name = role_in.role.lower().strip()
    ALLOWED_ROLES = {"admin", "moderator", "author", "user"}
    if role_name not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò '{role_name}' không hợp lệ. Các vai trò hợp lệ: {', '.join(sorted(ALLOWED_ROLES))}."
        )

    if _user.id == target_user.id and role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự hạ cấp vai trò quản trị viên của chính mình."
        )

    role_obj = db.query(Role).filter(Role.name == role_name).first()
    if not role_obj:
        role_obj = Role(name=role_name, description=f"Role {role_name}")
        db.add(role_obj)
        db.flush()

    target_user.roles = [role_obj]
    db.commit()
    return {"message": f"Đã cập nhật vai trò thành công cho {target_user.name}", "role": role_name}


@router.put("/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    status_in: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    """
    Activate or suspend a user account.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này.")

    if target_user.is_superuser and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể vô hiệu hóa tài khoản Quản trị viên tối cao."
        )

    if _user.id == target_user.id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự vô hiệu hóa tài khoản của chính mình."
        )

    target_user.is_active = status_in.is_active
    db.commit()
    return {"message": "Đã cập nhật trạng thái người dùng thành công", "is_active": target_user.is_active}



# ============================================================================
# 7. Bug Reports & Feedback Endpoints (Nhận báo lỗi & Xem danh sách sự cố)
# ============================================================================

@router.post("/bug-reports", response_model=BugReportResponse, status_code=status.HTTP_201_CREATED)
def create_bug_report(
    bug_in: BugReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    clean_title = bug_in.title.strip() if bug_in.title else ""
    clean_desc = bug_in.description.strip() if bug_in.description else ""
    if not clean_title or not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề và nội dung báo lỗi không được để trống."
        )

    reporter_name = bug_in.reporter_name.strip() if bug_in.reporter_name else (current_user.name if current_user else "Khách")
    reporter_email = bug_in.reporter_email.strip() if bug_in.reporter_email else (current_user.email if current_user else None)

    new_bug = BugReport(
        user_id=current_user.id if current_user else None,
        category=bug_in.category or "bug",
        priority=bug_in.priority or "medium",
        title=clean_title,
        description=clean_desc,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        status=BugReportStatus.PENDING.value
    )
    db.add(new_bug)
    db.commit()
    db.refresh(new_bug)

    log_audit(
        db,
        user_id=current_user.id if current_user else None,
        action="submit_bug_report",
        target_type="bug_report",
        target_id=new_bug.id,
        details=f"Báo lỗi: {clean_title} [{new_bug.category}]",
        ip_address=request.client.host if request.client else None
    )

    return BugReportResponse(
        id=new_bug.id,
        user_id=new_bug.user_id,
        reporter=AuthorSummary.model_validate(new_bug.user) if new_bug.user else None,
        category=new_bug.category,
        priority=new_bug.priority,
        title=new_bug.title,
        description=new_bug.description,
        reporter_name=new_bug.reporter_name,
        reporter_email=new_bug.reporter_email,
        status=new_bug.status,
        admin_notes=new_bug.admin_notes,
        resolved_by=new_bug.resolved_by,
        created_at=new_bug.created_at,
        updated_at=new_bug.updated_at
    )


@router.get("/bug-reports", response_model=List[BugReportResponse])
def get_public_bug_reports(
    status_filter: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(BugReport)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(BugReport.status == status_filter.lower())
    if category and category.lower() != "all":
        query = query.filter(BugReport.category == category.lower())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(BugReport.title.ilike(term), BugReport.description.ilike(term)))

    bugs = query.order_by(desc(BugReport.created_at)).all()
    results = []
    for b in bugs:
        results.append(
            BugReportResponse(
                id=b.id,
                user_id=b.user_id,
                reporter=AuthorSummary.model_validate(b.user) if b.user else None,
                category=b.category,
                priority=b.priority,
                title=b.title,
                description=b.description,
                reporter_name=b.reporter_name,
                reporter_email=b.reporter_email,
                status=b.status,
                admin_notes=b.admin_notes,
                resolved_by=b.resolved_by,
                created_at=b.created_at,
                updated_at=b.updated_at
            )
        )
    return results


@router.get("/admin/bug-reports", response_model=List[BugReportResponse])
def get_admin_bug_reports(
    status_filter: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    query = db.query(BugReport)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(BugReport.status == status_filter.lower())
    if category and category.lower() != "all":
        query = query.filter(BugReport.category == category.lower())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(BugReport.title.ilike(term), BugReport.description.ilike(term)))

    bugs = query.order_by(desc(BugReport.created_at)).all()
    results = []
    for b in bugs:
        results.append(
            BugReportResponse(
                id=b.id,
                user_id=b.user_id,
                reporter=AuthorSummary.model_validate(b.user) if b.user else None,
                category=b.category,
                priority=b.priority,
                title=b.title,
                description=b.description,
                reporter_name=b.reporter_name,
                reporter_email=b.reporter_email,
                status=b.status,
                admin_notes=b.admin_notes,
                resolved_by=b.resolved_by,
                created_at=b.created_at,
                updated_at=b.updated_at
            )
        )
    return results


@router.put("/admin/bug-reports/{report_id}", response_model=BugReportResponse)
def update_bug_report(
    report_id: int,
    bug_update: BugReportUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "moderator"))
):
    bug = db.query(BugReport).filter(BugReport.id == report_id).first()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Báo cáo lỗi không tồn tại."
        )

    if bug_update.status:
        st = bug_update.status.lower().strip()
        valid_statuses = [s.value for s in BugReportStatus]
        if st not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái không hợp lệ."
            )
        bug.status = st
        if st in [BugReportStatus.RESOLVED.value, BugReportStatus.DISMISSED.value]:
            bug.resolved_by = current_user.id

    if bug_update.admin_notes is not None:
        bug.admin_notes = bug_update.admin_notes.strip() if bug_update.admin_notes else None

    if bug_update.priority:
        bug.priority = bug_update.priority.lower().strip()

    bug.updated_at = datetime.now(timezone.utc)
    db.add(bug)
    db.commit()
    db.refresh(bug)

    log_audit(
        db,
        user_id=current_user.id,
        action=f"update_bug_report_{bug.status}",
        target_type="bug_report",
        target_id=bug.id,
        details=f"Cập nhật trạng thái sang '{bug.status}'. Ghi chú: {bug.admin_notes or 'Không có'}",
        ip_address=request.client.host if request.client else None
    )

    return BugReportResponse(
        id=bug.id,
        user_id=bug.user_id,
        reporter=AuthorSummary.model_validate(bug.user) if bug.user else None,
        category=bug.category,
        priority=bug.priority,
        title=bug.title,
        description=bug.description,
        reporter_name=bug.reporter_name,
        reporter_email=bug.reporter_email,
        status=bug.status,
        admin_notes=bug.admin_notes,
        resolved_by=bug.resolved_by,
        created_at=bug.created_at,
        updated_at=bug.updated_at
    )


@router.delete("/admin/bug-reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bug_report(
    report_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "moderator"))
):
    bug = db.query(BugReport).filter(BugReport.id == report_id).first()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Báo cáo lỗi không tồn tại."
        )

    log_audit(
        db,
        user_id=current_user.id,
        action="delete_bug_report",
        target_type="bug_report",
        target_id=bug.id,
        details=f"Đã xóa báo cáo lỗi: {bug.title}",
        ip_address=request.client.host if request.client else None
    )

    db.delete(bug)
    db.commit()
    return None
