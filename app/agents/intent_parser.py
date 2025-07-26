# app/agents/intent_parser.py

from google.adk.agents import LlmAgent

intent_agent = LlmAgent(
    name="intent_agent",
    model="gemini-2.5-pro",
    instruction="""
You receive a single teacher prompt. Parse it into JSON with these keys:
{
  "intent":"<one of: chat,explanation, story, quiz, lesson_plan, game, reflect>",
  "slots":{
    "grades":[ints],      // e.g. [5,6]
    "language":"<string>",// e.g. "English" if not specified explicitly
    "topic":"<string>",  
    "date":"YYYY-MM-DD"   // current date if not specified, or calculate date if specified as 'yesterday', 'tomorrow', etc.
  }
}
Chat: Simple chat for interacting with common user questions
Explanation: Any explicit questions or explanation about something specific
Story: Any story or narrative that the teacher wants to share or ask for.
Quiz: Any quiz or question-answer format that the teacher wants to create.  
Lesson Plan: Any lesson plan or structured teaching plan that the teacher wants to create.
Game: Any game or interactive activity that the teacher wants to create.
Reflect: Any reflection or feedback that the teacher wants about their teaching , to improve.
Only output the JSON object, no extra text.
""",
    output_key="intent_json"
)
