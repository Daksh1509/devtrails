from datetime import datetime
from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.models.trigger_event import TriggerEvent
from app.services.income_engine import calculate_expected_shift_earning, calculate_hourly_wage

# Severity Multipliers from README
SEVERITY_MULTIPLIERS = {
    "heavy_rain": 1.0,
    "extreme_heat": 0.8,
    "hazardous_aqi": 0.7,
    "flood": 1.3,
    "civic_disruption": 1.5
}

def process_claims_for_trigger(db: Session, trigger_event: TriggerEvent):
    """
    Zero-Touch Claim Initiation Engine: 4 checks.
    """
    # 1. Zone Match is implicit as we get only workers in the zone
    workers_in_zone = db.query(Worker).filter(Worker.zone_id == trigger_event.zone_id).all()

    for worker in workers_in_zone:
        # Check 2: Active Policy
        policy = db.query(Policy).filter(
            Policy.worker_id == worker.id,
            Policy.status == PolicyStatus.ACTIVE,
            Policy.week_start <= datetime.utcnow().date(),
            Policy.week_end >= datetime.utcnow().date()
        ).first()
        
        if not policy:
            continue
            
        # Check 3: Online Status (Simplified - mock online for now or check worker.is_online)
        # In Phase 1 we might assume they were working or check flag
        if not worker.is_online and not trigger_event.trigger_type == "civic_disruption":
            # Some events might prevent them from even going online
            continue

        # Check 4: Duplicate Check (No claim for same trigger and worker)
        existing = db.query(Claim).filter(
            Claim.worker_id == worker.id,
            Claim.trigger_event_id == trigger_event.id
        ).first()
        
        if existing:
            continue

        # Calculate Loss using detailed Algorithm Inputs
        duration = 2.0
        if trigger_event.ended_at:
            delta = trigger_event.ended_at - trigger_event.started_at
            duration = delta.total_seconds() / 3600.0

        # Get Zone data specifically for this worker
        zone = db.query(Zone).filter(Zone.id == worker.zone_id).first()

        # Predicted Objectives
        current_shift = worker.shifts[0] if worker.shifts else "evening"
        expected_earning = calculate_expected_shift_earning(
            current_shift, 
            worker.area_type,
            footfall_score=zone.footfall_score if zone else 0.5,
            historical_order_density=zone.historical_order_density if zone else 0.5,
            warehouse_distance_km=worker.warehouse_distance_km,
            platform_type=worker.platform_type,
            zone=zone
        )
        hourly_wage = calculate_hourly_wage(expected_earning)
        
        # 1. Disruption-Adjusted Loss
        disruption_adjusted_loss = hourly_wage * duration
        
        # 2. Risk-Adjusted Payout Estimate
        multiplier = SEVERITY_MULTIPLIERS.get(trigger_event.trigger_type, 1.0)
        risk_adjusted_payout = disruption_adjusted_loss * multiplier

        # Create Claim
        claim = Claim(
            worker_id=worker.id,
            policy_id=policy.id,
            trigger_event_id=trigger_event.id,
            disruption_type=trigger_event.trigger_type,
            disruption_duration_hours=duration,
            hourly_wage=hourly_wage,
            severity_multiplier=multiplier,
            base_loss=disruption_adjusted_loss, # Maps to disruption_adjusted_loss
            adjusted_payout=risk_adjusted_payout, # Maps to risk_adjusted_payout_estimate
            status=ClaimStatus.AUTO_APPROVED
        )
        
        db.add(claim)
    
    db.commit()
