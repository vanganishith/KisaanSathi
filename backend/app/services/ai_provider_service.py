"""
AI Provider Abstraction Layer for KisaanSaathi Decision Engine
Supports Fireworks AI, OpenAI, Gemini, and Resilient Deterministic Heuristics.

Enforces:
1. Agricultural Guardrails: Strict separation of facts, weather, and AI inference.
2. Structured JSON response formatting.
3. Multi-lingual farmer response generation (Telugu, Hindi, English).
4. No hallucinated agricultural parameters.
"""

import json
import re
import logging
import httpx
from typing import Dict, Any, Optional, List, Tuple
from app.core.config import settings

logger = logging.getLogger("rythubandhu.ai_provider")

DECISION_SYSTEM_PROMPT = """You are the Senior Agricultural Decision Support Engine for KisaanSaathi.
Your mission is to provide precision, context-grounded recommendations for Indian smallholder farmers.

CORE SAFETY AND AGRONOMIC RULES:
1. STRICT TRUTHFULNESS: Use ONLY the provided farm context (crop, stage, age, soil, weather, irrigation history, recent activities).
2. DISTINGUISH FACTS FROM INFERENCE:
   - Weather forecast and soil measurements are contextual observations.
   - Diagnoses and action suggestions are AI recommendations with clear confidence.
3. NEVER FABRICATE:
   - DO NOT invent exact fertilizer NPK doses if soil test is absent.
   - DO NOT invent disease names or chemical quantities without evidence.
4. UNCERTAINTY & AEO ESCALATION:
   - If confidence is below 0.70 or critical symptoms are ambiguous, set "requires_aeo": true.
5. FARMER-FACING LANGUAGE:
   - Provide a direct, warm, concise explanation in the requested language (Telugu, Hindi, or English).
   - Use clear icons and practical terminology.

You must return a STRICT JSON object matching:
{
  "title": "Short descriptive title",
  "summary": "1-2 line agronomic summary",
  "farmer_response": "Conversational, simple instruction in farmer's preferred language",
  "reasoning": "Clear logical explanation linking weather, soil, and crop stage",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "confidence": 0.85,
  "factors": ["Factor 1 (e.g. Rain expected tomorrow)", "Factor 2 (e.g. Crop in Flowering stage)"],
  "actions": [
    {
      "title": "Action name",
      "description": "How to execute this action safely",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "Today / Within 48 hours",
      "icon": "💧"
    }
  ],
  "warnings": ["Caution or prerequisite"],
  "requires_aeo": false
}
"""


def _clean_json_response(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extracts and parses JSON from raw LLM output, removing any markdown code fences."""
    if not raw_text:
        return None
    
    text = raw_text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    
    # Match outermost JSON object
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        text = match.group(1)
        
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"[AIProvider] Failed to parse JSON: {raw_text[:200]}")
        return None


async def call_fireworks_chat(
    prompt: str,
    system_prompt: str = DECISION_SYSTEM_PROMPT,
    temperature: float = 0.2,
    max_tokens: int = 1500
) -> Optional[str]:
    """Calls Fireworks AI API using configured LLM model."""
    api_key = getattr(settings, "FIREWORKS_API_KEY", None)
    if not api_key:
        return None
    
    model = getattr(settings, "FIREWORKS_MODEL_NAME", "accounts/fireworks/models/glm-5p3-flash")
    url = "https://api.fireworks.ai/inference/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"}
    }
    
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"[AIProvider] Fireworks API returned status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"[AIProvider] Fireworks API call failed: {e}")
    return None


async def call_multimodal_vision(
    image_base64_list: List[str],
    prompt: str,
    system_prompt: str = DECISION_SYSTEM_PROMPT
) -> Optional[str]:
    """Calls Fireworks multimodal vision API for crop disease assessment."""
    api_key = getattr(settings, "FIREWORKS_API_KEY", None)
    if not api_key or not image_base64_list:
        return None
    
    model = getattr(settings, "FIREWORKS_MODEL_NAME", "accounts/fireworks/models/glm-5p3-flash")
    url = "https://api.fireworks.ai/inference/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    content_list = []
    for b64 in image_base64_list[:3]:  # Max 3 images
        if not b64.startswith("data:"):
            b64_clean = f"data:image/jpeg;base64,{b64}"
        else:
            b64_clean = b64
        content_list.append({
            "type": "image_url",
            "image_url": {"url": b64_clean}
        })
    content_list.append({"type": "text", "text": prompt})
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content_list}
        ],
        "temperature": 0.15,
        "max_tokens": 1500,
        "response_format": {"type": "json_object"}
    }
    
    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"[AIProvider] Vision API returned status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"[AIProvider] Vision API call failed: {e}")
    return None
