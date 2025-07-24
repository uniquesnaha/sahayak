from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import google_search

# 1️⃣ Generate English answer & analogy as JSON
answer_agent = LlmAgent(
    name="ask_sahayak_answer",
    model="gemini-2.5-pro",
    tools=[google_search],
    description="Generate English answer & analogy in a strict JSON schema",
    instruction="""
Return a JSON object exactly matching this shape (no extra text, no fences):

{
  "answer_en": "<concise answer for a grade-{grade} student>",
  "analogy_en": "<simple analogy ≤200 words>",
  "answer_local": "",
  "analogy_local": ""
}

Use the {question} and {grade} inputs. Leave the _local fields empty here.
""",
    output_key="final_json"
)

# 2️⃣ Translate those English fields into {locale}
translation_agent = LlmAgent(
    name="ask_sahayak_translate",
    model="gemini-2.5-pro",
    description="Fill in the local translations for the JSON",
    instruction="""
You have this JSON in {final_json} and a locale string {locale}.
Produce **only** a JSON object identical in shape, where:

- answer_en and analogy_en remain unchanged
- answer_local and analogy_local contain the translation of answer_en and analogy_en into {locale}

Do not output any extra text or markdown.
""",
    output_key="final_json"
)

# 3️⃣ Wire them together
root_agent = SequentialAgent(
    name="ask_sahayak_root",
    sub_agents=[answer_agent, translation_agent],
)
