from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, get_client_ip
from app.models.user import User
from app.models.beneficiary import Beneficiary
from app.models.group import Group
from app.models.assistance import Assistance, AssistanceFundingAllocation, AssistanceType
from app.models.repayment import QardHasanRepayment
from app.models.file_document import FileDocument
from app.services.cloudinary_service import CloudinaryService
from app.schemas.beneficiary import BeneficiaryCreate, BeneficiaryUpdate, BeneficiaryOut, BeneficiaryLedgerOut, BeneficiaryLedgerEntry
from app.schemas.assistance import AssistanceOut
from app.schemas.repayment import RepaymentOut
from app.services.audit_service import AuditService
from app.services.id_service import IdService

router = APIRouter()

def resolve_beneficiary(db: Session, identifier: str) -> Beneficiary:
    """Resolve beneficiary by either UUID or human-readable beneficiary_code (e.g. B-0001 or BEN-0001)."""
    clean_id = identifier.strip()
    try:
        uuid_obj = UUID(clean_id)
        ben = db.query(Beneficiary).filter(Beneficiary.id == uuid_obj).first()
        if ben:
            return ben
    except (ValueError, TypeError, AttributeError):
        pass
    
    # Lookup by beneficiary_code (case-insensitive)
    ben = db.query(Beneficiary).filter(Beneficiary.beneficiary_code.ilike(clean_id)).first()
    if ben:
        return ben
        
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Beneficiary '{identifier}' not found.")

@router.get("/next-code", response_model=dict)
def get_next_beneficiary_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    """Generate the next auto-suggested Beneficiary ID (e.g. B-0001)."""
    candidate_code = IdService.generate_beneficiary_code(db)
    return {"next_beneficiary_code": candidate_code}

@router.get("", response_model=List[BeneficiaryOut])
def list_beneficiaries(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    group_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    query = db.query(Beneficiary).join(Group, Group.id == Beneficiary.group_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Beneficiary.name.ilike(search_pattern)) |
            (Beneficiary.beneficiary_code.ilike(search_pattern)) |
            (Beneficiary.phone.ilike(search_pattern)) |
            (Beneficiary.national_id.ilike(search_pattern))
        )
    if group_id:
        query = query.filter(Beneficiary.group_id == group_id)
    if is_active is not None:
        query = query.filter(Beneficiary.is_active == is_active)

    beneficiaries = query.order_by(Beneficiary.created_at.desc()).offset(skip).limit(limit).all()
    
    ben_ids = [b.id for b in beneficiaries]
    
    # Calculate financial totals per beneficiary
    qh_rows = (
        db.query(
            Assistance.beneficiary_id,
            func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")),
            func.coalesce(func.sum(AssistanceFundingAllocation.repaid_amount), Decimal("0.00"))
        ).join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
        .filter(Assistance.beneficiary_id.in_(ben_ids), Assistance.assistance_type == AssistanceType.QARD_HASAN)\
        .group_by(Assistance.beneficiary_id).all()
    ) if ben_ids else []
    qh_stats = {row[0]: (row[1], row[2]) for row in qh_rows}

    sd_rows = (
        db.query(
            Assistance.beneficiary_id,
            func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00"))
        ).filter(Assistance.beneficiary_id.in_(ben_ids), Assistance.assistance_type == AssistanceType.SADAQAH)\
        .group_by(Assistance.beneficiary_id).all()
    ) if ben_ids else []
    sd_stats = {row[0]: row[1] for row in sd_rows}

    result = []
    for b in beneficiaries:
        out = BeneficiaryOut.model_validate(b)
        out.group_name = b.group.name if b.group else ""

        qh_stat = qh_stats.get(b.id)
        if qh_stat:
            out.total_qard_hasan_received = Decimal(str(qh_stat[0]))
            out.total_qard_hasan_repaid = Decimal(str(qh_stat[1]))
            out.outstanding_qard_hasan = max(Decimal("0.00"), out.total_qard_hasan_received - out.total_qard_hasan_repaid)
        else:
            out.total_qard_hasan_received = Decimal("0.00")
            out.total_qard_hasan_repaid = Decimal("0.00")
            out.outstanding_qard_hasan = Decimal("0.00")

        sd_amt = sd_stats.get(b.id, Decimal("0.00"))
        out.total_sadaqah_received = Decimal(str(sd_amt))
        out.total_assistance_received = out.total_qard_hasan_received + out.total_sadaqah_received

        result.append(out)

    return result

