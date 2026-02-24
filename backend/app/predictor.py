import os
from groq import Groq
from dotenv import load_dotenv
import json
import re

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_NAME = "llama-3.1-8b-instant"   # GROQ MODEL


# ---------------- JSON EXTRACTOR ---------------- #
def extract_json_object(text):
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("LLM did not return valid JSON object.")
    return match.group()


# ---------------- RULE-BASED SEVERITY ---------------- #
def compute_rule_based_risk(meta):
    severity = 0

    ds = (meta.get("dataset_summary") or "").lower()
    task = (meta.get("task") or "").lower()
    sensitive = meta.get("sensitive_features") or ""

    # Dataset size / quality
    if "small" in ds or "skew" in ds or "region" in ds:
        severity += 4
    if "large" in ds or "balanced" in ds:
        severity += 1

    # Task type
    if "generate" in task or "chat" in task:
        severity += 3
    if "classification" in task:
        severity += 1

    # Sensitive attributes
    if sensitive.strip():
        severity += 2

    # Keep score in range 1–10
    return max(1, min(severity, 10))


# ---------------- MAIN PREDICTOR ---------------- #
def llm_predictor(meta):
    prompt = f"""
    You are an AI ethics evaluator. Provide a JSON risk evaluation.

    Look at:
    - Dataset description
    - Task
    - Sensitive features
    - Possible bias, fairness issues, safety problems

    RETURN STRICT JSON ONLY:
    {{
        "severity_score": number,
        "reasons": ["..."],
        "mitigation": ["..."]
    }}
    """

    # Call LLM
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You MUST return valid JSON only."},
            {"role": "user", "content": prompt.replace("\t", " ")}
        ],
        temperature=0.3,
        max_tokens=300
    )

    # Extract JSON
    text = response.choices[0].message.content
    clean_json = extract_json_object(text)
    llm_result = json.loads(clean_json)

    # ---------------- COMBINE LLM + RULE RISK ---------------- #
    rule_score = compute_rule_based_risk(meta)
    llm_score = llm_result.get("severity_score", 5)

    # Weighted average (LLM 60% + rule 40%)
    final_severity = round((llm_score * 0.6) + (rule_score * 0.4))

    # Replace final score
    llm_result["severity_score"] = max(1, min(final_severity, 10))

    return llm_result
