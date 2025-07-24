# app/agents/ask_sahayak.py

from google.adk.agents import LlmAgent
from google.adk.tools import google_search

# ──────────────────────────────────────────────────────────────────────────────
# 1️⃣  Main answer generator (handles greetings & questions, bilingual JSON)
answer_agent = LlmAgent(
    name="answer_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
You are a friendly multilingual teaching assistant.
You MUST output exactly one JSON object, with these two fields and no extra text:

{
  "answer_en":"…",      // your English reply or answer
  "answer_local":"…"     // the same reply translated into {locale}, or "" if no locale
}

RULES:
1. If the user’s input is a greeting or small talk (e.g. "hi", "hello"), put a casual reply in answer_en.
2. Otherwise treat the input as a question:
   • Answer in clear English at a grade-{grade} level.
3. If {locale} is non-empty, translate answer_en into that locale and place it in answer_local.
   Otherwise answer_local must be an empty string.
4. Do NOT output anything except the JSON object—no code fences, no plain text.

Inputs available in context.state:
• question (string)
• grade (integer)
• locale (string)
""",
    output_key="answer_json"
)

# ──────────────────────────────────────────────────────────────────────────────
# 2️⃣  Analogy generator (bilingual JSON)
analogy_agent = LlmAgent(
    name="analogy_agent",
    model="gemini-2.5-pro",
    instruction="""
Inputs available in context.state:
  answer_en (string)
  answer_local (string)
  grade (integer)
  locale (string)

TASK:
  • Generate a single analogy (≤200 words) that clarifies answer_en for a grade-{grade} student.
  • Return a JSON object only, no extra text, in this shape:

{
  "analogy_en":"…",       // analogy in English
  "analogy_local":"…"     // the same analogy in {locale}, or "" if no locale
}
""",
    output_key="analogy_json"
)

# ──────────────────────────────────────────────────────────────────────────────
# 3️⃣  Story generator (bilingual JSON)
story_agent = LlmAgent(
    name="story_agent",
    model="gemini-2.5-pro",
    instruction="""
Inputs available in context.state:
  answer_en (string)
  answer_local (string)
  grade (integer)
  locale (string)

TASK:
  • Write an engaging story (≤250 words) that illustrates the concept in answer_en for grade-{grade}.
  • Return only this JSON object:

{
  "story_en":"…",        // story in English
  "story_local":"…"      // same story in {locale}, or "" if no locale
}
""",
    output_key="story_json"
)

# ──────────────────────────────────────────────────────────────────────────────
# 4️⃣  Quiz generator (bilingual JSON, locked to answer_en)
quiz_agent = LlmAgent(
    name="quiz_agent",
    model="gemini-2.5-pro",
    instruction="""
Inputs available in context.state:
  answer_en (string)
  grade (integer)
  locale (string)

TASK:
  • Generate exactly 3 multiple-choice questions (options A–D) that directly test comprehension of answer_en.
  • Provide them in English under the key quiz_en.
  • If locale is non-empty, translate each question & each option into that locale under quiz_local.
  • Output only this JSON—no extra text:

{
  "quiz_en":[
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"B"},
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"A"},
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"D"}
  ],
  "quiz_local":[
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"B"},
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"A"},
    {"q":"…","A":"…","B":"…","C":"…","D":"…","answer":"D"}
  ]
}

RULES:
  • Use only the content of answer_en—do not introduce new facts.
  • If locale is empty, set "quiz_local": [].
""",
    output_key="quiz_json"
)
