# app/agents/ask_sahayak.py

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import google_search
from .calendar_tool import manage_lesson_event

chat_agent = LlmAgent(
    name="chat_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}

TASK:
You are a conversational teaching assistant.  The teacher may ask follow-up or clarification
questions based on prior exchange.  Use only the previous messages in history to answer naturally.
Write a helpful, concise reply.  Output only the reply text.
""",
    output_key="chat_text"
)


# ─── Explanation Agent ───────────────────────────────────────────────────────────
explanation_agent = LlmAgent(
    name="explanation_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- grades: list of ints
- language: string
- topic: string

TASK:
Provide a clear, grade-appropriate explanation for "{topic}" to grades {grades}.
Refer to previous messages in history when relevant.
Write in {language} if non-empty; otherwise English.
Output only the explanation text.
""",
    output_key="explanation_text"
)

# ─── Story Agent ─────────────────────────────────────────────────────────────────
story_agent = LlmAgent(
    name="story_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- grades: list of ints
- language: string
- topic: string

TASK:
Generate a ~200-word story about "{topic}" suitable for grades {grades}.
Refer to history if you need to tie back to earlier context.
Write in {language} if non-empty; otherwise English.
Output only the story text.
""",
    output_key="story_text"
)

# ─── Quiz Agent ──────────────────────────────────────────────────────────────────
quiz_agent = LlmAgent(
    name="quiz_agent",
    model="gemini-2.5-pro",
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- grades: list of ints
- language: string
- topic: string

TASK:
Create 3 multiple-choice questions (A–D) testing "{topic}" for grades {grades}.
Use history if you need to recall previous topics.
Write in {language} if non-empty; otherwise English.
Output plain text:
1. Q… 
   A) …
   B) …
   C) …
   D) … 
   Answer: B
…repeat for 3 questions.
""",
    output_key="quiz_text"
)

# ─── Lesson Plan Agent ───────────────────────────────────────────────────────────
lesson_plan_agent = LlmAgent(
    name="lesson_plan_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- grades: list of ints
- language: string
- topic: string
- date: string (YYYY-MM-DD)

TASK:
Draft a 20–30 minute lesson outline on "{topic}" for grades {grades}.
Sections: Objectives, Materials, Introduction (5m), Activity (15m), Assessment (5m), Wrap-Up (5m).
Refer to history if you need to re-use previous materials.
Write in {language} if non-empty; otherwise English.
Output only the outline text.
""",
    output_key="lesson_text"
)

# ─── Calendar Agent ──────────────────────────────────────────────────────────────
calendar_agent = LlmAgent(
    name="calendar_agent",
    model="gemini-2.5-pro",
    tools=[manage_lesson_event],  # ADK auto-wraps as a Function Tool
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- topic: string
- grades: list of ints
- date: string (YYYY-MM-DD)
- lesson_text: string

TASK:
Call manage_lesson_event(date, topic,
    description="Lesson for grades {grades} on {topic}",
    attachment_content=lesson_text)
Parse the returned dict and output ONLY the "message" field.
""",
    output_key="cal_text"
)

# ─── Game Agent ─────────────────────────────────────────────────────────────────
game_agent = LlmAgent(
    name="game_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- grades: list of ints
- language: string
- topic: string

TASK:
Suggest an interactive {language or 'English'} game for grades {grades} about "{topic}".
Include materials needed, rules, and example dialogue.
Refer to history to build on prior games if needed.
Output only the game description.
""",
    output_key="game_text"
)

# ─── Reflect Agent ──────────────────────────────────────────────────────────────
reflect_agent = LlmAgent(
    name="reflect_agent",
    model="gemini-2.5-pro",
    tools=[google_search],
    instruction="""
Inputs in context.state:
- history: list of {sender,text}
- reflection: string

TASK:
Analyze the teacher’s reflection: "{reflection}".
Provide 4–6 bullet-point strategies to improve understanding next time.
Refer to history if you need context on what was taught.
Output only the bullet list.
""",
    output_key="reflect_text"
)

# ─── Compose Workflows with SequentialAgent ─────────────────────────────────────
ask_explanation_seq = SequentialAgent(
    name="ask_explanation_seq",
    sub_agents=[explanation_agent]
)
ask_story_seq = SequentialAgent(
    name="ask_story_seq",
    sub_agents=[story_agent]
)
ask_quiz_seq = SequentialAgent(
    name="ask_quiz_seq",
    sub_agents=[quiz_agent]
)
ask_lesson_seq = SequentialAgent(
    name="ask_lesson_seq",
    sub_agents=[lesson_plan_agent, calendar_agent]
)
ask_game_seq = SequentialAgent(
    name="ask_game_seq",
    sub_agents=[game_agent]
)
ask_reflect_seq = SequentialAgent(
    name="ask_reflect_seq",
    sub_agents=[reflect_agent]
)
ask_chat_seq        = SequentialAgent(name="ask_chat_seq",        sub_agents=[chat_agent])
