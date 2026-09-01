from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class PublicFoundationInfoOut(BaseModel):
    name: str = "Al-Khair Foundation"
    tagline: str = "Empowering Communities through Interest-Free Islamic Financial Stewardship"
    mission: str = "To provide dignified, zero-interest financial assistance and targeted humanitarian grants through transparent, community-funded group circles."
    vision: str = "A society free from exploitative debt, where every individual has access to benevolent capital and mutual solidarity."
    email: str = "contact@alkhairfoundation.org"
    phone: str = "+880 1700-112233"
    address: str = "Level 4, Al-Khair Tower, Dhanmondi 27, Dhaka-1209, Bangladesh"
    operating_since: int = 2021
    core_values: List[str] = [
        "Zero-Interest (Qard Hasan) Microfinance",
        "100% Non-Recoverable Benevolent Sadaqah",
        "Transparent Multi-Group Solidarity Accounting",
        "Dignity & Self-Reliance for Beneficiaries"
    ]

class PublicImpactMetricsOut(BaseModel):
    total_beneficiaries_served: int
    total_assistance_disbursed: Decimal
    total_qard_hasan_disbursed: Decimal
    total_qard_hasan_recovered: Decimal
    total_sadaqah_disbursed: Decimal
    active_groups_count: int
    active_members_count: int
    repayment_recovery_rate: float
    total_stories_published: int

class PublicStoryListItemOut(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str
    category: str
    assistance_type: str
    location: str
    impact_highlight: Optional[str] = None
    cover_image: Optional[str] = None
    read_time_minutes: int
    published_date: date

    model_config = ConfigDict(from_attributes=True)

class PublicStoryDetailOut(PublicStoryListItemOut):
    content: str
    created_at: datetime
    updated_at: datetime

class PublicAssistanceInquiryCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, description="Full Name (Required)")
    phone: str = Field(..., min_length=6, max_length=50, description="Phone Number (Required)")
    email: Optional[str] = Field(None, max_length=255, description="Email Address (Optional)")
    district_or_city: str = Field(..., min_length=2, max_length=150, description="District or City (Required)")
    assistance_type_needed: str = Field("QARD_HASAN", description="QARD_HASAN, SADAQAH, or OTHER")
    description: str = Field(..., min_length=10, description="Describe your situation and assistance needed (Required)")

class PublicAssistanceInquiryOut(BaseModel):
    inquiry_code: str
    full_name: str
    status: str
    message: str

class PublicContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    subject: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=5)

class PublicContactOut(BaseModel):
    message: str
    received_at: datetime
