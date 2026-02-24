from sqlmodel import SQLModel, Field
from typing import Optional

class ModelMetadata(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str
    dataset_summary: str
    task: str  # e.g., classification, generative
    sensitive_features: Optional[str] = None  # comma separated

class RunResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    model_id: int
    run_type: str  # predictor or redteam
    result_json: str  # store JSON string
