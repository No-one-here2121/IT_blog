from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    title: str
    description: str
    organizer: str
    event_type: str = "workshop"  # workshop, webinar, meetup, conference
    start_time: datetime
    end_time: Optional[datetime] = None
    location: str = "Online"
    online_url: Optional[str] = None
    registration_url: Optional[str] = None
    banner_image: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    organizer: str
    event_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    location: str
    online_url: Optional[str] = None
    registration_url: Optional[str] = None
    banner_image: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventRegistrationCreate(BaseModel):
    full_name: str
    email: str
    notes: Optional[str] = None


class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    full_name: str
    email: str
    notes: Optional[str] = None
    created_at: datetime
    event_title: Optional[str] = None
    event_slug: Optional[str] = None
    start_time: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

