from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class WorkerAnalytics(BaseModel):
    worker_id: str
    earnings_protected: float
    active_policy_id: Optional[str] = None
    total_claims: int
    recent_claims: List[Dict[str, Any]]
    
    # Predicted Objectives (Algorithm Results)
    expected_shift_earning: float
    expected_hourly_wage: float
    predicted_disruption_loss: float # Hourly loss
    predicted_risk_payout_estimate: float # Expected hourly payout after risk-adjustment

class InsurerOverview(BaseModel):
    total_workers: int
    total_payouts_amount: float
    active_policies_count: int
    loss_ratio: float
    fraud_rate: float
    claims_by_type: Dict[str, int]

class ZoneRiskHeatmap(BaseModel):
    zone_id: str
    zone_name: str
    risk_score: float
    active_disruptions_count: int
    total_claims_count: int
    latitude: float
    longitude: float

class AnalyticsOverview(BaseModel):
    insurer_overview: InsurerOverview
    zone_heatmaps: List[ZoneRiskHeatmap]
