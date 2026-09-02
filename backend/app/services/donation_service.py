import uuid
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, date
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.donation import Donation
from app.models.group import Group, GroupType
from app.models.user import User
from app.schemas.donation import (
    DonationCreate, DonationUpdate, DonationOut, DonationDetailOut,
    DonationSummaryMetrics, DonationLedgerOut, DonationLedgerEntryOut
)
from app.services.ledger_service import LedgerService
from app.services.audit_service import AuditService

class DonationService:
    @staticmethod
    def _generate_receipt_number(db: Session, donation_date: date) -> str:
        """
        Generates unique receipt number: DON-YYYYMMDD-XXXX
        """
        date_str = donation_date.strftime("%Y%m%d")
        prefix = f"DON-{date_str}"
        
        # Count existing donations with this prefix to get next sequence
        count = db.query(func.count(Donation.id)).filter(
            Donation.receipt_number.like(f"{prefix}-%")
        ).scalar() or 0
        
        seq = count + 1
        for _ in range(100):
            receipt_no = f"{prefix}-{seq:04d}"
            exists = db.query(Donation.id).filter(Donation.receipt_number == receipt_no).first()
            if not exists:
                return receipt_no
            seq += 1
            
        return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def create_donation(db: Session, data: DonationCreate, user: User, client_ip: Optional[str] = None) -> Donation:
        # 1. Validate Group
        group = db.query(Group).filter(Group.id == data.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Selected Fund Group not found.")
        
        if group.group_type != GroupType.EXTERNAL_FUND:
            raise HTTPException(
                status_code=400,
                detail=f"External donations can only be deposited into External Fund Groups. '{group.name}' is a Member Fund Group."
            )
        
        if not group.is_active:
            raise HTTPException(status_code=400, detail=f"Cannot receive donations into inactive fund group '{group.name}'.")

        # 2. Validate Amount
        if data.amount <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Donation amount must be greater than zero.")

        # 3. Generate Receipt Number
        receipt_no = DonationService._generate_receipt_number(db, data.donation_date)

        # 4. Create Donation Record
        donation = Donation(
            receipt_number=receipt_no,
            donor_name=data.donor_name.strip(),
            donor_phone=data.donor_phone.strip() if data.donor_phone else None,
            donor_email=data.donor_email.strip() if data.donor_email else None,
            donor_address=data.donor_address.strip() if data.donor_address else None,
            amount=data.amount,
            group_id=data.group_id,
            donation_date=data.donation_date,
            purpose=data.purpose.strip() if data.purpose else "General Donation",
            payment_method=data.payment_method,
            reference_number=data.reference_number.strip() if data.reference_number else None,
            notes=data.notes.strip() if data.notes else None,
            created_by=user.id
        )
        db.add(donation)
        db.flush()

        # 5. Record Double-Entry Financial Ledger (Credits the External Fund Group)
        LedgerService.record_donation_ledger(db, donation, user_id=user.id)

        # 6. Audit Trail
        AuditService.log(
            db=db,
            action="CREATE",
            entity_name="donations",
            entity_id=str(donation.id),
            new_values={
                "receipt_number": receipt_no,
                "donor_name": donation.donor_name,
                "amount": str(donation.amount),
                "group_id": str(donation.group_id),
                "group_name": group.name,
                "donation_date": str(donation.donation_date),
                "purpose": donation.purpose,
                "payment_method": donation.payment_method.value
            },
            user_id=user.id,
            ip_address=client_ip
        )

        db.commit()
        db.refresh(donation)
        return donation

    @staticmethod
    def void_donation(db: Session, donation_id: UUID, reason: str, user: User, client_ip: Optional[str] = None) -> Donation:
        donation = db.query(Donation).filter(Donation.id == donation_id).first()
        if not donation:
            raise HTTPException(status_code=404, detail="Donation record not found.")

        if donation.is_voided:
            raise HTTPException(status_code=400, detail="This donation has already been voided.")

        # Check if voiding would cause negative group balance
        current_group_bal = LedgerService.get_group_balance(db, donation.group_id)
        if current_group_bal < donation.amount:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot void donation: Group balance (৳{current_group_bal:,.2f}) is insufficient to reverse ৳{donation.amount:,.2f}."
            )

        # Mark voided
        donation.is_voided = True
        donation.void_reason = reason
        donation.voided_at = datetime.now(timezone.utc)
        donation.voided_by = user.id

        # Record reversing transaction in ledger
        LedgerService.record_donation_reversal_ledger(db, donation, reason=reason, user_id=user.id)

        # Audit
        AuditService.log(
            db=db,
            action="VOID",
            entity_name="donations",
            entity_id=str(donation.id),
            new_values={"is_voided": True, "void_reason": reason, "voided_by": str(user.id)},
            user_id=user.id,
            ip_address=client_ip
        )

        db.commit()
        db.refresh(donation)
        return donation

    @staticmethod
    def update_donation(db: Session, donation_id: UUID, data: DonationUpdate, user: User, client_ip: Optional[str] = None) -> Donation:
        donation = db.query(Donation).filter(Donation.id == donation_id).first()
        if not donation:
            raise HTTPException(status_code=404, detail="Donation record not found.")

        if donation.is_voided:
            raise HTTPException(status_code=400, detail="Cannot edit a voided donation record.")

        old_values = {
            "donor_name": donation.donor_name,
            "donor_phone": donation.donor_phone,
            "donor_email": donation.donor_email,
            "purpose": donation.purpose,
            "payment_method": donation.payment_method.value if donation.payment_method else None,
            "reference_number": donation.reference_number,
            "notes": donation.notes
        }

        if data.donor_name is not None:
            donation.donor_name = data.donor_name.strip()
        if data.donor_phone is not None:
            donation.donor_phone = data.donor_phone.strip() if data.donor_phone else None
        if data.donor_email is not None:
            donation.donor_email = data.donor_email.strip() if data.donor_email else None
        if data.donor_address is not None:
            donation.donor_address = data.donor_address.strip() if data.donor_address else None
        if data.purpose is not None:
            donation.purpose = data.purpose.strip() if data.purpose else "General Donation"
        if data.payment_method is not None:
            donation.payment_method = data.payment_method
        if data.reference_number is not None:
            donation.reference_number = data.reference_number.strip() if data.reference_number else None
        if data.notes is not None:
            donation.notes = data.notes.strip() if data.notes else None

        donation.updated_at = datetime.now(timezone.utc)

        AuditService.log(
            db=db,
            action="UPDATE",
            entity_name="donations",
            entity_id=str(donation.id),
            old_values=old_values,
            new_values={
                "donor_name": donation.donor_name,
                "donor_phone": donation.donor_phone,
                "donor_email": donation.donor_email,
                "purpose": donation.purpose,
                "payment_method": donation.payment_method.value if donation.payment_method else None,
                "reference_number": donation.reference_number,
                "notes": donation.notes
            },
            user_id=user.id,
            ip_address=client_ip
        )

        db.commit()
        db.refresh(donation)
        return donation

    @staticmethod
    def get_donation(db: Session, donation_id: UUID) -> DonationDetailOut:
        donation = db.query(Donation).filter(Donation.id == donation_id).first()
        if not donation:
            raise HTTPException(status_code=404, detail="Donation record not found.")

        creator_name = donation.creator.full_name if donation.creator else None
        voider_name = donation.voider.full_name if donation.voider else None

        return DonationDetailOut(
            id=donation.id,
            receipt_number=donation.receipt_number,
            donor_name=donation.donor_name,
            donor_phone=donation.donor_phone,
            donor_email=donation.donor_email,
            donor_address=donation.donor_address,
            amount=donation.amount,
            group_id=donation.group_id,
            group_name=donation.group.name if donation.group else None,
            group_code=donation.group.code if donation.group else None,
            donation_date=donation.donation_date,
            purpose=donation.purpose,
            payment_method=donation.payment_method,
            reference_number=donation.reference_number,
            notes=donation.notes,
            is_voided=donation.is_voided,
            void_reason=donation.void_reason,
            voided_at=donation.voided_at,
            voided_by=donation.voided_by,
            created_by=donation.created_by,
            created_at=donation.created_at,
            updated_at=donation.updated_at,
            creator_name=creator_name,
            voider_name=voider_name
        )

    @staticmethod
    def list_donations(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        group_id: Optional[UUID] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        is_voided: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[DonationOut]:
        query = db.query(Donation)

        if group_id:
            query = query.filter(Donation.group_id == group_id)
        if from_date:
            query = query.filter(Donation.donation_date >= from_date)
        if to_date:
            query = query.filter(Donation.donation_date <= to_date)
        if min_amount is not None:
            query = query.filter(Donation.amount >= min_amount)
        if max_amount is not None:
            query = query.filter(Donation.amount <= max_amount)
        if is_voided is not None:
            query = query.filter(Donation.is_voided == is_voided)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (Donation.donor_name.ilike(s)) |
                (Donation.donor_phone.ilike(s)) |
                (Donation.receipt_number.ilike(s)) |
                (Donation.reference_number.ilike(s)) |
                (Donation.purpose.ilike(s))
            )

        donations = query.order_by(desc(Donation.donation_date), desc(Donation.created_at)).offset(skip).limit(limit).all()

        results = []
        for d in donations:
            results.append(DonationOut(
                id=d.id,
                receipt_number=d.receipt_number,
                donor_name=d.donor_name,
                donor_phone=d.donor_phone,
                donor_email=d.donor_email,
                donor_address=d.donor_address,
                amount=d.amount,
                group_id=d.group_id,
                group_name=d.group.name if d.group else None,
                group_code=d.group.code if d.group else None,
                donation_date=d.donation_date,
                purpose=d.purpose,
                payment_method=d.payment_method,
                reference_number=d.reference_number,
                notes=d.notes,
                is_voided=d.is_voided,
                void_reason=d.void_reason,
                voided_at=d.voided_at,
                voided_by=d.voided_by,
                created_by=d.created_by,
                created_at=d.created_at,
                updated_at=d.updated_at
            ))
        return results

    @staticmethod
    def get_donation_metrics(db: Session) -> DonationSummaryMetrics:
        today = date.today()
        first_of_month = date(today.year, today.month, 1)

        total_amount = db.query(
            func.coalesce(func.sum(Donation.amount), Decimal("0.00"))
        ).filter(Donation.is_voided == False).scalar()

        total_count = db.query(func.count(Donation.id)).filter(Donation.is_voided == False).scalar() or 0

        this_month_amount = db.query(
            func.coalesce(func.sum(Donation.amount), Decimal("0.00"))
        ).filter(
            Donation.is_voided == False,
            Donation.donation_date >= first_of_month
        ).scalar()

        active_funds = db.query(func.count(func.distinct(Donation.group_id))).filter(Donation.is_voided == False).scalar() or 0

        return DonationSummaryMetrics(
            total_donations_amount=Decimal(str(total_amount or 0)),
            total_donations_count=total_count,
            this_month_amount=Decimal(str(this_month_amount or 0)),
            active_funds_count=active_funds
        )

    @staticmethod
    def get_donation_ledger(
        db: Session,
        group_id: Optional[UUID] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> DonationLedgerOut:
        query = db.query(Donation)
        if group_id:
            query = query.filter(Donation.group_id == group_id)
        if from_date:
            query = query.filter(Donation.donation_date >= from_date)
        if to_date:
            query = query.filter(Donation.donation_date <= to_date)

        donations = query.order_by(desc(Donation.donation_date), desc(Donation.created_at)).all()

        entries = []
        total_amt = Decimal("0.00")
        for d in donations:
            if not d.is_voided:
                total_amt += d.amount
            entries.append(DonationLedgerEntryOut(
                id=d.id,
                receipt_number=d.receipt_number,
                donation_date=d.donation_date,
                donor_name=d.donor_name,
                donor_phone=d.donor_phone,
                group_id=d.group_id,
                group_name=d.group.name if d.group else "N/A",
                purpose=d.purpose,
                amount=d.amount,
                payment_method=d.payment_method.value if d.payment_method else "CASH",
                reference_number=d.reference_number,
                is_voided=d.is_voided,
                created_at=d.created_at
            ))

        return DonationLedgerOut(
            total_count=len(entries),
            total_amount=total_amt,
            entries=entries
        )
