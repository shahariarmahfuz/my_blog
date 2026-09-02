from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.member import Member
from app.models.beneficiary import Beneficiary
from app.models.group import Group
from app.models.contribution import Contribution, MonthlyContributionDue, MonthlyContributionAllocation
from app.models.donation import Donation
from app.models.assistance import Assistance, AssistanceFundingAllocation, InstallmentSchedule
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation
from app.models.ledger import FinancialTransaction, LedgerEntry
from app.models.member_application import MemberApplication
from app.models.file_document import FileDocument
from app.services.audit_service import AuditService
from app.services.cloudinary_service import CloudinaryService


class HardDeleteService:
    @staticmethod
    def _delete_file_documents(db: Session, entity_type: str, entity_id: UUID | str):
        """Cleans up uploaded file documents and Cloudinary assets."""
        docs = db.query(FileDocument).filter(
            FileDocument.entity_type == entity_type,
            FileDocument.entity_id == str(entity_id)
        ).all()
        for doc in docs:
            if doc.cloudinary_public_id:
                try:
                    CloudinaryService.delete_asset(doc.cloudinary_public_id, resource_type=doc.resource_type or "image")
                except Exception:
                    pass
            db.delete(doc)

    @staticmethod
    def _cascade_delete_member_dependencies(db: Session, member: Member):
        """Removes all operational and financial records belonging to a member."""
        # 1. Fetch all contributions for this member
        contribs = db.query(Contribution).filter(Contribution.member_id == member.id).all()
        for c in contribs:
            # Delete corresponding financial transactions and ledger entries
            txns = db.query(FinancialTransaction).filter(
                or_(
                    (FinancialTransaction.source_entity_type.in_(["contributions", "contributions_reversal"])) & (FinancialTransaction.source_entity_id == c.id),
                    FinancialTransaction.transaction_code.ilike(f"TXN-{c.receipt_number}%"),
                    FinancialTransaction.transaction_code.ilike(f"TXN-REV-{c.receipt_number}%")
                )
            ).all()
            for txn in txns:
                db.query(LedgerEntry).filter(LedgerEntry.transaction_id == txn.id).delete(synchronize_session=False)
                db.delete(txn)

            # Delete the contribution
            db.delete(c)

        # 2. Delete monthly dues (cascades allocations)
        dues = db.query(MonthlyContributionDue).filter(MonthlyContributionDue.member_id == member.id).all()
        for d in dues:
            db.delete(d)

        # 3. Disconnect member application if linked
        db.query(MemberApplication).filter(MemberApplication.created_member_id == member.id).update(
            {"created_member_id": None}, synchronize_session=False
        )

        # 4. Clean up file documents & Cloudinary assets
        HardDeleteService._delete_file_documents(db, "members", member.id)

    @staticmethod
    def _cascade_delete_beneficiary_dependencies(db: Session, ben: Beneficiary):
        """Removes all operational and financial records belonging to a beneficiary."""
        # 1. Fetch all assistance records
        assistances = db.query(Assistance).filter(Assistance.beneficiary_id == ben.id).all()
        for a in assistances:
            # A. Process repayments for this assistance
            repayments = db.query(QardHasanRepayment).filter(QardHasanRepayment.assistance_id == a.id).all()
            for r in repayments:
                txns = db.query(FinancialTransaction).filter(
                    or_(
                        (FinancialTransaction.source_entity_type == "qard_hasan_repayments") & (FinancialTransaction.source_entity_id == r.id),
                        FinancialTransaction.transaction_code.ilike(f"TXN-{r.repayment_code}%")
                    )
                ).all()
                for txn in txns:
                    db.query(LedgerEntry).filter(LedgerEntry.transaction_id == txn.id).delete(synchronize_session=False)
                    db.delete(txn)

                db.delete(r)

            # B. Process disbursement financial transactions
            txns = db.query(FinancialTransaction).filter(
                or_(
                    (FinancialTransaction.source_entity_type == "assistance") & (FinancialTransaction.source_entity_id == a.id),
                    FinancialTransaction.transaction_code.ilike(f"TXN-{a.assistance_code}%")
                )
            ).all()
            for txn in txns:
                db.query(LedgerEntry).filter(LedgerEntry.transaction_id == txn.id).delete(synchronize_session=False)
                db.delete(txn)

            # C. Delete assistance (cascades allocations & installments via relationship)
            db.delete(a)

        # 2. Clean up file documents & Cloudinary assets
        HardDeleteService._delete_file_documents(db, "beneficiaries", ben.id)

    @staticmethod
    def delete_member(db: Session, member: Member, user_id: Optional[UUID] = None, ip_address: Optional[str] = None) -> dict:
        """
        Permanently deletes a member and all related financial and operational records in one atomic transaction.
        """
        deleted_id = str(member.id)
        deleted_name = member.name
        deleted_code = member.member_code
        group_id_str = str(member.group_id) if member.group_id else None

        try:
            # 1. Cascade delete all member-specific records
            HardDeleteService._cascade_delete_member_dependencies(db, member)

            # 2. Delete member row
            db.delete(member)

            # 3. Log immutable audit trail
            AuditService.log(
                db=db,
                action="DELETE",
                entity_name="members",
                entity_id=deleted_id,
                old_values={
                    "name": deleted_name,
                    "member_code": deleted_code,
                    "group_id": group_id_str,
                    "action_type": "HARD_DELETE_PERMANENT"
                },
                user_id=user_id,
                ip_address=ip_address
            )

            # 4. Commit atomic transaction
            db.commit()

            return {
                "success": True,
                "message": f"Member '{deleted_name}' ({deleted_code}) and all associated records have been permanently deleted.",
                "deleted_id": deleted_id
            }
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def delete_beneficiary(db: Session, ben: Beneficiary, user_id: Optional[UUID] = None, ip_address: Optional[str] = None) -> dict:
        """
        Permanently deletes a beneficiary and all related assistance, repayment, and financial records in one atomic transaction.
        """
        deleted_id = str(ben.id)
        deleted_name = ben.name
        deleted_code = ben.beneficiary_code
        group_id_str = str(ben.group_id) if ben.group_id else None

        try:
            # 1. Cascade delete all beneficiary-specific records
            HardDeleteService._cascade_delete_beneficiary_dependencies(db, ben)

            # 2. Delete beneficiary row
            db.delete(ben)

            # 3. Log immutable audit trail
            AuditService.log(
                db=db,
                action="DELETE",
                entity_name="beneficiaries",
                entity_id=deleted_id,
                old_values={
                    "name": deleted_name,
                    "beneficiary_code": deleted_code,
                    "group_id": group_id_str,
                    "action_type": "HARD_DELETE_PERMANENT"
                },
                user_id=user_id,
                ip_address=ip_address
            )

            # 4. Commit atomic transaction
            db.commit()

            return {
                "success": True,
                "message": f"Beneficiary '{deleted_name}' ({deleted_code}) and all associated assistance records have been permanently deleted.",
                "deleted_id": deleted_id
            }
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def delete_group(db: Session, group: Group, user_id: Optional[UUID] = None, ip_address: Optional[str] = None) -> dict:
        """
        Permanently deletes a Fund Group and all associated members, beneficiaries, contributions, donations,
        assistance allocations, and ledger records in one atomic transaction.
        """
        deleted_id = str(group.id)
        deleted_name = group.name
        deleted_code = group.code

        try:
            # 1. Cascade delete assigned members
            members = db.query(Member).filter(Member.group_id == group.id).all()
            for m in members:
                HardDeleteService._cascade_delete_member_dependencies(db, m)
                db.delete(m)

            # 2. Cascade delete assigned beneficiaries
            beneficiaries = db.query(Beneficiary).filter(Beneficiary.group_id == group.id).all()
            for b in beneficiaries:
                HardDeleteService._cascade_delete_beneficiary_dependencies(db, b)
                db.delete(b)

            # 3. Cascade delete external donations for this group
            donations = db.query(Donation).filter(Donation.group_id == group.id).all()
            for d in donations:
                txns = db.query(FinancialTransaction).filter(
                    or_(
                        (FinancialTransaction.source_entity_type.in_(["donations", "donations_reversal"])) & (FinancialTransaction.source_entity_id == d.id),
                        FinancialTransaction.transaction_code.ilike(f"TXN-{d.receipt_number}%"),
                        FinancialTransaction.transaction_code.ilike(f"TXN-REV-{d.receipt_number}%")
                    )
                ).all()
                for txn in txns:
                    db.query(LedgerEntry).filter(LedgerEntry.transaction_id == txn.id).delete(synchronize_session=False)
                    db.delete(txn)
                db.delete(d)

            # 4. Clean up any remaining assistance funding allocations or repayment allocations for this group
            funding_allocs = db.query(AssistanceFundingAllocation).filter(AssistanceFundingAllocation.group_id == group.id).all()
            for fa in funding_allocs:
                db.delete(fa)

            repay_allocs = db.query(QardHasanRepaymentAllocation).filter(QardHasanRepaymentAllocation.group_id == group.id).all()
            for ra in repay_allocs:
                db.delete(ra)

            # 5. Clean up any remaining dues or contributions for this group
            dues = db.query(MonthlyContributionDue).filter(MonthlyContributionDue.group_id == group.id).all()
            for d in dues:
                db.delete(d)

            contribs = db.query(Contribution).filter(Contribution.group_id == group.id).all()
            for c in contribs:
                db.delete(c)

            # 6. Delete all ledger entries and group-specific financial transactions (e.g. opening balances)
            ledger_entries = db.query(LedgerEntry).filter(LedgerEntry.group_id == group.id).all()
            txn_ids = list({e.transaction_id for e in ledger_entries if e.transaction_id})
            db.query(LedgerEntry).filter(LedgerEntry.group_id == group.id).delete(synchronize_session=False)

            for tid in txn_ids:
                remaining_entries = db.query(LedgerEntry).filter(LedgerEntry.transaction_id == tid).count()
                if remaining_entries == 0:
                    db.query(FinancialTransaction).filter(FinancialTransaction.id == tid).delete(synchronize_session=False)

            # 7. Disconnect proposed member applications
            db.query(MemberApplication).filter(MemberApplication.proposed_group_id == group.id).update(
                {"proposed_group_id": None}, synchronize_session=False
            )

            # 8. Clean up file documents & Cloudinary assets
            HardDeleteService._delete_file_documents(db, "groups", group.id)

            # 9. Delete group row
            db.delete(group)

            # 10. Log immutable audit trail
            AuditService.log(
                db=db,
                action="DELETE",
                entity_name="groups",
                entity_id=deleted_id,
                old_values={
                    "name": deleted_name,
                    "code": deleted_code,
                    "action_type": "HARD_DELETE_PERMANENT"
                },
                user_id=user_id,
                ip_address=ip_address
            )

            # 11. Commit atomic transaction
            db.commit()

            return {
                "success": True,
                "message": f"Fund Group '{deleted_name}' ({deleted_code}) and all associated records have been permanently deleted.",
                "deleted_id": deleted_id
            }
        except Exception:
            db.rollback()
            raise
