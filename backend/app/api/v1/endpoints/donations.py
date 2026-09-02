from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.schemas.donation import (
    DonationCreate, DonationUpdate, DonationOut, DonationDetailOut,
    DonationVoidIn, DonationSummaryMetrics, DonationLedgerOut
)
from app.services.donation_service import DonationService

router = APIRouter()

@router.get("/metrics", response_model=DonationSummaryMetrics)
def get_donation_summary_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.view"))
):
    """Returns executive metrics for external donations."""
    return DonationService.get_donation_metrics(db)

@router.get("/ledger", response_model=DonationLedgerOut)
def get_donation_ledger(
    group_id: Optional[UUID] = Query(None, description="Filter by External Fund Group"),
    from_date: Optional[date] = Query(None, description="Filter starting from donation date"),
    to_date: Optional[date] = Query(None, description="Filter up to donation date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.view"))
):
    """Returns the dedicated external donations financial ledger."""
    return DonationService.get_donation_ledger(
        db=db,
        group_id=group_id,
        from_date=from_date,
        to_date=to_date
    )

@router.get("", response_model=List[DonationOut])
def list_donations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    group_id: Optional[UUID] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    min_amount: Optional[Decimal] = Query(None),
    max_amount: Optional[Decimal] = Query(None),
    is_voided: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.view"))
):
    """Lists external donations with search, filters, and pagination."""
    return DonationService.list_donations(
        db=db,
        skip=skip,
        limit=limit,
        group_id=group_id,
        from_date=from_date,
        to_date=to_date,
        min_amount=min_amount,
        max_amount=max_amount,
        is_voided=is_voided,
        search=search
    )

@router.post("", response_model=DonationOut, status_code=status.HTTP_201_CREATED)
def create_donation(
    request: Request,
    data: DonationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.create"))
):
    """
    Records an external donation into an External Fund Group.
    Strictly validates that the recipient group is of type EXTERNAL_FUND.
    Creates immutable double-entry CREDIT ledger records.
    """
    client_ip = get_client_ip(request)
    return DonationService.create_donation(db=db, data=data, user=current_user, client_ip=client_ip)

@router.get("/{donation_id}", response_model=DonationDetailOut)
def get_donation_detail(
    donation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.view"))
):
    """Returns complete details of a donation receipt."""
    return DonationService.get_donation(db=db, donation_id=donation_id)

@router.patch("/{donation_id}", response_model=DonationOut)
def update_donation(
    request: Request,
    donation_id: UUID,
    data: DonationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.edit"))
):
    """Updates metadata (donor details, purpose, reference, notes) of a donation record."""
    client_ip = get_client_ip(request)
    return DonationService.update_donation(db=db, donation_id=donation_id, data=data, user=current_user, client_ip=client_ip)

@router.post("/{donation_id}/void", response_model=DonationOut)
def void_donation(
    request: Request,
    donation_id: UUID,
    data: DonationVoidIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("donations.void"))
):
    """
    Safely voids an external donation, creating an audit-backed reversing DEBIT entry in the ledger.
    """
    client_ip = get_client_ip(request)
    return DonationService.void_donation(db=db, donation_id=donation_id, reason=data.reason, user=current_user, client_ip=client_ip)
