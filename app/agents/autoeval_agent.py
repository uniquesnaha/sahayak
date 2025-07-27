# app/agents/autoeval_agent.py

import os
import json
import re
from typing import List

import vertexai
from vertexai.preview.generative_models import GenerativeModel
from google.cloud import vision

# ─── Vertex AI & Vision Initialization ───────────────────────────────────────
vertexai.init(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)
_gemini = GenerativeModel("gemini-2.5-pro")
_vision = vision.ImageAnnotatorClient()


def ocr_images_to_text(image_bytes_list: List[bytes]) -> List[str]:
    """
    Perform OCR on each image and return a list of text pages.
    """
    pages: List[str] = []
    for img_bytes in image_bytes_list:
        image = vision.Image(content=img_bytes)
        resp = _vision.text_detection(image=image)
        if resp.error.message:
            raise RuntimeError(f"Vision API error: {resp.error.message}")
        text = resp.full_text_annotation.text or ""
        pages.append(text.strip())
    return pages


def run_autoeval_pipeline(
    correct_answers: List[str],
    image_bytes_list: List[bytes]
) -> dict:
    """
    Given the correct answer list and a list of student answer-sheet images,
    OCRs the images, then uses Gemini 2.5 Pro to grade and provide feedback.

    Returns a dict:
    {
      "score": int,
      "details": [
         { "question": int,
           "correct": bool,
           "student": str,
           "feedback": str
         },
         …  
      ]
    }
    """
    # 1) OCR
    student_pages = ocr_images_to_text(image_bytes_list)
    student_blob = "\n".join(student_pages)

    # 2) Build the LLM prompt
    num_qs = len(correct_answers)
    prompt = f"""
You are an expert grading assistant. Here are the correct answers for questions 1–{num_qs}:
{json.dumps(correct_answers, ensure_ascii=False)}

The student's extracted answers (one per line) are:
{student_blob}

Please return a JSON object, NO extra text, exactly in this format:

{{
  "score": 0,
  "details": [
    {{
      "question": 1,
      "correct": true,
      "student": "...",
      "feedback": "..."
    }},
    // …one entry per question
  ]
}}
"""
    # 3) Invoke Gemini
    response = _gemini.generate_content(prompt)
    raw = response.text.strip()

    # 4) Extract & parse JSON
    cleaned = raw
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[\w-]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if m:
            result = json.loads(m.group(1))
        else:
            raise RuntimeError(f"Failed to parse JSON from LLM response:\n{cleaned}")

    return result
