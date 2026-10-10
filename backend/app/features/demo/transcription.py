"""Transcrição local de gravações da demonstração."""

from functools import lru_cache
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any


@lru_cache(maxsize=1)
def _model(model_path: str) -> Any:
    from faster_whisper import WhisperModel

    return WhisperModel(model_path, device="cpu", compute_type="int8")


def transcribe_media(contents: bytes, suffix: str, model_path: str) -> str:
    """Decodifica áudio de vídeo/áudio e transcreve em português."""
    import av

    with NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
        temporary.write(contents)
        path = Path(temporary.name)
    try:
        try:
            with av.open(str(path)) as container:
                if not container.streams.audio:
                    raise ValueError("O arquivo não contém uma faixa de áudio.")
                if container.duration and container.duration > 30 * 60 * av.time_base:
                    raise ValueError("A gravação deve ter no máximo 30 minutos.")
        except av.FFmpegError as exc:
            raise ValueError("Formato de mídia inválido ou arquivo corrompido.") from exc

        segments, _ = _model(model_path).transcribe(
            str(path), language="pt", beam_size=3, vad_filter=True
        )
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
        if not transcript:
            raise ValueError("Não foi possível identificar fala na gravação.")
        return transcript
    finally:
        path.unlink(missing_ok=True)
