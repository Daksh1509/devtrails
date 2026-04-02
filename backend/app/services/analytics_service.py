from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.claim import Claim, FraudResult, DisruptionType
from app.models.payout import Payout
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.services.response_serializers import normalize_enum_value

def get_insurer_overview(db: Session):
    total_workers = db.query(Worker).count()
    active_policies_count = db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).count()
    total_payouts_amount = db.query(func.sum(Payout.amount)).scalar() or 0.0
    
    # Loss ratio: Payouts / Premiums
    total_premiums = db.query(func.sum(Policy.premium_amount)).scalar() or 1.0
    loss_ratio = total_payouts_amount / total_premiums
    
    # Fraud rate
    total_claims = db.query(Claim).count()
    fraud_claims = db.query(Claim).filter(Claim.fraud_check_result != FraudResult.PASSED).count()
    fraud_rate = (fraud_claims / total_claims) if total_claims > 0 else 0.0
    
    # Claims by type
    claims_by_type = {}
    type_counts = db.query(Claim.disruption_type, func.count(Claim.id)).group_by(Claim.disruption_type).all()
    for dtype, count in type_counts:
        claims_by_type[normalize_enum_value(dtype, DisruptionType)] = count

    return {
        "total_workers": total_workers,
        "total_payouts_amount": round(total_payouts_amount, 2),
        "active_policies_count": active_policies_count,
        "loss_ratio": round(loss_ratio, 2),
        "fraud_rate": round(fraud_rate, 2),
        "claims_by_type": claims_by_type
    }

def get_zone_heatmap(db: Session):
    zones = db.query(Zone).all()
    heatmaps = []
    for zone in zones:
        active_disruptions = 0 # Placeholder: check TriggerEvent
        total_claims_count = db.query(Claim).join(Worker).filter(Worker.zone_id == zone.id).count()
        
        heatmaps.append({
            "zone_id": zone.id,
            "zone_name": zone.name,
            "risk_score": zone.base_risk_score,
            "active_disruptions_count": active_disruptions,
            "total_claims_count": total_claims_count,
            "latitude": zone.latitude,
            "longitude": zone.longitude
        })
    return heatmaps
