# app/agents/worksheet_builder.py

from google.adk.agents import LlmAgent

worksheet_agent = LlmAgent(
    name="worksheet_agent",
    model="gemini-2.5-pro",
    instruction="""
Inputs available in context.state:
  pages    : list[string]    // OCR’d text of each uploaded page
  grade    : integer         // e.g. 5
  locale   : string          // e.g. tamil or none if english (just for language not context)

TASK:
  • From 'pages', create three worksheets:
      1) remedial
      2) core
      3) enrichment
  • For each worksheet:
      – Generate exactly 5 questions.
      – Provide their answers.
  • Return a single JSON object, no extra text, exactly matching this shape:

{
  "worksheets": [
    {
      "level": "remedial",
      "questions_en":[ "...", "...", "...", "...", "..." ],
      "questions_local":[ "...", "...", "...", "...", "..." ],
      "answers_en":[ "...", "...", "...", "...", "..." ],
      "answers_local":[ "...", "...", "...", "...", "..." ]
    },
    {
      "level": "core",
      "questions_en":[ ... ],
      "questions_local":[ ... ],
      "answers_en":[ ... ],
      "answers_local":[ ... ]
    },
    {
      "level": "enrichment",
      "questions_en":[ ... ],
      "questions_local":[ ... ],
      "answers_en":[ ... ],
      "answers_local":[ ... ]
    }
  ]
}

RULES:
  • Use ONLY the content in 'pages'—do NOT invent unrelated facts.
  • If locale is empty (""), set each *local array* to [].
  • Output *only* the JSON object—no markdown, no code fences.
""",
    output_key="worksheet_json"
)
