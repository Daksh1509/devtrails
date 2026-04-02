from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus
from app.models.payout import Payout, PayoutStatus, PayoutChannel
import uuid
from datetime import datetime

def process_instant_payout(db: Session, claim_id: str) -> Payout:
    """
    Process payout for an approved claim.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim or claim.status != ClaimStatus.AUTO_APPROVED:
        return None
    
    # 1. Generate Mock Transaction ID
    txn_id = f"TXN_EK_{datetime.utcnow().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8].upper()}"
    
    # 2. Create Payout Record
    payout = Payout(
        claim_id=claim.id,
        worker_id=claim.worker_id,
        amount=claim.adjusted_payout,
        channel=PayoutChannel.UPI,
        transaction_id=txn_id,
        status=PayoutStatus.COMPLETED # Instant mock success
    )
    
    # 3. Update Claim status
    claim.status = ClaimStatus.PAID
    
    db.add(payout)
    db.commit()
    db.refresh(payout)
    
    print(f"Payout of ₹{payout.amount} processed for claim {claim_id}")
    return payout
