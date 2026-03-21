"""LangGraph single-node workflow: capture text → Claude API → PersonaResult JSON."""

from __future__ import annotations

import json
import os
from typing import TypedDict

from anthropic import Anthropic
from langgraph.graph import END, StateGraph

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-opus-4-6"


class PersonaState(TypedDict):
    interview: dict
    result: dict | None
    error: str | None


def extract_values(state: PersonaState) -> PersonaState:
    interview = state["interview"]
    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""You are a persona analyst. Based on the interview answers below, extract the user's core persona.

Interview:
- Self summary: {interview.get("selfSummary", "")}
- Core values: {interview.get("coreValues", "")}
- Speaking style: {interview.get("speakingStyle", "")}
- Keywords: {interview.get("keywords", "")}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{{
  "archetype": "<one archetype title, e.g. 'The Quiet Architect'>",
  "top3_values": ["<value 1>", "<value 2>", "<value 3>"],
  "one_liner": "<one sentence that captures this person's essence>"
}}"""

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        result = json.loads(raw)
        return {"result": result, "error": None}
    except Exception as exc:  # noqa: BLE001
        return {"result": None, "error": str(exc)}


workflow = StateGraph(PersonaState)
workflow.add_node("extract_values", extract_values)
workflow.set_entry_point("extract_values")
workflow.add_edge("extract_values", END)

graph = workflow.compile()
