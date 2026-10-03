"""
Central AI Orchestration Layer for KisaanSaathi
Provides unified, safety-governed AI dispatch across:
- IntentEngine
- CompletenessEngine
- VisionEngine (Dual-layer: YOLO11 visual localization + Multimodal Reasoning)
- DecisionEngine
- RiskEngine (Strict separation of Model Confidence, Evidence Quality, Severity)
- TranslationEngine
- ExplanationEngine
- AI Evidence Contract enforcement
"""

import logging
import uuid
import re
import hashlib
from typing import Dict, Any, Optional, List, Tuple, Union
from datetime import datetime, timezone

from app.services.context_engine_service import get_farm_context
from app.services.ai_provider_service import call_fireworks_chat, call_multimodal_vision, _clean_json_response
from app.services.irrigation_service import get_irrigation_recommendation
from app.services.fertilizer_service import get_fertilizer_recommendation
from app.services.crop_knowledge_base import get_crop_knowledge
from app.services.crop_lifecycle_service import determine_crop_stage
from app.services.image_gate_service import (
    evaluate_image_usability,
    evaluate_agricultural_relevance,
    run_image_safety_gates,
    safe_decode_image
)

logger = logging.getLogger("rythubandhu.ai_orchestrator")


# ==============================================================================
# 1. AI EVIDENCE CONTRACT MODEL
# ==============================================================================

