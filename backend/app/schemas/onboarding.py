from pydantic import BaseModel

from app.schemas.policy import Policy, PolicyQuote
from app.schemas.worker import Worker


class WorkerOnboardingResponse(BaseModel):
    worker: Worker
    policy: Policy
    quote: PolicyQuote
