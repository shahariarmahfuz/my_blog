import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Date, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class TransactionType(str, enum.Enum):
    CONTRIBUTION = "CONTRIBUTION"
    QARD_HASAN_DISBURSEMENT = "QARD_HASAN_DISBURSEMENT"
    QARD_HASAN_REPAYMENT = "QARD_HASAN_REPAYMENT"
    SADAQAH_DISBURSEMENT = "SADAQAH_DISBURSEMENT"
    GROUP_TRANSFER = "GROUP_TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"
    OPENING_BALANCE = "OPENING_BALANCE"
    OPENING_BALANCE_ADJUSTMENT = "OPENING_BALANCE_ADJUSTMENT"

class EntryType(str, enum.Enum):
    CREDIT = "CREDIT"  # Funds added to group (e.g. contribution, repayment received)
    DEBIT = "DEBIT"    # Funds removed from group (e.g. loan disbursement, sadaqah)

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False, index=True)
    source_entity_type = Column(String(50), nullable=True) # e.g. 'contributions', 'assistance', 'qard_hasan_repayments'
    source_entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    ledger_entries = relationship("LedgerEntry", back_populates="transaction", cascade="all, delete-orphan")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("financial_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False, index=True)
    entry_type = Column(Enum(EntryType), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    balance_after = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    transaction = relationship("FinancialTransaction", back_populates="ledger_entries")
    group = relationship("Group", back_populates="ledger_entries")
