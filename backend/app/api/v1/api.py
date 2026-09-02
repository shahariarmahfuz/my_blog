from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, roles, groups, members, member_applications, public, beneficiaries,
    contributions, donations, assistance, repayments, dashboard, reports, audit_logs, settings, files, branding
)

api_router = APIRouter()

api_router.include_router(public.router, prefix="/public", tags=["Public Portal"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(files.router, prefix="/files", tags=["Cloudinary Files & Documents"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles & RBAC"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
api_router.include_router(members.router, prefix="/members", tags=["Members"])
api_router.include_router(member_applications.router, prefix="/member-applications", tags=["Member Applications"])
api_router.include_router(beneficiaries.router, prefix="/beneficiaries", tags=["Beneficiaries"])
api_router.include_router(contributions.router, prefix="/contributions", tags=["Contributions"])
api_router.include_router(donations.router, prefix="/donations", tags=["External Donations"])
api_router.include_router(assistance.router, prefix="/assistance", tags=["Assistance (Qard Hasan & Sadaqah)"])
api_router.include_router(repayments.router, prefix="/repayments", tags=["Qard Hasan Repayments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(branding.router, prefix="/branding", tags=["Foundation Branding"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
