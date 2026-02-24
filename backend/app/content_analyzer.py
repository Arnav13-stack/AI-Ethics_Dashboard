# backend/app/content_analyzer.py

import os
import json
import re
from typing import Dict, Any

from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_NAME = "llama-3.1-8b-instant"


def extract_json_object(text: str) -> str:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("LLM did not return valid JSON.")
    return match.group()


def analyze_text_for_ethics(content: str) -> Dict[str, Any]:
    prompt = f"""
You are an AI ethics and safety auditor.

You will receive user-generated CONTENT (text extracted from CSV, transcript, description, or OCR).
You must analyze it for:

1. BIAS (each with individual score 0–100, where 0 = no issue, 100 = severe):
   - gender_bias
   - race_bias
   - age_bias
   - religious_bias
   - disability_bias
   - occupational_bias
   - nationality_bias
   - appearance_bias

   For EACH bias type, return:
   {{
     "score": number,
     "issues": [
       {{
         "original": "full original sentence",
         "highlight_words": ["word1", "word2"],
         "corrected": "corrected neutral sentence"
       }}
     ]
   }}

2. MISINFORMATION (score 0–100 for each):
   - false_information
   - out_of_context
   - no_evidence
   - half_truth

   Same structure:
   {{
     "score": number,
     "issues": [
       {{
         "original": "sentence with problem",
         "reason": "why it's problematic",
         "corrected": "fixed / more accurate version"
       }}
     ]
   }}

3. DEEPFAKE-LIKE CUES (for media represented in text − e.g. if the content talks about edited videos/images):
   Return:
   {{
     "authenticity_score": number,  # low = suspicious, high = authentic
     "manipulation_type": "none" or string (e.g. "face swap", "audio clone", "splicing"),
     "face_integrity_score": number,  # 0–100
     "artifact_detection_score": number,  # 0–100
     "notes": ["brief text notes about why you gave these scores"]
   }}

4. MODEL SUGGESTIONS:
   Suggest which model types would be safest/most appropriate to handle this kind of content.
   Return:
   {{
     "recommended_models": [
       {{
         "task": "text classification for toxicity & bias",
         "suggested_model_types": [
           "fine-tuned transformer classifier",
           "zero-shot LLM classifier"
         ],
         "reason": "short justification"
       }},
       {{
         "task": "image / video deepfake detection",
         "suggested_model_types": [
           "CNN-based deepfake detector",
           "vision transformer with artifact detection"
         ],
         "reason": "short justification"
       }}
     ]
   }}

RETURN STRICT JSON ONLY, in this exact structure:

{{
  "bias": {{
    "gender_bias": {{ "score": 0, "issues": [] }},
    "race_bias": {{ "score": 0, "issues": [] }},
    "age_bias": {{ "score": 0, "issues": [] }},
    "religious_bias": {{ "score": 0, "issues": [] }},
    "disability_bias": {{ "score": 0, "issues": [] }},
    "occupational_bias": {{ "score": 0, "issues": [] }},
    "nationality_bias": {{ "score": 0, "issues": [] }},
    "appearance_bias": {{ "score": 0, "issues": [] }}
  }},
  "misinformation": {{
    "false_information": {{ "score": 0, "issues": [] }},
    "out_of_context": {{ "score": 0, "issues": [] }},
    "no_evidence": {{ "score": 0, "issues": [] }},
    "half_truth": {{ "score": 0, "issues": [] }}
  }},
  "deepfake": {{
    "authenticity_score": 50,
    "manipulation_type": "none",
    "face_integrity_score": 50,
    "artifact_detection_score": 50,
    "notes": []
  }},
  "model_suggestions": {{
    "recommended_models": []
  }}
}}

Now analyze the following content:

-----BEGIN CONTENT-----
{content}
-----END CONTENT-----
    """

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You MUST return a single valid JSON object only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=800,
    )

    raw = response.choices[0].message.content
    clean = extract_json_object(raw)
    return json.loads(clean)
