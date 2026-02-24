# backend/app/main.py

from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import select
from typing import Optional

from app import models, predictor, redteam, db, content_analyzer
import json
import datetime
from io import BytesIO
import csv

# PDF + Charts
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4

import matplotlib.pyplot as plt

app = FastAPI(title="AI Ethics Risk Predictor & RedTeam")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()


# ------------------------------- MODELS --------------------------------

@app.post("/models/")
async def create_model(
    name: str = Form(...),
    description: str = Form(""),
    dataset_summary: str = Form(""),
    task: str = Form(""),
    sensitive_features: str = Form("")
):
    m = models.ModelMetadata(
        name=name,
        description=description,
        dataset_summary=dataset_summary,
        task=task,
        sensitive_features=sensitive_features
    )
    with db.get_session() as session:
        session.add(m)
        session.commit()
        session.refresh(m)
    return {"model": m}


@app.get("/models/")
def list_models():
    with db.get_session() as session:
        res = session.exec(select(models.ModelMetadata)).all()
    return {"models": res}


@app.delete("/models/{model_id}")
def delete_model(model_id: int):
    with db.get_session() as session:
        m = session.get(models.ModelMetadata, model_id)
        if not m:
            return {"error": "Model not found"}

        session.delete(m)
        session.commit()

    return {"message": "Model deleted", "id": model_id}


# ------------------------------- PREDICTOR --------------------------------

@app.post("/predict/{model_id}")
def run_predictor(model_id: int):
    with db.get_session() as session:
        m = session.get(models.ModelMetadata, model_id)
        if not m:
            return {"error": "model not found"}

        meta = m.dict()
        result = predictor.llm_predictor(meta)

        run = models.RunResult(
            model_id=model_id,
            run_type="predictor",
            result_json=json.dumps(result)
        )

        session.add(run)
        session.commit()
        session.refresh(run)

    return {"result": result, "run_id": run.id}


# ------------------------------- REDTEAM --------------------------------

@app.post("/redteam/{model_id}")
def run_redteam(model_id: int, attacks: int = 5):
    with db.get_session() as session:
        m = session.get(models.ModelMetadata, model_id)
        if not m:
            return {"error": "model not found"}

        meta = m.dict()
        attack_list = redteam.generate_attacks(meta, n=attacks)
        evaluated = redteam.mock_evaluate_attacks(attack_list)

        run = models.RunResult(
            model_id=model_id,
            run_type="redteam",
            result_json=json.dumps(evaluated)
        )

        session.add(run)
        session.commit()
        session.refresh(run)

    return {"attacks": evaluated, "run_id": run.id}


# ------------------------------- CSV HELPER --------------------------------

def csv_bytes_to_text(csv_bytes: bytes) -> str:
    text = csv_bytes.decode("utf-8", errors="ignore")
    lines = text.splitlines()
    return "\n".join(lines)


# ------------------------------- UPLOAD ANALYSIS --------------------------------

@app.post("/analyze_upload/")
async def analyze_upload(
    file: UploadFile = File(...),
    model_id: Optional[int] = None
):
    contents = await file.read()

    if file.content_type in ["text/csv", "application/vnd.ms-excel"]:
        extracted_text = csv_bytes_to_text(contents)
        media_type = "csv"
    elif file.content_type.startswith("text/"):
        extracted_text = contents.decode("utf-8", errors="ignore")
        media_type = "text"
    elif file.content_type.startswith("image/"):
        extracted_text = (
            f"This is an image file named {file.filename}. "
            "Assume it may contain faces and visual content. "
            "Discuss potential bias, misinformation, and deepfake risks in general."
        )
        media_type = "image"
    elif file.content_type.startswith("video/"):
        extracted_text = (
            f"This is a video file named {file.filename}. "
            "Assume it may contain speech and faces. "
            "Discuss potential bias, misinformation, and deepfake risks in general."
        )
        media_type = "video"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    try:
        analysis = content_analyzer.analyze_text_for_ethics(extracted_text)
    except Exception as e:
        print("Analysis error:", e)
        raise HTTPException(status_code=500, detail="Failed to analyze content")

    with db.get_session() as session:
        run = models.RunResult(
            model_id=model_id or 0,
            run_type="upload_audit",
            result_json=json.dumps({
                "file_name": file.filename,
                "media_type": media_type,
                "analysis": analysis
            })
        )
        session.add(run)
        session.commit()
        session.refresh(run)

    return {
        "run_id": run.id,
        "file_name": file.filename,
        "media_type": media_type,
        "analysis": analysis
    }