class AIEvidenceContract:
    """
    Standardized Agricultural AI Output Contract:
    Ensures all AI diagnostics adhere to a uniform, verifiable schema with
    separate model confidence, evidence quality, and severity scores.
    """
    @staticmethod
    def create(
        observation: str,
        possible_condition: str,
        evidence: List[str],
        confidence: float,
        severity: float,
        evidence_quality: str,
        uncertainties: List[str],
        recommended_next_action: str,
        requires_aeo_review: bool = True,
        visual_detections: Optional[List[Dict[str, Any]]] = None,
        context_summary: Optional[Dict[str, Any]] = None,
        model_name: str = "f4m1/plant-disease-detector-12 + Qwen2.5-VL",
        model_version: str = "1.0.0"
    ) -> Dict[str, Any]:
        # Clamp scores
        conf = max(0.0, min(1.0, float(confidence)))
        sev = max(0.0, min(1.0, float(severity)))
        
        # Valid quality tiers: HIGH, MEDIUM, LOW, DEGRADED
        eq = evidence_quality.upper()
        if eq not in ["HIGH", "MEDIUM", "LOW", "DEGRADED"]:
            eq = "MEDIUM"

        return {
            "observation": observation.strip(),
            "possible_condition": possible_condition.strip(),
            "evidence": evidence or [],
            "confidence": round(conf, 3),              # Confidence in model interpretation
            "severity": round(sev, 3),                  # Potential agricultural impact
            "evidence_quality": eq,                     # Quality of image/audio/context
            "uncertainties": uncertainties or [],
            "recommended_next_action": recommended_next_action.strip(),
            "requires_aeo_review": bool(requires_aeo_review or conf < 0.80),
            "visual_detections": visual_detections or [],
            "context_summary": context_summary or {},
            "model_metadata": {
                "model_name": model_name,
                "model_version": model_version,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }


# ==============================================================================
# 2. INTENT ENGINE
# ==============================================================================

class IntentEngine:
    """Classifies user natural language and voice queries into canonical agricultural intents."""

    @staticmethod
    def classify(query: Optional[str]) -> str:
        if not query:
            return "GENERAL_CROP_ADVICE"
        q = query.lower().strip()
        
        if any(k in q for k in ["ఎందుకు", "కారణం", "why", "reason", "explain", "kyu"]):
            return "FOLLOW_UP_EXPLANATION"
        if any(k in q for k in ["చుట్టుపక్కల", "కమ్యూనిటీ", "ఇతర రైతులు", "nearby", "community", "outbreak"]):
            return "COMMUNITY_SIGNALS"
        if any(k in q for k in ["నీళ్లు", "నీరు", "తడి", "irrigate", "irrigation", "water", "సిరింపు", "पानी", "सिंचाई"]):
            return "IRRIGATION"
        if any(k in q for k in ["ఎరువు", "యూరియా", "fertilizer", "nutrient", "urea", "dap", "potash", "खाद"]):
            return "FERTILIZER"
        if any(k in q for k in ["పురుగు", "తెగులు", "మచ్చ", "ముడుత", "ఆకులు", "disease", "pest", "health", "symptom", "కీటక", "रोग", "कीट", "पत्ती"]):
            return "CROP_HEALTH"
        if any(k in q for k in ["వర్షం", "ఎండ", "గాలి", "weather", "rain", "temperature", "forecast", "मौसम", "बारिश"]):
            return "WEATHER_RISK"
        if any(k in q for k in ["కోత", "దిగుబడి", "harvest", "yield", "కటింగ్", "कटाई"]):
            return "HARVEST_PLANNING"

        return "GENERAL_CROP_ADVICE"


# ==============================================================================
# 3. COMPLETENESS ENGINE (Gating & Progressive Clarification)
# ==============================================================================

class CompletenessEngine:
    """
    Evaluates whether the user's inquiry has sufficient context to perform
    reliable agricultural assessment. Prevents premature photo diagnostics
    when mandatory crop or symptom info is missing.
    """

    KNOWN_INDIAN_CROPS = [
        "Chilli", "Paddy", "Cotton", "Tomato", "Maize",
        "Red Gram", "Bengal Gram", "Groundnut", "Turmeric", "Onion"
    ]

    @classmethod
    def evaluate_inquiry(
        cls,
        text: Optional[str],
        known_crop: Optional[str] = None,
        has_images: bool = False,
        language: str = "te"
    ) -> Dict[str, Any]:
        raw = (text or "").strip()
        missing_fields = []
        
        # 1. Check Crop
        detected_crop = known_crop
        if not detected_crop and raw:
            for c in cls.KNOWN_INDIAN_CROPS:
                if c.lower() in raw.lower():
                    detected_crop = c
                    break
            # Indic keywords
            if "మిరప" in raw or "mirchi" in raw.lower():
                detected_crop = "Chilli"
            elif "వరి" in raw or "paddy" in raw.lower() or "rice" in raw.lower():
                detected_crop = "Paddy"
            elif "పత్తి" in raw or "cotton" in raw.lower():
                detected_crop = "Cotton"
            elif "టమాటా" in raw or "tomato" in raw.lower():
                detected_crop = "Tomato"

        if not detected_crop:
            missing_fields.append("crop")

        # 2. Check Symptoms / Query substance
        has_symptoms = len(raw) >= 4 or has_images
        if not has_symptoms and not has_images:
            missing_fields.append("symptoms")

        is_complete = len(missing_fields) == 0

        # Formulate progressive prompts and one-tap chips
        prompt_question = None
        suggested_chips = []
        
        if "crop" in missing_fields:
            if "te" in language:
                prompt_question = "మీ పొలంలో ఏ పంట వేశారు? (ఉదాహరణకు: మిరప, వరి, పత్తి)"
                suggested_chips = ["మిరప (Chilli)", "వరి (Paddy)", "పత్తి (Cotton)", "టమాటా (Tomato)"]
            elif "hi" in language:
                prompt_question = "आपके खेत में कौन सी फसल है? (जैसे: मिर्च, धान, कपास)"
                suggested_chips = ["मिर्च (Chilli)", "धान (Paddy)", "कपास (Cotton)", "टमाटर (Tomato)"]
            else:
                prompt_question = "Which crop are you cultivating? (e.g. Chilli, Paddy, Cotton)"
                suggested_chips = ["Chilli", "Paddy", "Cotton", "Tomato"]

        return {
            "is_complete": is_complete,
            "missing_fields": missing_fields,
            "detected_crop": detected_crop,
            "prompt_question": prompt_question,
            "suggested_chips": suggested_chips,
            "workflow_unlocked": is_complete
        }


# ==============================================================================
# 4. VISION ENGINE (Dual-Layer: YOLO11 + Multimodal Reasoning)
# ==============================================================================

class VisionEngine:
    """
    Orchestrates Dual-Layer visual analysis:
    Layer 1: Visual Localization via fine-tuned YOLO11 ONNX (f4m1/plant-disease-detector-12)
    Layer 2: Multimodal Reasoning via Qwen2.5-VL / Gemini
    Layer 3: Evidence Fusion
    """

    @classmethod
    async def analyze_visual_evidence(
        cls,
        image_data_list: List[Any],
        crop_name: str,
        context: Dict[str, Any],
        farmer_transcript: Optional[str] = None,
        language: str = "te"
    ) -> Dict[str, Any]:
        # 1. Quality & Usability Gating
        valid_images = []
        overall_quality = "HIGH"
        quality_issues = []

        for idx, img in enumerate(image_data_list[:3]):
            raw_bytes = None
            if isinstance(img, bytes):
                raw_bytes = img
            elif isinstance(img, str):
                import base64
                clean_b64 = img
                if "base64," in clean_b64:
                    clean_b64 = clean_b64.split("base64,")[1]
                try:
                    raw_bytes = base64.b64decode(clean_b64)
                except Exception:
                    raw_bytes = None

            if not raw_bytes:
                quality_issues.append(f"Image {idx+1} could not be decoded.")
                overall_quality = "DEGRADED"
                continue

            decoded_img, err = safe_decode_image(raw_bytes)
            if not decoded_img:
                quality_issues.append(f"Image {idx+1} could not be decoded: {err}.")
                overall_quality = "DEGRADED"
                continue

            usability = evaluate_image_usability(decoded_img)
            if not usability["usable"]:
                quality_issues.append(f"Image {idx+1} rejected: {usability['reason']}.")
                overall_quality = "DEGRADED" if overall_quality == "HIGH" else overall_quality
                continue

            relevance = evaluate_agricultural_relevance(decoded_img)
            if not relevance["relevant"]:
                quality_issues.append(f"Image {idx+1} is non-agricultural ({relevance.get('reason')}).")
                overall_quality = "LOW"
                continue

            valid_images.append(decoded_img)


        if not valid_images:
            return AIEvidenceContract.create(
                observation="No clear or agriculturally relevant leaf images could be verified.",
                possible_condition="Assessment Pending Clear Images",
                evidence=["Uploaded media was blurry, dark, or not recognizable as crop foliage."],
                confidence=0.15,
                severity=0.10,
                evidence_quality="DEGRADED",
                uncertainties=quality_issues or ["Please take a clear close-up of the leaf in natural daylight."],
                recommended_next_action="Retake clear photograph of the upper and lower leaf surface.",
                requires_aeo_review=True,
                context_summary={"crop": crop_name}
            )

        # 2. Visual Localization (YOLO Local Detector)
        yolo_detections = []
        try:
            from app.services.vision_service import run_onnx_inference
            for v_img in valid_images:
                dets = run_onnx_inference(v_img)
                if dets:
                    yolo_detections.extend(dets)
        except Exception as e:
            logger.info(f"[VisionEngine] YOLO localization fallback notice: {e}")

        # 3. Multimodal Reasoning (Grounding Context + Visuals)
        weather = context.get("weather") or {}
        soil = context.get("soil") or {}
        comm_signals = context.get("communitySignals") or []

        weather_snippet = f"Temp: {weather.get('temperature_c', 'N/A')}°C, Rain 24h: {weather.get('rain_mm', 0)}mm, Humidity: {weather.get('relative_humidity_pct', 'N/A')}%"
        stage_info = context.get("cropStage", {}).get("current_stage", "Flowering")

        prompt = f"""Assess this crop health condition using multimodal evidence:
Crop: {crop_name}
Current Stage: {stage_info}
Farmer Complaint: {farmer_transcript or 'Observed leaf discoloration and curling.'}
Weather Context: {weather_snippet}
Soil Type: {soil.get('soil_type', 'Red soil')}
Nearby Outbreak Signals: {len(comm_signals)} nearby reports
Visual Bounding Boxes Detected: {len(yolo_detections)}

Apply strict agronomic rules. Do not invent exact disease certainty.
Use probabilistic terminology ('may be consistent with', 'observed pattern').
"""
        # Call provider or rule fallback
        raw_response = None
        # Attempt multimodal call if base64 images available
        b64_list = [img for img in image_data_list if isinstance(img, str) and (img.startswith("data:") or len(img) > 100)]
        if b64_list:
            raw_response = await call_multimodal_vision(b64_list, prompt)

        parsed = _clean_json_response(raw_response) if raw_response else None

        if parsed:
            obs = parsed.get("summary") or parsed.get("farmer_response") or "Visual leaf symptoms detected."
            cond = parsed.get("title") or f"{crop_name} Symptom Pattern"
            conf = float(parsed.get("confidence", 0.82))
            sev = 0.70 if parsed.get("priority") in ["HIGH", "URGENT"] else 0.40
            actions = parsed.get("actions", [])
            next_action = actions[0].get("description") if actions else "Schedule field inspection."
            reasons = parsed.get("factors", [])
        else:
            # Deterministic evidence fusion fallback
            obs = f"Observed discoloration and leaf pattern on {crop_name} in {stage_info} stage."
            cond = f"Possible {crop_name} Foliar Stress / Leaf Pattern"
            conf = 0.78 if len(yolo_detections) > 0 else 0.65
            sev = 0.50
            next_action = "Inspect underside of leaves for thrips or mites; consult local AEO if spots spread."
            reasons = [
                f"Crop in {stage_info} stage",
                f"Weather conditions: {weather_snippet}"
            ]
            if comm_signals:
                reasons.append(f"Similar symptoms noted in nearby village clusters.")

        return AIEvidenceContract.create(
            observation=obs,
            possible_condition=cond,
            evidence=reasons,
            confidence=conf,
            severity=sev,
            evidence_quality=overall_quality,
            uncertainties=["Preliminary AI assessment. Requires physical field confirmation by village AEO."],
            recommended_next_action=next_action,
            requires_aeo_review=True,
            visual_detections=yolo_detections,
            context_summary={
                "crop": crop_name,
                "stage": stage_info,
                "weather": weather_snippet
            }
        )


# ==============================================================================
# 5. RISK ENGINE (Severity vs Confidence vs Evidence Quality)
# ==============================================================================

class RiskEngine:
    """
    Computes composite agricultural risk without conflating:
    - Model Confidence (how certain the model is)
    - Evidence Quality (how clear the submitted data was)
    - Agricultural Severity (how damaging the condition is to crop yield)
    """

    @staticmethod
    def calculate_priority(
        severity: float,
        confidence: float,
        evidence_quality: str,
        is_community_outbreak: bool = False,
        is_sensitive_crop_stage: bool = False
    ) -> Tuple[str, List[str]]:
        reasons = []
        score = severity * 0.5 + (0.3 if is_community_outbreak else 0.0) + (0.2 if is_sensitive_crop_stage else 0.0)
        
        if evidence_quality in ["LOW", "DEGRADED"]:
            reasons.append("Evidence quality is low or degraded; proceeding cautiously.")
            
        if severity >= 0.75:
            reasons.append(f"High potential crop damage severity ({round(severity*100)}%).")
        if is_community_outbreak:
            reasons.append("Active pest/disease cluster detected within 10 km.")
        if is_sensitive_crop_stage:
            reasons.append("Crop is in flowering/fruiting stage where yield loss risk is highest.")

        if score >= 0.70:
            return "CRITICAL" if score >= 0.85 else "HIGH", reasons
        elif score >= 0.40:
            return "MEDIUM", reasons
        return "LOW", reasons


# ==============================================================================
# 6. TRANSLATION & EXPLANATION ENGINE
# ==============================================================================

class ExplanationEngine:
    """Provides transparent, human-readable rationale linking decisions directly to farm facts."""

    @staticmethod
    def format_farmer_explanation(
        intent: str,
        decision_summary: str,
        factors: List[str],
        language: str = "te"
    ) -> str:
        if "te" in language:
            hdr = "🌾 నిర్ణయం ఆధారాలు:"
            factor_lines = "\n".join([f"• {f}" for f in factors])
            return f"{decision_summary}\n\n{hdr}\n{factor_lines}"
        elif "hi" in language:
            hdr = "🌾 निर्णय के कारण:"
            factor_lines = "\n".join([f"• {f}" for f in factors])
            return f"{decision_summary}\n\n{hdr}\n{factor_lines}"
        else:
            hdr = "🌾 Decision Rationale:"
            factor_lines = "\n".join([f"• {f}" for f in factors])
            return f"{decision_summary}\n\n{hdr}\n{factor_lines}"


# ==============================================================================
# 7. CENTRAL AI ORCHESTRATOR
# ==============================================================================

class AIOrchestrator:
    """
    Central Master Orchestrator coordinating Intent, Completeness Gating,
    Dual-Layer Vision, Decision Reasoning, Risk Ranking, and Safety Verification.
    """

    def __init__(self):
        self.intent_engine = IntentEngine()
        self.completeness_engine = CompletenessEngine()
        self.vision_engine = VisionEngine()
        self.risk_engine = RiskEngine()
        self.explanation_engine = ExplanationEngine()

    async def orchestrate_decision(
        self,
        query: Optional[str] = None,
        crop: Optional[str] = None,
        farmer_phone: Optional[str] = None,
        field_id: Optional[str] = None,
        images: Optional[List[Any]] = None,
        language: str = "te"
    ) -> Dict[str, Any]:
        """
        Main entry point for intelligent agricultural reasoning:
        1. Classifies intent
        2. Gating: verifies completeness
        3. Retrieves unified context
        4. Executes domain or vision engine
        5. Computes multi-dimensional risk
        6. Enforces AI Evidence Contract
        """
        intent = self.intent_engine.classify(query)

        # 1. Gating
        gating = self.completeness_engine.evaluate_inquiry(
            text=query,
            known_crop=crop,
            has_images=bool(images and len(images) > 0),
            language=language
        )

        if not gating["is_complete"] and not images:
            return {
                "success": True,
                "workflow_status": "NEEDS_CLARIFICATION",
                "intent": intent,
                "missing_fields": gating["missing_fields"],
                "farmer_response": gating["prompt_question"],
                "suggested_chips": gating["suggested_chips"],
                "contract": AIEvidenceContract.create(
                    observation="Inquiry incomplete; awaiting mandatory crop parameter.",
                    possible_condition="Awaiting Crop Input",
                    evidence=["Farmer inquiry did not specify crop type."],
                    confidence=1.0,
                    severity=0.0,
                    evidence_quality="MEDIUM",
                    uncertainties=["Crop name is required before agricultural calculations can be computed."],
                    recommended_next_action="Select or speak the crop name.",
                    requires_aeo_review=False
                )
            }

        resolved_crop = gating.get("detected_crop") or crop or "Chilli"

        # 2. Context
        context = await get_farm_context(
            farmer_phone=farmer_phone,
            field_id=field_id
        )

        # 3. Vision or Decision Engine
        if images and len(images) > 0:
            evidence_result = await self.vision_engine.analyze_visual_evidence(
                image_data_list=images,
                crop_name=resolved_crop,
                context=context,
                farmer_transcript=query,
                language=language
            )
            return {
                "success": True,
                "workflow_status": "COMPLETED",
                "intent": "CROP_HEALTH",
                "crop": resolved_crop,
                "contract": evidence_result,
                "farmer_response": evidence_result["observation"]
            }

        # 4. Irrigation or Fertilizer or General Decision
        if intent == "IRRIGATION":
            irr = await get_irrigation_recommendation(
                farmer_phone=farmer_phone,
                field_id=field_id,
                language=language
            )
            evidence_result = AIEvidenceContract.create(
                observation=irr.get("summary", "Irrigation evaluation completed."),
                possible_condition=f"Irrigation Decision: {irr.get('decision')}",
                evidence=irr.get("factors", []),
                confidence=irr.get("confidence", 0.90),
                severity=0.30 if irr.get("decision") == "DEFER" else 0.60,
                evidence_quality="HIGH" if context.get("weather", {}).get("available") else "MEDIUM",
                uncertainties=[] if context.get("weather", {}).get("available") else ["Live local weather was estimated from regional station."],
                recommended_next_action=irr.get("next_action") or "Follow indicated watering schedule.",
                requires_aeo_review=False,
                context_summary={"crop": resolved_crop, "weather": context.get("weather")}
            )
            return {
                "success": True,
                "workflow_status": "COMPLETED",
                "intent": "IRRIGATION",
                "crop": resolved_crop,
                "contract": evidence_result,
                "farmer_response": irr.get("farmer_response", "")
            }

        # General Decision Engine
        from app.services.ai_decision_engine_service import generate_farm_recommendation
        rec = await generate_farm_recommendation(
            farmer_phone=farmer_phone,
            field_id=field_id,
            intent=intent,
            user_question=query,
            language=language
        )
        rec_data = rec.get("recommendation") or {}

        evidence_result = AIEvidenceContract.create(
            observation=rec_data.get("summary", "General farm advisory evaluated."),
            possible_condition=rec_data.get("title", "Farm Recommendation"),
            evidence=rec_data.get("factors", []),
            confidence=rec_data.get("confidence", 0.85),
            severity=0.70 if rec_data.get("priority") in ["HIGH", "URGENT"] else 0.40,
            evidence_quality="HIGH",
            uncertainties=[],
            recommended_next_action=rec_data.get("actions", [{}])[0].get("description", "Review recommendations."),
            requires_aeo_review=rec_data.get("requires_aeo", False),
            context_summary={"crop": resolved_crop}
        )

        return {
            "success": True,
            "workflow_status": "COMPLETED",
            "intent": intent,
            "crop": resolved_crop,
            "contract": evidence_result,
            "farmer_response": rec.get("farmer_response", "")
        }


# Singleton instance
ai_orchestrator = AIOrchestrator()
