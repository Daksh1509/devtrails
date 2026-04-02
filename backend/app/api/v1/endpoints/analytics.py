from fastapi import APIRouter, Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.analytics import AnalyticsOverview, WorkerAnalytics
from app.services.analytics_service import get_insurer_overview, get_zone_heatmap
from app.models.claim import Claim, DisruptionType, ClaimStatus
from app.models.worker import Worker
from app.models.payout import Payout
from sqlalchemy import func
from app.services.income_engine import calculate_expected_shift_earning, calculate_hourly_wage
from app.models.worker import Zone
from app.services.response_serializers import (
    normalize_enum_value,
    safe_float,
)

router = APIRouter()

@router.get("/insurer/overview", response_model=AnalyticsOverview)
def insurer_dashboard(db: Session = Depends(get_db)):
    overview = get_insurer_overview(db)
    heatmaps = get_zone_heatmap(db)
    return {
        "insurer_overview": overview,
        "zone_heatmaps": heatmaps
    }

@router.get("/worker/{worker_id}", response_model=WorkerAnalytics)
def worker_dashboard(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    total_protected = db.query(func.sum(Payout.amount)).filter(Payout.worker_id == worker_id).scalar() or 0.0
    total_claims = db.query(Claim).filter(Claim.worker_id == worker_id).count()
    recent_claims = db.query(Claim).filter(Claim.worker_id == worker_id).order_by(Claim.created_at.desc()).limit(5).all()
    
    # Active policy
    from app.models.policy import Policy, PolicyStatus
    from datetime import datetime
    active_policy = db.query(Policy).filter(
        Policy.worker_id == worker_id,
        Policy.status == PolicyStatus.ACTIVE,
        Policy.week_end >= datetime.utcnow().date()
    ).first()

    # 4. Predicted Algorithm Objectives
    zone = db.query(Zone).filter(Zone.id == worker.zone_id).first()
    f_score = zone.footfall_score if zone else 0.5
    h_density = zone.historical_order_density if zone else 0.5
    
    current_shift = worker.shifts[0] if worker.shifts else "evening"
    expected_earning = calculate_expected_shift_earning(
        current_shift, 
        worker.area_type,
        footfall_score=f_score,
        historical_order_density=h_density,
        warehouse_distance_km=worker.warehouse_distance_km,
        platform_type=worker.platform_type,
        zone=zone
    )
    predicted_wage = calculate_hourly_wage(expected_earning)
    
    # Per unit (1hr) predictions
    predicted_loss = predicted_wage * 1.0
    risk_payout_estimate = predicted_loss * 1.3 # Assuming average high severity multiplier for display

    return {
        "worker_id": worker_id,
        "earnings_protected": total_protected,
        "active_policy_id": active_policy.id if active_policy else None,
        "total_claims": total_claims,
        "recent_claims": [
            {
                "id": c.id,
                "type": normalize_enum_value(c.disruption_type, DisruptionType),
                "amount": safe_float(c.adjusted_payout),
                "status": normalize_enum_value(c.status, ClaimStatus),
            }
            for c in recent_claims
        ],
        "expected_shift_earning": expected_earning,
        "expected_hourly_wage": predicted_wage,
        "predicted_disruption_loss": predicted_loss,
        "predicted_risk_payout_estimate": risk_payout_estimate
    }
