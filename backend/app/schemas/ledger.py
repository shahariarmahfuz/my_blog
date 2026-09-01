from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.ledger import TransactionType, EntryType

class LedgerEntryOut(BaseModel):
    id: UUID
    transaction_id: UUID
    group_id: UUID
    group_name: Optional[str] = None
    entry_type: EntryType
    amount: Decimal
    balance_after: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class FinancialTransactionOut(BaseModel):
    id: UUID
    transaction_code: str
    transaction_type: TransactionType
    source_entity_type: Optional[str] = None
    source_entity_id: Optional[UUID] = None
    amount: Decimal
    transaction_date: date
    description: Optional[str] = None
    created_by: Optional[UUID] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    ledger_entries: List[LedgerEntryOut] = []
    
    model_config = ConfigDict(from_attributes=True)
