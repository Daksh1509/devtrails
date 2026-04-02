from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.worker import AreaType

class ZoneBase(BaseModel):
    id: str
    name: str
    city: str
    latitude: float
    longitude: float
    elevation_m: float = 0.0
    flood_prone: bool = False
    base_risk_score: float = 0.5
    footfall_score: float = 0.5
    historical_order_density: float = 0.5
    default_area_type: Optional[AreaType] = None
    default_warehouse_distance_km: Optional[float] = None

class ZoneCreate(ZoneBase):
    pass

class Zone(ZoneBase):
    class Config:
        from_attributes = True

class WorkerBase(BaseModel):
    name: str
    phone: str
    upi_id: str
    zone_id: str
    area_type: AreaType = AreaType.COMMERCIAL
    warehouse_distance_km: float = 1.0
    platform_type: str = "Blinkit"
    shifts: List[str] = []

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    upi_id: Optional[str] = None
    zone_id: Optional[str] = None
    area_type: Optional[AreaType] = None
    warehouse_distance_km: Optional[float] = None
    platform_type: Optional[str] = None
    is_online: Optional[bool] = None
    shifts: Optional[List[str]] = None

class Worker(WorkerBase):
    id: str
    is_online: bool
    registered_at: datetime
    last_active_at: datetime

    class Config:
        from_attributes = True
