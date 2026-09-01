from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.models.ledger import FinancialTransaction, LedgerEntry, TransactionType, EntryType
from app.models.contribution import Contribution
from app.models.assistance import Assistance, AssistanceType
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation

class LedgerService:
    @staticmethod
    def get_group_balance(db: Session, group_id: UUID) -> Decimal:
        """
        Calculates group balance strictly from the immutable ledger entries:
        Group Balance = Sum(CREDIT entries) - Sum(DEBIT entries)
        """
        result = db.query(
            func.coalesce(
                func.sum(
                    case(
                        (LedgerEntry.entry_type == EntryType.CREDIT, LedgerEntry.amount),
                        (LedgerEntry.entry_type == EntryType.DEBIT, -LedgerEntry.amount),
                        else_=Decimal("0.00")
                    )
                ),
                Decimal("0.00")
            )
        ).filter(LedgerEntry.group_id == group_id).scalar()
        
        return Decimal(str(result or 0.00))

    @staticmethod
    def get_all_group_balances(db: Session) -> Dict[UUID, Decimal]:
        """
        Returns a mapping of {group_id: current_balance} for all groups from the ledger.
        """
        results = db.query(
            LedgerEntry.group_id,
            func.coalesce(
                func.sum(
                    case(
                        (LedgerEntry.entry_type == EntryType.CREDIT, LedgerEntry.amount),
                        (LedgerEntry.entry_type == EntryType.DEBIT, -LedgerEntry.amount),
                        else_=Decimal("0.00")
                    )
                ),
                Decimal("0.00")
            ).label("balance")
        ).group_by(LedgerEntry.group_id).all()
        
        return {row.group_id: Decimal(str(row.balance)) for row in results}

    @staticmethod
    def _get_unique_transaction_code(db: Session, base_code: str) -> str:
        """Ensures the transaction code does not collide with existing records."""
        code = base_code
        exists = db.query(FinancialTransaction.id).filter(FinancialTransaction.transaction_code == code).first()
        if not exists:
            return code
        for i in range(1, 100):
            candidate = f"{base_code}-{i:02d}"
            if not db.query(FinancialTransaction.id).filter(FinancialTransaction.transaction_code == candidate).first():
                return candidate
        import uuid
        return f"{base_code}-{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def record_contribution_ledger(db: Session, contribution: Contribution, user_id: Optional[UUID] = None) -> FinancialTransaction:
        """
        Records a contribution in the financial transaction ledger and creates a CREDIT entry for the group.
        """
        txn_code = LedgerService._get_unique_transaction_code(db, f"TXN-{contribution.receipt_number}")
        # Create Financial Transaction
        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=TransactionType.CONTRIBUTION,
            source_entity_type="contributions",
            source_entity_id=contribution.id,
            amount=contribution.amount,
            transaction_date=contribution.contribution_date,
            description=f"Member Contribution {contribution.receipt_number}",
            created_by=user_id
        )
        db.add(txn)
        db.flush() # get txn.id
        
        # Calculate new group balance after credit
        current_bal = LedgerService.get_group_balance(db, contribution.group_id)
        new_bal = current_bal + contribution.amount
        
        # Create Ledger Entry
        entry = LedgerEntry(
            transaction_id=txn.id,
            group_id=contribution.group_id,
            entry_type=EntryType.CREDIT,
            amount=contribution.amount,
            balance_after=new_bal,
            notes=f"Contribution received from member. Ref: {contribution.reference_number or 'N/A'}"
        )
        db.add(entry)
        return txn

    @staticmethod
    def record_contribution_reversal_ledger(db: Session, contribution: Contribution, reason: str, user_id: Optional[UUID] = None) -> FinancialTransaction:
        """
        Creates a reversing DEBIT ledger entry for a voided contribution, reducing the group's balance.
        """
        txn_code = LedgerService._get_unique_transaction_code(db, f"TXN-REV-{contribution.receipt_number}")
        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=TransactionType.ADJUSTMENT,
            source_entity_type="contributions_reversal",
            source_entity_id=contribution.id,
            amount=contribution.amount,
            transaction_date=date.today(),
            description=f"Reversal / Void for Contribution {contribution.receipt_number}. Reason: {reason}",
            created_by=user_id
        )
        db.add(txn)
        db.flush()

        current_bal = LedgerService.get_group_balance(db, contribution.group_id)
        new_bal = current_bal - contribution.amount

        entry = LedgerEntry(
            transaction_id=txn.id,
            group_id=contribution.group_id,
            entry_type=EntryType.DEBIT,
            amount=contribution.amount,
            balance_after=new_bal,
            notes=f"Void/Reversal for {contribution.receipt_number}: {reason}"
        )
        db.add(entry)
        return txn

    @staticmethod
    def record_assistance_disbursement_ledger(db: Session, assistance: Assistance, user_id: Optional[UUID] = None) -> FinancialTransaction:
        """
        Records an assistance disbursement (Qard Hasan or Sadaqah) in the financial ledger
        and creates DEBIT entries for each funding group based on its allocation.
        """
        txn_type = (
            TransactionType.QARD_HASAN_DISBURSEMENT
            if assistance.assistance_type == AssistanceType.QARD_HASAN
            else TransactionType.SADAQAH_DISBURSEMENT
        )
        
        txn_code = LedgerService._get_unique_transaction_code(db, f"TXN-{assistance.assistance_code}")
        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=txn_type,
            source_entity_type="assistance",
            source_entity_id=assistance.id,
            amount=assistance.total_amount,
            transaction_date=assistance.disbursement_date,
            description=f"{assistance.assistance_type.value} Disbursement: {assistance.assistance_code}",
            created_by=user_id
        )
        db.add(txn)
        db.flush()
        
        # For each funding allocation, add a DEBIT entry to that group
        for alloc in assistance.funding_allocations:
            current_bal = LedgerService.get_group_balance(db, alloc.group_id)
            new_bal = current_bal - alloc.allocated_amount
            
            entry = LedgerEntry(
                transaction_id=txn.id,
                group_id=alloc.group_id,
                entry_type=EntryType.DEBIT,
                amount=alloc.allocated_amount,
                balance_after=new_bal,
                notes=f"Funding allocation ({float(alloc.proportion_ratio)*100:.1f}%) for assistance {assistance.assistance_code}"
            )
            db.add(entry)
        
        return txn

    @staticmethod
    def record_repayment_ledger(
        db: Session,
        repayment: QardHasanRepayment,
        allocations: List[QardHasanRepaymentAllocation],
        user_id: Optional[UUID] = None
    ) -> FinancialTransaction:
        """
        Records a Qard Hasan repayment in the financial ledger and creates CREDIT entries
        for each original funding group according to its proportional repayment allocation.
        """
        txn_code = LedgerService._get_unique_transaction_code(db, f"TXN-{repayment.repayment_code}")
        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=TransactionType.QARD_HASAN_REPAYMENT,
            source_entity_type="qard_hasan_repayments",
            source_entity_id=repayment.id,
            amount=repayment.amount,
            transaction_date=repayment.payment_date,
            description=f"Qard Hasan Repayment {repayment.repayment_code} for assistance {repayment.assistance.assistance_code if repayment.assistance else ''}",
            created_by=user_id
        )
        db.add(txn)
        db.flush()
        
        for alloc in allocations:
            current_bal = LedgerService.get_group_balance(db, alloc.group_id)
            new_bal = current_bal + alloc.allocated_amount
            
            entry = LedgerEntry(
                transaction_id=txn.id,
                group_id=alloc.group_id,
                entry_type=EntryType.CREDIT,
                amount=alloc.allocated_amount,
                balance_after=new_bal,
                notes=f"Proportional Qard Hasan repayment allocation for repayment {repayment.repayment_code}"
            )
            db.add(entry)
            
        return txn

    @staticmethod
    def get_group_opening_balance(db: Session, group_id: UUID) -> Decimal:
        """
        Calculates the net opening balance recorded for a group:
        Sum(CREDIT of OPENING_BALANCE / OPENING_BALANCE_ADJUSTMENT) - Sum(DEBIT of OPENING_BALANCE_ADJUSTMENT)
        """
        result = db.query(
            func.coalesce(
                func.sum(
                    case(
                        (LedgerEntry.entry_type == EntryType.CREDIT, LedgerEntry.amount),
                        (LedgerEntry.entry_type == EntryType.DEBIT, -LedgerEntry.amount),
                        else_=Decimal("0.00")
                    )
                ),
                Decimal("0.00")
            )
        ).join(FinancialTransaction, FinancialTransaction.id == LedgerEntry.transaction_id)\
        .filter(
            LedgerEntry.group_id == group_id,
            FinancialTransaction.transaction_type.in_([
                TransactionType.OPENING_BALANCE,
                TransactionType.OPENING_BALANCE_ADJUSTMENT
            ])
        ).scalar()
        
        return Decimal(str(result or 0.00))

    @staticmethod
    def get_all_group_opening_balances(db: Session) -> Dict[UUID, Decimal]:
        """
        Returns a mapping of {group_id: opening_balance} for all groups from the ledger.
        """
        results = db.query(
            LedgerEntry.group_id,
            func.coalesce(
                func.sum(
                    case(
                        (LedgerEntry.entry_type == EntryType.CREDIT, LedgerEntry.amount),
                        (LedgerEntry.entry_type == EntryType.DEBIT, -LedgerEntry.amount),
                        else_=Decimal("0.00")
                    )
                ),
                Decimal("0.00")
            ).label("opening_balance")
        ).join(FinancialTransaction, FinancialTransaction.id == LedgerEntry.transaction_id)\
        .filter(
            FinancialTransaction.transaction_type.in_([
                TransactionType.OPENING_BALANCE,
                TransactionType.OPENING_BALANCE_ADJUSTMENT
            ])
        ).group_by(LedgerEntry.group_id).all()
        
        return {row.group_id: Decimal(str(row.opening_balance)) for row in results}

    @staticmethod
    def record_opening_balance_ledger(
        db: Session,
        group_id: UUID,
        amount: Decimal,
        group_name: str = "",
        group_code: Optional[str] = None,
        opening_date: Optional[date] = None,
        notes: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> FinancialTransaction:
        """
        Records an initial opening/previous balance transaction and credit ledger entry for a fund group.
        """
        from uuid import uuid4
        if amount <= Decimal("0.00"):
            raise ValueError("Opening balance amount must be greater than zero.")

        # Check if an OPENING_BALANCE transaction already exists for this group
        existing_opb = db.query(FinancialTransaction).join(LedgerEntry, LedgerEntry.transaction_id == FinancialTransaction.id)\
            .filter(
                LedgerEntry.group_id == group_id,
                FinancialTransaction.transaction_type == TransactionType.OPENING_BALANCE
            ).first()
        if existing_opb:
            raise ValueError("An opening balance transaction has already been recorded for this group. Use opening balance adjustment instead.")

        clean_code_part = (group_code or str(group_id)[:8]).replace("-", "").upper()
        unique_suffix = uuid4().hex[:6].upper()
        txn_code = f"TXN-OPB-{clean_code_part}-{unique_suffix}"

        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=TransactionType.OPENING_BALANCE,
            source_entity_type="groups_opening_balance",
            source_entity_id=group_id,
            amount=amount,
            transaction_date=opening_date or date.today(),
            description=notes or f"Opening / Previous Balance Carried Forward for {group_name or 'Group'}",
            created_by=user_id
        )
        db.add(txn)
        db.flush()

        current_bal = LedgerService.get_group_balance(db, group_id)
        new_bal = current_bal + amount

        entry = LedgerEntry(
            transaction_id=txn.id,
            group_id=group_id,
            entry_type=EntryType.CREDIT,
            amount=amount,
            balance_after=new_bal,
            notes=notes or f"Opening balance carried forward before using system: ৳{amount:,.2f}"
        )
        db.add(entry)
        return txn

    @staticmethod
    def record_opening_balance_adjustment_ledger(
        db: Session,
        group_id: UUID,
        new_opening_balance: Decimal,
        reason: str,
        group_name: str = "",
        group_code: Optional[str] = None,
        effective_date: Optional[date] = None,
        user_id: Optional[UUID] = None
    ) -> FinancialTransaction:
        """
        Records a controlled and audited adjustment to a group's opening balance.
        Calculates diff = new_opening_balance - current_recorded_opening_balance.
        - If diff > 0: creates a CREDIT ledger entry of diff.
        - If diff < 0: creates a DEBIT ledger entry of abs(diff).
        """
        from uuid import uuid4
        current_opb = LedgerService.get_group_opening_balance(db, group_id)
        diff = new_opening_balance - current_opb

        if diff == Decimal("0.00"):
            raise ValueError("New opening balance is identical to the current opening balance.")

        current_group_bal = LedgerService.get_group_balance(db, group_id)
        if diff < Decimal("0.00") and (current_group_bal + diff) < Decimal("0.00"):
            raise ValueError(f"Reducing opening balance by ৳{abs(diff):,.2f} would result in a negative group balance (current balance is ৳{current_group_bal:,.2f}).")

        clean_code_part = (group_code or str(group_id)[:8]).replace("-", "").upper()
        unique_suffix = uuid4().hex[:6].upper()
        txn_code = f"TXN-OPBADJ-{clean_code_part}-{unique_suffix}"

        entry_type = EntryType.CREDIT if diff > 0 else EntryType.DEBIT
        adj_amount = abs(diff)

        txn = FinancialTransaction(
            transaction_code=txn_code,
            transaction_type=TransactionType.OPENING_BALANCE_ADJUSTMENT,
            source_entity_type="groups_opening_balance_adjustment",
            source_entity_id=group_id,
            amount=adj_amount,
            transaction_date=effective_date or date.today(),
            description=f"Opening Balance Adjustment for {group_name or 'Group'} ({'+' if diff > 0 else '-'}৳{adj_amount:,.2f}). Reason: {reason}",
            created_by=user_id
        )
        db.add(txn)
        db.flush()

        new_bal = current_group_bal + diff

        entry = LedgerEntry(
            transaction_id=txn.id,
            group_id=group_id,
            entry_type=entry_type,
            amount=adj_amount,
            balance_after=new_bal,
            notes=f"Opening balance adjusted from ৳{current_opb:,.2f} to ৳{new_opening_balance:,.2f}. Reason: {reason}"
        )
        db.add(entry)
        return txn
