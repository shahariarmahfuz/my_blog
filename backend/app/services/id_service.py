import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.member import Member
from app.models.beneficiary import Beneficiary
from app.models.group import Group

class IdService:
    @staticmethod
    def validate_and_sanitize_code(code: Optional[str], entity_type: str) -> Optional[str]:
        """
        Sanitize and validate a human-facing business code/ID.
        Allows alphanumeric characters, hyphens, underscores, dots, and slashes (e.g. M-0008, MEM-2026-008, GRP-01).
        """
        if code is None:
            return None
        clean_code = code.strip()
        if not clean_code:
            return None
            
        if len(clean_code) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{entity_type} ID/Code cannot exceed 50 characters."
            )
            
        # Ensure valid format (no control characters, weird whitespace, or SQL-breaking sequences)
        if not re.match(r"^[A-Za-z0-9\-_./]+$", clean_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid characters in {entity_type} ID/Code '{clean_code}'. Only letters, numbers, hyphens, dots, and underscores are allowed."
            )
            
        return clean_code

    @staticmethod
    def generate_member_code(db: Session) -> str:
        """
        Generate next available Member ID (e.g. M-0001, M-0002, M-0008, ...).
        Uses a monotonic candidate loop ensuring absolute uniqueness and collision safety.
        """
        total = db.query(func.count(Member.id)).scalar() or 0
        candidate_num = max(1, total + 1)
        candidate_code = f"M-{candidate_num:04d}"
        
        while db.query(Member).filter(Member.member_code == candidate_code).first():
            candidate_num += 1
            candidate_code = f"M-{candidate_num:04d}"
            
        return candidate_code

    @staticmethod
    def generate_beneficiary_code(db: Session) -> str:
        """
        Generate next available Beneficiary ID (e.g. BEN-0001, BEN-0002, ...).
        Also checks B-XXXX format to prevent collisions.
        """
        total = db.query(func.count(Beneficiary.id)).scalar() or 0
        candidate_num = max(1, total + 1)
        candidate_code = f"BEN-{candidate_num:04d}"
        
        while (
            db.query(Beneficiary).filter(
                (Beneficiary.beneficiary_code == candidate_code) |
                (Beneficiary.beneficiary_code == f"B-{candidate_num:04d}")
            ).first()
        ):
            candidate_num += 1
            candidate_code = f"BEN-{candidate_num:04d}"
            
        return candidate_code

    @staticmethod
    def generate_group_code(db: Session) -> str:
        """
        Generate next available Group Code (e.g. GRP-001, GRP-002, ...).
        """
        total = db.query(func.count(Group.id)).scalar() or 0
        candidate_num = max(1, total + 1)
        candidate_code = f"GRP-{candidate_num:03d}"
        
        while db.query(Group).filter(Group.code == candidate_code).first():
            candidate_num += 1
            candidate_code = f"GRP-{candidate_num:03d}"
            
        return candidate_code
