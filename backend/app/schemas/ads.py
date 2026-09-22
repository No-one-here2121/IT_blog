from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AdResponse(BaseModel):
    id: int
    campaign_id: Optional[int] = None
    title: str
    description: str
    creative_url: str
    target_url: str
    category: str
    status: str
    impressions_count: int
    clicks_count: int

    model_config = ConfigDict(from_attributes=True)


class AdCreate(BaseModel):
    campaign_id: Optional[int] = None
    title: str
    description: str
    creative_url: str
    target_url: str
    category: str = "tools"


class AdStatusUpdate(BaseModel):
    status: str


class AdCampaignCreate(BaseModel):
    advertiser_name: str
    title: str
    budget: Optional[int] = 0


class AdCampaignResponse(BaseModel):
    id: int
    advertiser_name: str
    title: str
    status: str
    budget: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdClickResponse(BaseModel):
    ad_id: int
    clicks_count: int
    target_url: str
