from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.trigger_event import TriggerEvent
from app.models.worker import Zone
from app.schemas.trigger import TriggerEvent as TriggerSchema
from app.services.trigger_monitor import monitor_zone_triggers
from app.services.claim_processor import process_claims_for_trigger

router = APIRouter()

@router.post("/check-now", response_model=List[TriggerSchema])
async def check_triggers(zone_id: Optional[str] = None, db: Session = Depends(get_db)):
    if zone_id:
        zones = db.query(Zone).filter(Zone.id == zone_id).all()
    else:
        zones = db.query(Zone).all()
    
    all_events = []
    for zone in zones:
        events = await monitor_zone_triggers(db, zone)
        all_events.extend(events)
        
        # Auto-process claims for any new event
        for event in events:
            process_claims_for_trigger(db, event)
            
    return all_events

@router.get("/events", response_model=List[TriggerSchema])
def list_trigger_events(db: Session = Depends(get_db)):
    return db.query(TriggerEvent).order_by(TriggerEvent.started_at.desc()).all()

@router.get("/active", response_model=List[TriggerSchema])
def list_active_triggers(db: Session = Depends(get_db)):
    return db.query(TriggerEvent).filter(TriggerEvent.is_active == True).all()
