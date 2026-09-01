import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.assistance import Assistance, AssistanceType, AssistanceStatus, InstallmentSchedule, InstallmentStatus
from app.models.repayment import QardHasanRepayment, QardHasanRepaymentAllocation, PaymentMethod
from app.services.ledger_service import LedgerService

class RepaymentService:
    @staticmethod
    def calculate_proportional_allocations(
        assistance: Assistance,
        repayment_amount: Decimal
    ) -> List[Dict[str, Any]]:
        """
        Calculates exact proportional distribution of repayment across original funding groups.
        Guarantees that:
        1. sum(allocations) == repayment_amount
        2. allocation_i <= remaining_receivable_i for every group
        3. distribution follows original funding weights w_i
        """
        if assistance.assistance_type != AssistanceType.QARD_HASAN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Repayments are only applicable to Qard Hasan assistance."
            )
            
        funding_allocs = assistance.funding_allocations
        if not funding_allocs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assistance has no funding allocations."
            )

        total_funded = Decimal(str(sum(alloc.allocated_amount for alloc in funding_allocs)))
        total_already_repaid = Decimal(str(sum(Decimal(str(alloc.repaid_amount or 0)) for alloc in funding_allocs)))
        outstanding_total = total_funded - total_already_repaid
        repayment_amount = Decimal(str(repayment_amount))

        if repayment_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Repayment amount must be strictly greater than 0."
            )

        if repayment_amount > outstanding_total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Repayment amount ({repayment_amount}) exceeds total outstanding principal ({outstanding_total})."
            )

        allocations_result = []
        allocated_sum = Decimal("0.00")

        # Step 1: Preliminary proportional calculation
        num_allocs = len(funding_allocs)
        for i, alloc in enumerate(funding_allocs):
            alloc_amt = Decimal(str(alloc.allocated_amount))
            alloc_repaid = Decimal(str(alloc.repaid_amount or 0))
            remaining_for_group = alloc_amt - alloc_repaid
            
            if i < num_allocs - 1:
                # Proportional calculation rounded to 2 decimal places
                share = (repayment_amount * (alloc_amt / total_funded)).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                share = min(share, remaining_for_group)
                allocated_sum += share
            else:
                # Last allocation gets the exact mathematical remainder to prevent rounding penny drift
                share = repayment_amount - allocated_sum
                # In rare case where remainder exceeds remaining_for_group due to prior capping
                if share > remaining_for_group:
                    share = remaining_for_group
                allocated_sum += share
                
            allocations_result.append({
                "funding_allocation_id": alloc.id,
                "group_id": alloc.group_id,
                "group_name": alloc.group.name if alloc.group else "",
                "allocated_amount": share,
                "proportion_ratio": Decimal(str(alloc.proportion_ratio)),
                "remaining_before": remaining_for_group,
                "remaining_after": remaining_for_group - share
            })

        # Step 2: Final reconciliation if rounding caused any residual discrepancy
        diff = repayment_amount - sum(item["allocated_amount"] for item in allocations_result)
        if diff != Decimal("0.00"):
            for item in allocations_result:
                room = item["remaining_after"]
                if diff > Decimal("0.00") and room >= diff:
                    item["allocated_amount"] += diff
                    item["remaining_after"] -= diff
                    diff = Decimal("0.00")
                    break
                elif diff < Decimal("0.00") and item["allocated_amount"] >= abs(diff):
                    item["allocated_amount"] += diff
                    item["remaining_after"] -= diff
                    diff = Decimal("0.00")
                    break

        return allocations_result

    @staticmethod
    def process_repayment(
        db: Session,
        assistance_id: uuid.UUID,
        amount: Decimal,
        payment_date: date,
        payment_method: PaymentMethod,
        reference_number: Optional[str] = None,
        notes: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None
    ) -> QardHasanRepayment:
        """
        Executes a Qard Hasan repayment within an atomic transaction:
        1. Validates assistance and calculates proportional allocations.
        2. Updates funding allocations' repaid_amount.
        3. Updates installment schedules.
        4. Creates repayment and repayment allocation records.
        5. Creates financial ledger transaction and credit entries.
        6. Updates assistance status to COMPLETED if fully repaid.
        """
        # Lock assistance record
        assistance = db.query(Assistance).filter(Assistance.id == assistance_id).with_for_update().first()
        if not assistance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistance record not found."
            )

        amount = Decimal(str(amount))
        calc_results = RepaymentService.calculate_proportional_allocations(assistance, amount)
        
        # Generate repayment code
        count = db.query(QardHasanRepayment).count() + 1
        year = payment_date.year
        repayment_code = f"REP-{year}-{count:04d}"

        # Create QardHasanRepayment
        repayment = QardHasanRepayment(
            repayment_code=repayment_code,
            assistance_id=assistance.id,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes,
            received_by=user_id
        )
        db.add(repayment)
        db.flush()

        repayment_allocations = []
        for item in calc_results:
            rep_alloc = QardHasanRepaymentAllocation(
                repayment_id=repayment.id,
                group_id=item["group_id"],
                funding_allocation_id=item["funding_allocation_id"],
                allocated_amount=item["allocated_amount"]
            )
            db.add(rep_alloc)
            repayment_allocations.append(rep_alloc)
            
            # Update assistance_funding_allocation repaid_amount
            funding_alloc = next(fa for fa in assistance.funding_allocations if fa.id == item["funding_allocation_id"])
            current_repaid = Decimal(str(funding_alloc.repaid_amount or 0))
            funding_alloc.repaid_amount = current_repaid + item["allocated_amount"]

        # Update installment schedules progressively
        remaining_to_apply = amount
        installments = sorted(assistance.installments, key=lambda inst: inst.installment_number)
        
        for inst in installments:
            if remaining_to_apply <= Decimal("0.00"):
                break
            
            inst_amount = Decimal(str(inst.amount))
            inst_paid = Decimal(str(inst.paid_amount or 0))
            unpaid_inst_amount = inst_amount - inst_paid
            if unpaid_inst_amount > Decimal("0.00"):
                payment_for_this_inst = min(remaining_to_apply, unpaid_inst_amount)
                inst.paid_amount = inst_paid + payment_for_this_inst
                remaining_to_apply -= payment_for_this_inst
                
                if inst.paid_amount >= inst_amount:
                    inst.status = InstallmentStatus.PAID
                    inst.paid_at = datetime.now(timezone.utc)
                else:
                    inst.status = InstallmentStatus.PARTIALLY_PAID

        # Check if assistance is now fully repaid
        total_funded = sum(Decimal(str(fa.allocated_amount)) for fa in assistance.funding_allocations)
        total_repaid = sum(Decimal(str(fa.repaid_amount or 0)) for fa in assistance.funding_allocations)
        if total_repaid >= total_funded:
            assistance.status = AssistanceStatus.COMPLETED

        # Write to financial ledger
        LedgerService.record_repayment_ledger(db, repayment, repayment_allocations, user_id=user_id)
        
        return repayment
