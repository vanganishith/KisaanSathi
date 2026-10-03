"""
Text-to-Speech (TTS) Service Abstraction for KisaanSaathi (Phase 12)
Provides clean multi-provider audio synthesis supporting Telugu, Hindi, and English.
"""

import logging
import io
import base64
from typing import Dict, Any, Optional

logger = logging.getLogger("rythubandhu.tts")


class TTSService:
    """TTS Service Abstraction for farmer-facing audio playback."""

    @staticmethod
    def get_language_code(lang: str) -> str:
        if "te" in lang.lower():
            return "te"
        if "hi" in lang.lower():
            return "hi"
        return "en"

    @classmethod
    async def synthesize_speech(
        cls,
        text: str,
        language: str = "te"
    ) -> Dict[str, Any]:
        """
        Synthesizes spoken agricultural advice into audio bytes / base64 data.
        Falls back gracefully if network is unavailable.
        """
        if not text or not text.strip():
            return {"success": False, "error": "Empty text for speech synthesis."}

        clean_lang = cls.get_language_code(language)
        
        try:
            from gtts import gTTS
            tts = gTTS(text=text.strip(), lang=clean_lang, slow=False)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            b64_audio = base64.b64encode(mp3_fp.read()).decode("utf-8")
            
            return {
                "success": True,
                "audio_base64": f"data:audio/mp3;base64,{b64_audio}",
                "text": text,
                "language": clean_lang
            }
        except Exception as e:
            logger.warning(f"[TTSService] gTTS synthesis fallback note: {e}")
            return {
                "success": True,
                "audio_base64": None,
                "text": text,
                "language": clean_lang,
                "client_speech_synthesis": True
            }
