import json
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.worker import Zone, Worker, AreaType
from app.models.policy import Policy, PolicyStatus
from datetime import datetime, timedelta
import uuid

def seed_db():
    db = SessionLocal()
    
    # 0. Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Clear existing (Dropping for schema updates)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 2. Add Zones
    zones_path = os.path.join(os.path.dirname(__file__), "zones.json")
    with open(zones_path, "r") as f:
        zones_data = json.load(f)
        for z in zones_data:
            if not db.query(Zone).filter(Zone.id == z["id"]).first():
                db_zone = Zone(**z)
                db.add(db_zone)
    
    db.commit()
    print("Zones seeded.")

    # 3. Add Mock Workers
    mock_workers = [
        {"name": "Ravi Kumar", "phone": "9876543210", "upi_id": "ravi@upi", "zone_id": "koramangala_blr", "area_type": AreaType.COMMERCIAL, "platform_type": "Blinkit"},
        {"name": "Suresh Raina", "phone": "9876543211", "upi_id": "suresh@upi", "zone_id": "velachery_chn", "area_type": AreaType.RESIDENTIAL, "platform_type": "Swiggy"},
        {"name": "Amit Sharma", "phone": "9876543212", "upi_id": "amit@upi", "zone_id": "cp_delhi", "area_type": AreaType.COMMERCIAL, "platform_type": "Blinkit"},
        {"name": "Vijay Varma", "phone": "9876543213", "upi_id": "vijay@upi", "zone_id": "bandra_mumbai", "area_type": AreaType.COLLEGE, "platform_type": "Zepto"},
        {"name": "Priya Singh", "phone": "9876543214", "upi_id": "priya@upi", "zone_id": "indiranagar_blr", "area_type": AreaType.COMMERCIAL, "platform_type": "Blinkit"}
    ]

    for w in mock_workers:
        existing = db.query(Worker).filter(Worker.phone == w["phone"]).first()
        if not existing:
            db_worker = Worker(
                **w,
                warehouse_distance_km=1.2,
                is_online=True,
                shifts=["evening", "night"]
            )
            db.add(db_worker)
            db.flush() # To get ID

            # Create an active policy for them
            start = datetime.utcnow().date()
            policy = Policy(
                worker_id=db_worker.id,
                week_start=start,
                week_end=start + timedelta(days=7),
                premium_amount=40.0,
                expected_weekly_earning=4000.0,
                expected_weekly_loss=400.0,
                status=PolicyStatus.ACTIVE
            )
            db.add(policy)

    db.commit()
    print("Mock workers and policies seeded.")
    db.close()

if __name__ == "__main__":
    seed_db()
