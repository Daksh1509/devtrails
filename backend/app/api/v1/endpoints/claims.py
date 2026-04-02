from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.claim import Claim, ClaimStatus
from app.schemas.claim import Claim as ClaimSchema, ClaimUpdate
from app.services.fraud_engine import check_fraud_rules
from app.models.claim import DisruptionType, FraudResult
from app.services.response_serializers import (
    normalize_enum_value,
    safe_datetime,
    safe_float,
    safe_str,
)

router = APIRouter()


def _serialize_claim(claim: Claim) -> dict:
    return {
        "id": safe_str(claim.id),
        "worker_id": safe_str(claim.worker_id),
        "policy_id": safe_str(claim.policy_id),
        "trigger_event_id": safe_str(claim.trigger_event_id),
        "disruption_type": normalize_enum_value(claim.disruption_type, DisruptionType),
        "disruption_duration_hours": safe_float(claim.disruption_duration_hours),
        "hourly_wage": safe_float(claim.hourly_wage),
        "severity_multiplier": safe_float(claim.severity_multiplier, 1.0),
        "base_loss": safe_float(claim.base_loss),
        "adjusted_payout": safe_float(claim.adjusted_payout),
        "status": normalize_enum_value(claim.status, ClaimStatus),
        "fraud_check_result": normalize_enum_value(claim.fraud_check_result, FraudResult),
        "fraud_probability": safe_float(claim.fraud_probability),
        "created_at": safe_datetime(claim.created_at),
        "reviewed_at": claim.reviewed_at,
    }

@router.get("/", response_model=List[ClaimSchema])
def list_claims(status: Optional[ClaimStatus] = None, db: Session = Depends(get_db)):
    query = db.query(Claim)
    if status:
        query = query.filter(Claim.status == status)
    return [_serialize_claim(claim) for claim in query.order_by(Claim.created_at.desc()).all()]

@router.get("/{id}", response_model=ClaimSchema)
def get_claim(id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return _serialize_claim(claim)

@router.get("/worker/{worker_id}", response_model=List[ClaimSchema])
def get_worker_claims(worker_id: str, db: Session = Depends(get_db)):
    return [_serialize_claim(claim) for claim in db.query(Claim).filter(Claim.worker_id == worker_id).all()]

@router.patch("/{id}/review")
def review_claim(id: str, claim_in: ClaimUpdate, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    update_data = claim_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(claim, field, value)
    
    claim.reviewed_at = datetime.utcnow()
    db.add(claim)
    db.commit()
    return {"message": "Claim review updated"}

@router.post("/{id}/check-fraud")
def run_fraud_check(id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    result = check_fraud_rules(db, claim)
    return result