@router.get("/{beneficiary_id}", response_model=BeneficiaryOut)
def get_beneficiary(
    beneficiary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    b = resolve_beneficiary(db, beneficiary_id)

    out = BeneficiaryOut.model_validate(b)
    out.group_name = b.group.name if b.group else ""

    qh_stat = db.query(
        func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")),
        func.coalesce(func.sum(AssistanceFundingAllocation.repaid_amount), Decimal("0.00"))
    ).join(AssistanceFundingAllocation, AssistanceFundingAllocation.assistance_id == Assistance.id)\
    .filter(Assistance.beneficiary_id == b.id, Assistance.assistance_type == AssistanceType.QARD_HASAN).first()

    if qh_stat and qh_stat[0]:
        out.total_qard_hasan_received = Decimal(str(qh_stat[0]))
        out.total_qard_hasan_repaid = Decimal(str(qh_stat[1]))
        out.outstanding_qard_hasan = max(Decimal("0.00"), out.total_qard_hasan_received - out.total_qard_hasan_repaid)
    else:
        out.total_qard_hasan_received = Decimal("0.00")
        out.total_qard_hasan_repaid = Decimal("0.00")
        out.outstanding_qard_hasan = Decimal("0.00")

    sd_amt = db.query(func.coalesce(func.sum(Assistance.total_amount), Decimal("0.00")))\
        .filter(Assistance.beneficiary_id == b.id, Assistance.assistance_type == AssistanceType.SADAQAH).scalar()
    
    out.total_sadaqah_received = Decimal(str(sd_amt or 0))
    out.total_assistance_received = out.total_qard_hasan_received + out.total_sadaqah_received

    return out

@router.get("/{beneficiary_id}/assistance", response_model=List[AssistanceOut])
def get_beneficiary_assistance(
    beneficiary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    b = resolve_beneficiary(db, beneficiary_id)

    records = db.query(Assistance)\
        .filter(Assistance.beneficiary_id == b.id)\
        .order_by(Assistance.disbursement_date.desc()).all()

    result = []
    for a in records:
        out = AssistanceOut.model_validate(a)
        out.beneficiary_name = b.name
        out.beneficiary_code = b.beneficiary_code
        out.assistance_type = a.assistance_type.value if hasattr(a.assistance_type, "value") else str(a.assistance_type)
        out.payment_method = a.payment_method.value if hasattr(a.payment_method, "value") else str(a.payment_method)
        result.append(out)
    return result

@router.get("/{beneficiary_id}/repayments", response_model=List[RepaymentOut])
def get_beneficiary_repayments(
    beneficiary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    b = resolve_beneficiary(db, beneficiary_id)

    records = db.query(QardHasanRepayment)\
        .join(Assistance, Assistance.id == QardHasanRepayment.assistance_id)\
        .filter(Assistance.beneficiary_id == b.id)\
        .order_by(QardHasanRepayment.repayment_date.desc()).all()

    result = []
    for r in records:
        out = RepaymentOut.model_validate(r)
        out.beneficiary_name = b.name
        out.beneficiary_code = b.beneficiary_code
        out.payment_method = r.payment_method.value if hasattr(r.payment_method, "value") else str(r.payment_method)
        result.append(out)
    return result

@router.get("/{beneficiary_id}/ledger", response_model=BeneficiaryLedgerOut)
def get_beneficiary_ledger(
    beneficiary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.view"))
):
    b = resolve_beneficiary(db, beneficiary_id)

    # 1. Fetch Assistance (Disbursements)
    assistance_list = db.query(Assistance).filter(Assistance.beneficiary_id == b.id).all()
    # 2. Fetch Repayments
    repayments = db.query(QardHasanRepayment)\
        .join(Assistance, Assistance.id == QardHasanRepayment.assistance_id)\
        .filter(Assistance.beneficiary_id == b.id).all()

    raw_events = []
    for a in assistance_list:
        raw_events.append({
            "date": a.disbursement_date,
            "created_at": a.created_at,
            "event_type": "DISBURSEMENT",
            "assistance_type": a.assistance_type.value if hasattr(a.assistance_type, "value") else str(a.assistance_type),
            "amount": Decimal(str(a.total_amount)),
            "notes": a.purpose or a.notes,
            "assistance_code": a.assistance_code,
            "id": a.id
        })

    for r in repayments:
        raw_events.append({
            "date": r.payment_date,
            "created_at": r.created_at,
            "event_type": "REPAYMENT",
            "assistance_type": "QARD_HASAN",
            "amount": Decimal(str(r.amount)),
            "notes": r.notes or (f"Repayment {r.receipt_number}" if r.receipt_number else "Repayment"),
            "assistance_code": r.assistance.assistance_code if r.assistance else None,
            "id": r.id
        })

    # Sort chronological
    raw_events.sort(key=lambda x: (x["date"], x["created_at"]))

    running_loan = Decimal("0.00")
    total_qh_received = Decimal("0.00")
    total_qh_repaid = Decimal("0.00")
    total_sadaqah = Decimal("0.00")

    entries = []
    for ev in raw_events:
        is_disb = ev["event_type"] == "DISBURSEMENT"
        amt = ev["amount"]
        is_qh = ev["assistance_type"] == "QARD_HASAN"

        if is_disb:
            if is_qh:
                running_loan += amt
                total_qh_received += amt
            else:
                total_sadaqah += amt
        else:
            running_loan -= amt
            total_qh_repaid += amt

        entries.append(BeneficiaryLedgerEntry(
            id=ev["id"],
            date=ev["date"],
            transaction_type=f"{ev['assistance_type']}_{ev['event_type']}",
            code=ev["assistance_code"] or "N/A",
            description=ev["notes"],
            funding_groups=[],
            disbursed_amount=amt if is_disb else Decimal("0.00"),
            repaid_amount=amt if not is_disb else Decimal("0.00"),
            running_outstanding_loan=running_loan
        ))

    entries.reverse()

    return BeneficiaryLedgerOut(
        beneficiary_id=b.id,
        beneficiary_name=b.name,
        beneficiary_code=b.beneficiary_code,
        group_id=b.group_id,
        group_name=b.group.name if b.group else "",
        is_active=b.is_active,
        total_qard_hasan_received=total_qh_received,
        total_qard_hasan_repaid=total_qh_repaid,
        outstanding_qard_hasan=running_loan,
        total_sadaqah_received=total_sadaqah,
        total_assistance_received=total_qh_received + total_sadaqah,
        entries=entries
    )

@router.post("", response_model=BeneficiaryOut, status_code=status.HTTP_201_CREATED)
def create_beneficiary(
    request: Request,
    ben_in: BeneficiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.create"))
):
    # Only Name and Group are strictly required
    name_clean = ben_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Beneficiary Full Name is required.")

    group = db.query(Group).filter(Group.id == ben_in.group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned Group does not exist.")

    # Beneficiary Code validation / auto-generation
    code_clean = IdService.validate_and_sanitize_code(ben_in.beneficiary_code, "Beneficiary")
    if code_clean:
        existing_code = db.query(Beneficiary).filter(Beneficiary.beneficiary_code.ilike(code_clean)).first()
        if existing_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Beneficiary ID '{code_clean}' already exists.")
    else:
        code_clean = IdService.generate_beneficiary_code(db)

    present_addr = ben_in.present_address or ben_in.address
    perm_addr = ben_in.permanent_address or ben_in.address

    ben = Beneficiary(
        name=name_clean,
        group_id=ben_in.group_id,
        beneficiary_code=code_clean,
        registration_date=ben_in.registration_date,
        is_active=ben_in.is_active if ben_in.is_active is not None else True,

        # 1. Personal Information
        father_or_husband_name=ben_in.father_or_husband_name,
        date_of_birth=ben_in.date_of_birth,
        gender=ben_in.gender,
        national_id=ben_in.national_id,
        occupation=ben_in.occupation,
        education=ben_in.education,
        marital_status=ben_in.marital_status,
        phone=ben_in.phone,
        alternative_phone=ben_in.alternative_phone,
        email=ben_in.email,
        address=present_addr,
        present_address=present_addr,
        permanent_address=perm_addr,
        reason_for_assistance=ben_in.reason_for_assistance or ben_in.financial_condition,

        # 2. Emergency Contact
        emergency_contact_name=ben_in.emergency_contact_name,
        emergency_contact_relation=ben_in.emergency_contact_relation,
        emergency_contact_phone=ben_in.emergency_contact_phone,

        # 3. Documents
        photo_url=ben_in.photo_url,
        signature_url=ben_in.signature_url,
        document_type=ben_in.document_type,
        document_front_url=ben_in.document_front_url,
        document_back_url=ben_in.document_back_url,

        # 4. Additional Information
        family_members_count=ben_in.family_members_count,
        family_info=ben_in.family_info,
        financial_condition=ben_in.financial_condition or ben_in.reason_for_assistance,
        notes=ben_in.notes
    )
    db.add(ben)
    db.commit()
    db.refresh(ben)

    AuditService.log(
        db=db,
        action="CREATE",
        entity_name="beneficiaries",
        entity_id=str(ben.id),
        new_values={
            "name": ben.name,
            "beneficiary_code": ben.beneficiary_code,
            "group_id": str(ben.group_id),
            "group_name": group.name
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    out = BeneficiaryOut.model_validate(ben)
    out.group_name = group.name
    return out

@router.patch("/{beneficiary_id}", response_model=BeneficiaryOut)
def update_beneficiary(
    request: Request,
    beneficiary_id: str,
    ben_in: BeneficiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.edit"))
):
    ben = resolve_beneficiary(db, beneficiary_id)

    old_data = {
        "name": ben.name,
        "beneficiary_code": ben.beneficiary_code,
        "group_id": str(ben.group_id),
        "is_active": ben.is_active
    }

    if ben_in.name is not None:
        name_clean = ben_in.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Beneficiary Name cannot be empty.")
        ben.name = name_clean

    if ben_in.group_id is not None and ben_in.group_id != ben.group_id:
        group = db.query(Group).filter(Group.id == ben_in.group_id).first()
        if not group:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target group does not exist.")
        ben.group_id = ben_in.group_id

    if ben_in.beneficiary_code is not None:
        code_clean = IdService.validate_and_sanitize_code(ben_in.beneficiary_code, "Beneficiary")
        if code_clean and code_clean != ben.beneficiary_code:
            existing = db.query(Beneficiary).filter(Beneficiary.beneficiary_code.ilike(code_clean), Beneficiary.id != ben.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Beneficiary ID '{code_clean}' already exists.")
            ben.beneficiary_code = code_clean

    # Update optional fields if provided
    for field in [
        "registration_date", "is_active", "father_or_husband_name", "date_of_birth", "gender",
        "national_id", "occupation", "education", "marital_status", "phone", "alternative_phone",
        "email", "address", "present_address", "permanent_address", "reason_for_assistance",
        "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone",
        "photo_url", "signature_url", "document_type", "document_front_url", "document_back_url",
        "family_members_count", "family_info", "financial_condition", "notes"
    ]:
        val = getattr(ben_in, field, None)
        if val is not None:
            setattr(ben, field, val)

    ben.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ben)

    AuditService.log(
        db=db,
        action="UPDATE",
        entity_name="beneficiaries",
        entity_id=str(ben.id),
        old_values=old_data,
        new_values={
            "name": ben.name,
            "beneficiary_code": ben.beneficiary_code,
            "group_id": str(ben.group_id),
            "is_active": ben.is_active
        },
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    out = BeneficiaryOut.model_validate(ben)
    out.group_name = ben.group.name if ben.group else ""
    return out

@router.delete("/{beneficiary_id}")
def delete_beneficiary(
    request: Request,
    beneficiary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("beneficiaries.delete"))
):
    ben = resolve_beneficiary(db, beneficiary_id)

    # 1. Invariants check: Assistance records (Qard Hasan / Sadaqah)
    asst_count = db.query(func.count(Assistance.id)).filter(Assistance.beneficiary_id == ben.id).scalar() or 0
    if asst_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot permanently delete beneficiary '{ben.name}': This beneficiary has {asst_count} associated assistance record(s) (Qard Hasan / Sadaqah). Financial assistance records cannot be removed to preserve accounting history."
        )

    # 2. Clean up file documents & Cloudinary assets
    docs = db.query(FileDocument).filter(
        FileDocument.entity_type == "beneficiaries",
        FileDocument.entity_id == str(ben.id)
    ).all()
    for doc in docs:
        if doc.cloudinary_public_id:
            try:
                CloudinaryService.delete_asset(doc.cloudinary_public_id, resource_type=doc.resource_type or "image")
            except Exception:
                pass
        db.delete(doc)

    deleted_id = str(ben.id)
    deleted_name = ben.name
    deleted_code = ben.beneficiary_code

    # 3. Delete beneficiary permanently
    db.delete(ben)
    db.commit()

    # 4. Audit Trail
    AuditService.log(
        db=db,
        action="DELETE",
        entity_name="beneficiaries",
        entity_id=deleted_id,
        old_values={"name": deleted_name, "beneficiary_code": deleted_code},
        user_id=current_user.id,
        ip_address=get_client_ip(request)
    )
    db.commit()

    return {"message": f"Beneficiary '{deleted_name}' has been permanently deleted from the database."}