# ------------------------------- MODEL ANALYSIS --------------------------------

@app.post("/analyze_model/{model_id}")
def analyze_model(model_id: int):
    with db.get_session() as session:
        m = session.get(models.ModelMetadata, model_id)
        if not m:
            raise HTTPException(status_code=404, detail="Model not found")

    content = f"""
Model name: {m.name}
Description: {m.description}
Dataset summary: {m.dataset_summary}
Task: {m.task}
Sensitive features: {m.sensitive_features}
"""

    try:
        analysis = content_analyzer.analyze_text_for_ethics(content)
    except Exception as e:
        print("Model analysis error:", e)
        raise HTTPException(status_code=500, detail="Failed to analyze model")

    with db.get_session() as session:
        run = models.RunResult(
            model_id=model_id,
            run_type="model_audit",
            result_json=json.dumps({
                "model_id": model_id,
                "analysis": analysis
            })
        )
        session.add(run)
        session.commit()
        session.refresh(run)

    return {
        "run_id": run.id,
        "model_id": model_id,
        "analysis": analysis
    }


# ------------------------------- RUN HISTORY --------------------------------

@app.get("/runs/")
def list_runs():
    with db.get_session() as session:
        res = session.exec(select(models.RunResult)).all()

    runs = []
    for r in res:
        runs.append({
            "id": r.id,
            "model_id": r.model_id,
            "run_type": r.run_type,
            "result": json.loads(r.result_json) if r.result_json else None
        })
    return {"runs": runs}


@app.get("/runs/{run_id}")
def get_run(run_id: int):
    with db.get_session() as session:
        r = session.get(models.RunResult, run_id)
        if not r:
            return {"error": "run not found"}

    return {
        "id": r.id,
        "model_id": r.model_id,
        "run_type": r.run_type,
        "result": json.loads(r.result_json) if r.result_json else None
    }


# ------------------------------- PDF CHARTS (PREDICTOR) --------------------------------

def generate_charts(run, model):
    bias = 0
    sensitive = 0
    misinfo = 0

    ds = model.dataset_summary.lower() if model.dataset_summary else ""
    task = model.task.lower() if model.task else ""

    if "small" in ds or "skew" in ds or "region" in ds:
        bias = 25

    if model.sensitive_features:
        sensitive = 20

    if "generate" in task or "text" in task:
        misinfo = 30

    severity = run.result_json
    result = json.loads(severity)
    overall = result.get("severity_score", 0) * 10

    fig1, ax1 = plt.subplots(figsize=(5, 3))
    risks = [bias, sensitive, misinfo, overall]
    labels = ["Bias", "Sensitive", "Misinformation", "Overall Severity"]

    ax1.barh(labels, risks, color="skyblue")
    ax1.set_xlim(0, 100)
    ax1.set_title("Risk Breakdown")

    buf1 = BytesIO()
    plt.savefig(buf1, format="png", bbox_inches="tight")
    buf1.seek(0)
    plt.close(fig1)

    fig2, ax2 = plt.subplots(figsize=(5, 1))
    color = "green" if overall < 30 else "yellow" if overall < 70 else "red"
    ax2.barh(["Severity"], [overall], color=color)
    ax2.set_xlim(0, 100)
    ax2.set_title("Severity Gauge")

    buf2 = BytesIO()
    plt.savefig(buf2, format="png", bbox_inches="tight")
    buf2.seek(0)
    plt.close(fig2)

    return buf1, buf2


# ------------------------------- PDF REPORT --------------------------------

