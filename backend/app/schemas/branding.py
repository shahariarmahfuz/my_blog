from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class BrandingAssetInfo(BaseModel):
    url: Optional[str] = ""
    public_id: Optional[str] = ""
    filename: Optional[str] = ""
    filesize: Optional[int] = 0

class BrandingTextUpdateIn(BaseModel):
    foundation_name: Optional[str] = Field(None, min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=255)

class BrandingSettingsOut(BaseModel):
    foundation_name: str = "Al-Khair Foundation"
    tagline: str = "Empowering Communities through Islamic Microfinance & Sadaqah"
    logo: BrandingAssetInfo = Field(default_factory=BrandingAssetInfo)
    favicon: BrandingAssetInfo = Field(default_factory=BrandingAssetInfo)
    apple_touch_icon: BrandingAssetInfo = Field(default_factory=BrandingAssetInfo)
    login_logo: BrandingAssetInfo = Field(default_factory=BrandingAssetInfo)
    public_logo: BrandingAssetInfo = Field(default_factory=BrandingAssetInfo)
    logo_url: Optional[str] = ""
    favicon_url: Optional[str] = ""
    apple_touch_icon_url: Optional[str] = ""
    login_logo_url: Optional[str] = ""
    public_logo_url: Optional[str] = ""
    updated_at: Optional[str] = None

class PublicBrandingOut(BaseModel):
    foundation_name: str = "Al-Khair Foundation"
    tagline: str = "Empowering Communities through Islamic Microfinance & Sadaqah"
    logo_url: Optional[str] = ""
    favicon_url: Optional[str] = ""
    apple_touch_icon_url: Optional[str] = ""
    login_logo_url: Optional[str] = ""
    public_logo_url: Optional[str] = ""
    updated_at: Optional[str] = None
