from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.ledger import FinancialTransactionOut
from app.schemas.assistance import AssistanceOut, InstallmentScheduleOut

class GroupBalanceSummary(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    balance: Decimal
    total_contributions: Decimal
    total_disbursed: Decimal
    total_repayments: Decimal

class OverdueInstallmentSummary(BaseModel):
    id: UUID
    assistance_id: UUID
    assistance_code: str
    beneficiary_name: str
    installment_number: int
    due_date: date
    amount: Decimal
    paid_amount: Decimal
    outstanding: Decimal
    days_overdue: int

class DashboardMetrics(BaseModel):
    total_groups: int
    total_members: int
    total_beneficiaries: int
    
    total_contributions: Decimal
    total_qard_hasan_disbursed: Decimal
    total_qard_hasan_repaid: Decimal
    outstanding_qard_hasan: Decimal
    total_sadaqah_disbursed: Decimal
    total_available_funds: Decimal
    pending_member_applications: int = 0
    
    group_balances: List[GroupBalanceSummary] = []
    recent_transactions: List[FinancialTransactionOut] = []
    recent_assistance: List[AssistanceOut] = []
    overdue_installments: List[OverdueInstallmentSummary] = []