@app.get("/report/{run_id}")
def pdf_report(run_id: int):
    with db.get_session() as session:
        run = session.get(models.RunResult, run_id)
        if not run:
            return {"error": "Run not found"}
        model = session.get(models.ModelMetadata, run.model_id) if run.model_id else None

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"AI Ethics Report — Run #{run_id}", styles["Title"]))
    story.append(Spacer(1, 12))

    if model:
        story.append(Paragraph(f"<b>Model:</b> {model.name}", styles["Heading2"]))
        story.append(Paragraph(f"<b>Task:</b> {model.task}", styles["Normal"]))
        story.append(Spacer(1, 12))

    # predictor charts only for predictor runs
    if run.run_type == "predictor" and model:
        chart_buf, gauge_buf = generate_charts(run, model)
        story.append(Paragraph("<b>Risk Breakdown Chart</b>", styles["Heading3"]))
        story.append(Image(chart_buf, width=400, height=250))
        story.append(Spacer(1, 12))

        story.append(Paragraph("<b>Severity Gauge</b>", styles["Heading3"]))
        story.append(Image(gauge_buf, width=400, height=80))
        story.append(Spacer(1, 12))

    result_data = json.loads(run.result_json)

    if run.run_type == "predictor":
        sev = result_data.get("severity_score")
        story.append(Paragraph(f"<b>Severity:</b> {sev}/10", styles["Normal"]))

        story.append(Paragraph("<b>Reasons:</b>", styles["Heading3"]))
        for r in result_data.get("reasons", []):
            story.append(Paragraph(f"- {r}", styles["Normal"]))

        story.append(Paragraph("<b>Mitigation:</b>", styles["Heading3"]))
        for m in result_data.get("mitigation", []):
            story.append(Paragraph(f"- {m}", styles["Normal"]))

    elif run.run_type == "redteam":
        story.append(Paragraph("<b>RedTeam Attacks:</b>", styles["Heading3"]))
        for atk in result_data:
            story.append(Paragraph(f"{atk['type']} — Vulnerability {atk['vulnerability_score']}", styles["Normal"]))
            story.append(Paragraph(atk["attack_prompt"], styles["Normal"]))
            story.append(Spacer(1, 6))

    elif run.run_type in ("upload_audit", "model_audit"):
        if run.run_type == "upload_audit":
            story.append(Paragraph("<b>Upload Audit</b>", styles["Heading2"]))
            story.append(Paragraph(f"File: {result_data.get('file_name')}", styles["Normal"]))
            story.append(Paragraph(f"Media type: {result_data.get('media_type')}", styles["Normal"]))
            analysis = result_data["analysis"]
        else:
            story.append(Paragraph("<b>Model Audit</b>", styles["Heading2"]))
            analysis = result_data["analysis"]

        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Bias Analysis</b>", styles["Heading3"]))
        for key, val in analysis["bias"].items():
            story.append(Paragraph(f"{key} – Score: {val['score']}", styles["Normal"]))
            for issue in val["issues"]:
                story.append(Paragraph(f"Original: {issue['original']}", styles["Normal"]))
                story.append(Paragraph(f"Corrected: {issue['corrected']}", styles["Normal"]))
                story.append(Spacer(1, 4))

        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Misinformation</b>", styles["Heading3"]))
        for key, val in analysis["misinformation"].items():
            story.append(Paragraph(f"{key} – Score: {val['score']}", styles["Normal"]))
            for issue in val["issues"]:
                story.append(Paragraph(f"Original: {issue['original']}", styles["Normal"]))
                story.append(Paragraph(f"Reason: {issue['reason']}", styles["Normal"]))
                story.append(Paragraph(f"Corrected: {issue['corrected']}", styles["Normal"]))
                story.append(Spacer(1, 4))

        df = analysis["deepfake"]
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Deepfake / Manipulation</b>", styles["Heading3"]))
        story.append(Paragraph(f"Authenticity score: {df['authenticity_score']}", styles["Normal"]))
        story.append(Paragraph(f"Manipulation type: {df['manipulation_type']}", styles["Normal"]))
        story.append(Paragraph(f"Face integrity score: {df['face_integrity_score']}", styles["Normal"]))
        story.append(Paragraph(f"Artifact detection score: {df['artifact_detection_score']}", styles["Normal"]))
        for note in df.get("notes", []):
            story.append(Paragraph(f"- {note}", styles["Normal"]))

        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Model Suggestions</b>", styles["Heading3"]))
        for m in analysis["model_suggestions"]["recommended_models"]:
            story.append(Paragraph(f"Task: {m['task']}", styles["Normal"]))
            story.append(Paragraph(f"Models: {', '.join(m['suggested_model_types'])}", styles["Normal"]))
            story.append(Paragraph(f"Reason: {m['reason']}", styles["Normal"]))
            story.append(Spacer(1, 4))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{run_id}.pdf"'}
    )
