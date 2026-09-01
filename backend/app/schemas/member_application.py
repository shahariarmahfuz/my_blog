from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

# ==========================================
# Public Schemas
# ==========================================

class PublicMemberApplicationCreate(BaseModel):
    # Only Name and Group are required
    applicant_name: str = Field(..., min_length=1, max_length=255, description="Full Legal Name (Required)")
    proposed_group_id: UUID = Field(..., description="Fund Group to Join (Required)")
    
    # 1. Personal Information (Optional)
    father_name: Optional[str] = Field(None, max_length=255)
    mother_name: Optional[str] = Field(None, max_length=255)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    national_id: Optional[str] = Field(None, max_length=100)
    occupation: Optional[str] = Field(None, max_length=150)
    education: Optional[str] = Field(None, max_length=255)
    blood_group: Optional[str] = Field(None, max_length=50)
    marital_status: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    alternative_phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    monthly_pledge: Optional[Decimal] = Decimal("0.00")

    # 2. Emergency Contact (Optional)
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_relation: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)

    # 3. Reference (Optional)
    reference_name: Optional[str] = Field(None, max_length=255)
    reference_relation: Optional[str] = Field(None, max_length=100)
    reference_phone: Optional[str] = Field(None, max_length=50)

    # 4. Commitment (Optional)
    commitment_accepted: Optional[bool] = False

    # 5. Documents (Optional)
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_url: Optional[str] = None
    document_back_url: Optional[str] = None

    # 6. Additional Information (Optional)
    reason_for_joining: Optional[str] = None
    notes: Optional[str] = None

class PublicApplicationSubmissionOut(BaseModel):
    application_code: str
    applicant_name: str
    proposed_group_name: str
    status: str
    submitted_at: datetime
    message: str

class PublicStatusCheckRequest(BaseModel):
    application_code: str = Field(..., min_length=4, max_length=50, description="Application Code (e.g. MA-8F4K2P7X)")
    verification_contact: Optional[str] = Field(None, description="Optional Phone or Email for verification")

class PublicApplicationStatusOut(BaseModel):
    application_code: str
    status: str
    submitted_at: datetime
    last_updated_at: datetime
    applicant_name: str
    proposed_group_name: str
    status_message: str
    change_request_message: Optional[str] = None
    rejection_reason: Optional[str] = None
    can_resubmit: bool = False
    details: Optional[Dict[str, Any]] = None

class PublicApplicationResubmitRequest(BaseModel):
    verification_contact: Optional[str] = None
    applicant_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    reference_name: Optional[str] = None
    reference_relation: Optional[str] = None
    reference_phone: Optional[str] = None
    commitment_accepted: Optional[bool] = None
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_url: Optional[str] = None
    document_back_url: Optional[str] = None
    reason_for_joining: Optional[str] = None
    notes: Optional[str] = None

# ==========================================
# Admin Schemas
# ==========================================

class MemberApplicationStatusHistoryOut(BaseModel):
    id: UUID
    previous_status: Optional[str] = None
    new_status: str
    action: str
    actor_type: str
    changed_by_name: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MemberApplicationOut(BaseModel):
    id: UUID
    application_code: str
    applicant_name: str
    proposed_group_id: Optional[UUID] = None
    proposed_group_name: Optional[str] = None

    # 1. Personal Info
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    monthly_pledge: Optional[Decimal] = Decimal("0.00")

    # 2. Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    # 3. Reference
    reference_name: Optional[str] = None
    reference_relation: Optional[str] = None
    reference_phone: Optional[str] = None

    # 4. Commitment
    commitment_accepted: Optional[bool] = False

    # 5. Documents
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    document_type: Optional[str] = None
    document_url: Optional[str] = None
    document_back_url: Optional[str] = None

    # 6. Additional Info
    reason_for_joining: Optional[str] = None
    notes: Optional[str] = None

    application_date: date
    status: str
    change_request_message: Optional[str] = None
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    accepted_by: Optional[UUID] = None
    acceptor_name: Optional[str] = None
    accepted_at: Optional[datetime] = None
    created_member_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MemberApplicationDetailOut(MemberApplicationOut):
    status_history: List[MemberApplicationStatusHistoryOut] = []

class MemberApplicationSummaryCountsOut(BaseModel):
    total_count: int
    pending_count: int
    under_review_count: int
    changes_required_count: int
    accepted_count: int
    rejected_count: int
    cancelled_count: int

class AdminReviewActionRequest(BaseModel):
    admin_notes: Optional[str] = None

class AdminRequestChangesRequest(BaseModel):
    change_request_message: str = Field(..., min_length=1, description="Message to applicant explaining required corrections")
    admin_notes: Optional[str] = None

class AdminRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=1, description="Reason for rejection (safe for applicant)")
    admin_notes: Optional[str] = None

class AdminAcceptRequest(BaseModel):
    assigned_group_id: Optional[UUID] = Field(None, description="Override assigned group if permitted")
    member_code: Optional[str] = Field(None, description="Optional custom Member ID assigned by admin")
    admin_notes: Optional[str] = None
