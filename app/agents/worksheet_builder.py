# app/agents/worksheet_builder.py

import os
import json
import logging
import re
import io
from zipfile import ZipFile

import vertexai
from vertexai.preview.generative_models import GenerativeModel
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


logger = logging.getLogger(__name__)

# ─── Vertex AI Initialization ───────────────────────────────────────────────
vertexai.init(
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)
gemini = GenerativeModel("gemini-2.5-pro")


def _clean_response(raw: str) -> str:
    """
    Strip Markdown fences or stray wrappers so we get pure JSON.
    """
    # Remove triple-backtick fences
    if raw.startswith("```"):
        raw = re.sub(r"^```[\w-]*\n", "", raw)
        raw = re.sub(r"\n```$", "", raw)
    # Strip stray quotes/backticks
    return raw.strip().strip("`").strip('"').strip()


def run_worksheet_pipeline(
    pages: list[str],
    grade: int,
    subject: str,
    num_questions: int = 5
) -> dict:
    """
    Uses Gemini to generate JSON describing remedial/core/enrichment worksheets.
    Returns the parsed JSON object.
    """
    prompt = f"""
Inputs available:
  pages     : {json.dumps(pages, ensure_ascii=False)}
  grade     : {grade}
  subject   : "{subject}"
  num_questions: {num_questions}

TASK:
  • From 'pages', create three worksheets: remedial, core, enrichment.
  • For each worksheet:
      – Generate exactly {num_questions} questions.
      – Provide their answers.
  • Return a single JSON object, no extra text, exactly matching this shape:

{{
  "worksheets": [
    {{
      "level": "remedial",
      "questions": [ "...", "...", ... ],
      "answers":   [ "...", "...", ... ]
    }},
    {{
      "level": "core",
      "questions": [ … ],
      "answers":   [ … ]
    }},
    {{
      "level": "enrichment",
      "questions": [ … ],
      "answers":   [ … ]
    }}
  ]
}}

RULES:
  • Use ONLY the content in 'pages'—do NOT invent unrelated facts.
  • Output *only* the JSON object—no markdown, no code fences.
"""
    logger.debug("🧠 Worksheet prompt: %s", prompt)

    # Call Gemini
    response = gemini.generate_content(prompt)
    raw = response.text or ""
    logger.debug("🪵 Raw Gemini response:\n%r", raw)

    # Clean and parse JSON
    cleaned = _clean_response(raw)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: extract JSON substring
        m = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if m:
            parsed = json.loads(m.group(1))
        else:
            logger.error("Failed to parse JSON from Gemini response: %s", cleaned)
            raise

    return parsed


def generate_question_pdfs(
    worksheets: list[dict],
    grade: int,
    subject: str
) -> list[tuple[str, bytes]]:
    """
    Renders a PDF for each worksheet's questions.
    Returns a list of (filename, filebytes).
    """
    pdfs = []
    for ws in worksheets:
        level = ws.get("level", "worksheet")
        questions = ws.get("questions", [])
        filename = f"{subject}_Grade{grade}_{level}_Questions.pdf"

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        # Title
        c.setFont("Helvetica-Bold", 14)
        c.drawString(72, 780, f"{subject.title()} Grade {grade} – {level.title()} Questions")
        # Questions
        c.setFont("Helvetica", 12)
        y = 750
        for idx, q in enumerate(questions, start=1):
            if y < 72:
                c.showPage()
                c.setFont("Helvetica", 12)
                y = 750
            c.drawString(72, y, f"{idx}. {q}")
            y -= 18

        c.save()
        buf.seek(0)
        pdfs.append((filename, buf.read()))
    return pdfs


def generate_answer_pdfs(
    worksheets: list[dict],
    grade: int,
    subject: str
) -> list[tuple[str, bytes]]:
    """
    Renders a PDF for each worksheet's answers.
    Returns a list of (filename, filebytes).
    """
    pdfs = []
    for ws in worksheets:
        level = ws.get("level", "worksheet")
        answers = ws.get("answers", [])
        filename = f"{subject}_Grade{grade}_{level}_Answers.pdf"

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        # Title
        c.setFont("Helvetica-Bold", 14)
        c.drawString(72, 780, f"{subject.title()} Grade {grade} – {level.title()} Answers")
        # Answers
        c.setFont("Helvetica", 12)
        y = 750
        for idx, a in enumerate(answers, start=1):
            if y < 72:
                c.showPage()
                c.setFont("Helvetica", 12)
                y = 750
            c.drawString(72, y, f"{idx}. {a}")
            y -= 18

        c.save()
        buf.seek(0)
        pdfs.append((filename, buf.read()))
    return pdfs


def generate_worksheets_zip(
    pages: list[str],
    grade: int,
    subject: str,
    num_questions: int = 5
) -> tuple[str, bytes]:
    """
    1) Calls the Gemini pipeline via run_worksheet_pipeline()
    2) Extracts the 'worksheets' list
    3) Generates question & answer PDFs
    4) Bundles them into a ZIP
    Returns (zip_filename, zip_bytes).
    """
    result = run_worksheet_pipeline(
        pages=pages,
        grade=grade,
        subject=subject,
        num_questions=num_questions,
    )

    # Handle both {"worksheet_json": {...}} or direct {...}
    payload = result.get("worksheet_json", result)
    worksheets = payload.get("worksheets", [])

    if not isinstance(worksheets, list):
        raise RuntimeError(f"Expected a list of worksheets, got: {type(worksheets)}")

    q_pdfs = generate_question_pdfs(worksheets, grade, subject)
    a_pdfs = generate_answer_pdfs(worksheets, grade, subject)

    zip_buffer = io.BytesIO()
    with ZipFile(zip_buffer, "w") as zf:
        for fname, data in q_pdfs + a_pdfs:
            zf.writestr(fname, data)
    zip_buffer.seek(0)

    zip_name = f"{subject}_Grade{grade}_worksheets.zip"
    return zip_name, zip_buffer.getvalue()
