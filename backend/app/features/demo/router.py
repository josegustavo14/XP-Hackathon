"""API demonstrativa persistida; só é montada com AUTH_MODE=mock."""
import json
import os
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from starlette.responses import Response

from app.core.config import get_settings
from app.core.database import get_db_session
from app.features.auth.dependencies import CurrentUser
from app.features.demo.transcription import transcribe_media

router = APIRouter(tags=["demo"])
Session = Annotated[AsyncSession, Depends(get_db_session)]
MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
TEXT_EXTENSIONS = {".txt", ".md", ".pdf"}
MEDIA_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac", ".mp4", ".mov", ".webm"}
CONTENT_TYPES = {
    ".txt": "text/plain", ".md": "text/markdown", ".pdf": "application/pdf", ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".aac": "audio/aac", ".flac": "audio/flac",
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
}


class InteractionIn(BaseModel):
    channel: str
    summary: str = Field(min_length=1)
    next_step: str | None = None
    occurred_at: datetime | None = None


class ChatIn(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1)
    client_id: str | None = None


async def load(session: AsyncSession, key: str) -> Any:
    value = await session.scalar(text("select payload from demo_resources where resource_key=:key"), {"key": key})
    if value is None:
        raise HTTPException(503, "Seed demonstrativo indisponível. Suba o compose.demo.yml.")
    return value


@router.get("/dashboard/summary")
async def dashboard(session: Session): return await load(session, "dashboard")


@router.get("/clients")
async def clients(session: Session, search: str | None = None, risk_profile: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100)):
    items = await load(session, "clients")
    if search: items = [item for item in items if search.casefold() in item["name"].casefold()]
    if risk_profile: items = [item for item in items if item["risk_profile"] == risk_profile]
    total = len(items); start = (page - 1) * page_size
    return {"items": items[start:start + page_size], "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}}


@router.get("/clients/{client_id}")
async def detail(client_id: str, session: Session):
    data = await load(session, "details")
    if client_id not in data: raise HTTPException(404, "Cliente não encontrado.")
    return data[client_id]


@router.get("/clients/{client_id}/portfolio")
async def portfolio(client_id: str, session: Session):
    data = await load(session, "portfolios")
    if client_id not in data: raise HTTPException(404, "Carteira não encontrada.")
    return data[client_id]


@router.get("/clients/{client_id}/interactions")
async def interactions(client_id: str, session: Session):
    await _client(session, client_id)
    values = await session.scalars(text("select payload from demo_interactions where client_id=:id order by occurred_at desc"), {"id": client_id})
    return {"items": list(values)}


async def _client(session: AsyncSession, client_id: str) -> dict[str, Any]:
    client = next((item for item in await load(session, "clients") if item["id"] == client_id), None)
    if client is None:
        raise HTTPException(404, "Cliente não encontrado.")
    return client


def extract_pdf_text(contents: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(contents))
        if reader.is_encrypted:
            raise ValueError("PDF protegido por senha não é suportado.")
        if len(reader.pages) > 100:
            raise ValueError("A ata em PDF deve ter no máximo 100 páginas.")
        transcript = "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except PdfReadError as exc:
        raise ValueError("O PDF enviado é inválido ou não pôde ser lido.") from exc
    if not transcript:
        raise ValueError("O PDF não contém texto selecionável; envie uma ata em texto ou um PDF pesquisável.")
    return transcript


@router.post("/clients/{client_id}/interactions")
async def add_interaction(client_id: str, body: InteractionIn, session: Session):
    await _client(session, client_id)
    occurred_at = body.occurred_at or datetime.now(UTC)
    item = {"id": str(uuid4()), "client_id": client_id, "channel": body.channel, "summary": body.summary, "next_step": body.next_step, "occurred_at": occurred_at.isoformat(), "advisor_name": "Assessor Demo"}
    await session.execute(text("insert into demo_interactions(id,client_id,occurred_at,payload) values(:id,:client_id,:occurred_at,cast(:payload as jsonb))"), {"id": item["id"], "client_id": client_id, "occurred_at": occurred_at, "payload": json.dumps(item)})
    return item


@router.post("/clients/{client_id}/interactions/upload", status_code=201)
async def upload_interaction(
    client_id: str,
    session: Session,
    _user: CurrentUser,
    file: Annotated[UploadFile, File()],
    channel: Annotated[str, Form()] = "meeting",
    summary: Annotated[str, Form()] = "",
    next_step: Annotated[str, Form()] = "",
):
    await _client(session, client_id)
    if channel not in {"meeting", "call", "whatsapp", "email", "note"}:
        raise HTTPException(422, "Canal de interação inválido.")
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()
    if suffix not in TEXT_EXTENSIONS | MEDIA_EXTENSIONS:
        raise HTTPException(415, "Envie uma ata .txt/.md/.pdf ou áudio/vídeo .mp3/.m4a/.wav/.ogg/.aac/.flac/.mp4/.mov/.webm.")
    contents = await file.read(MAX_ATTACHMENT_BYTES + 1)
    await file.close()
    if not contents or len(contents) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(413, "O anexo deve ter entre 1 byte e 25 MB.")

    if suffix == ".pdf":
        try:
            transcript = await run_in_threadpool(extract_pdf_text, contents)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        attachment_type = "minutes"
    elif suffix in TEXT_EXTENSIONS:
        try:
            transcript = contents.decode("utf-8-sig").strip()
        except UnicodeDecodeError as exc:
            raise HTTPException(422, "A ata deve estar em UTF-8.") from exc
        if not transcript:
            raise HTTPException(422, "A ata está vazia.")
        attachment_type = "minutes"
    else:
        model_path = os.environ.get("WHISPER_MODEL_PATH", "/opt/whisper-model")
        try:
            transcript = await run_in_threadpool(transcribe_media, contents, suffix, model_path)
        except ValueError as exc:
            raise HTTPException(422, f"Não foi possível transcrever a gravação: {exc}") from exc
        except Exception as exc:
            raise HTTPException(503, "Transcrição indisponível no momento.") from exc
        attachment_type = "transcription"

    occurred_at = datetime.now(UTC)
    item = {
        "id": str(uuid4()), "client_id": client_id, "channel": channel,
        "occurred_at": occurred_at.isoformat(),
        "summary": summary.strip() or f"Registro de reunião: {filename}",
        "next_step": next_step.strip() or None, "advisor_name": "Assessor Demo",
        "attachment_name": filename, "attachment_type": attachment_type,
        "transcription": transcript,
    }
    await session.execute(
        text("insert into demo_interactions(id,client_id,occurred_at,payload) values(:id,:client_id,:occurred_at,cast(:payload as jsonb))"),
        {"id": item["id"], "client_id": client_id, "occurred_at": occurred_at, "payload": json.dumps(item)},
    )
    await session.execute(
        text("insert into demo_attachments(interaction_id,filename,content_type,contents) values(:id,:filename,:content_type,:contents)"),
        {"id": item["id"], "filename": filename, "content_type": CONTENT_TYPES[suffix], "contents": contents},
    )
    return item


@router.get("/clients/{client_id}/interactions/{interaction_id}/attachment")
async def download_attachment(client_id: str, interaction_id: str, session: Session, _user: CurrentUser):
    await _client(session, client_id)
    row = (
        await session.execute(
            text("select a.filename,a.content_type,a.contents from demo_attachments a join demo_interactions i on i.id=a.interaction_id where i.client_id=:client_id and i.id=:interaction_id"),
            {"client_id": client_id, "interaction_id": interaction_id},
        )
    ).first()
    if row is None:
        raise HTTPException(404, "Anexo não encontrado.")
    return Response(
        content=row.contents,
        media_type=row.content_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(row.filename)}"},
    )


@router.get("/news")
async def news(session: Session, period: str = Query("day", pattern="^(day|week)$")):
    return (await load(session, "news"))[period]


@router.get("/alerts")
async def alerts(session: Session): return {"items": await load(session, "alerts")}


@router.get("/alerts/{alert_id}")
async def alert(alert_id: str, session: Session):
    item = next((value for value in await load(session, "alerts") if value["id"] == alert_id), None)
    if item is None: raise HTTPException(404, "Alerta não encontrado.")
    return item


@router.get("/briefings")
async def briefings(session: Session): return {"items": await load(session, "briefings")}


@router.get("/finance/sources")
async def finance(session: Session): return {"items": await load(session, "finance")}


@router.get("/demo/status")
async def status(session: Session): return await load(session, "status")


@router.post("/copilot/chat")
async def chat(body: ChatIn, session: Session):
    clients_data = await load(session, "clients")
    client = next((item for item in clients_data if item["id"] == body.client_id), clients_data[0])
    alert_data = (await load(session, "alerts"))[0]
    return {"session_id": body.session_id or str(uuid4()), "message_id": str(uuid4()), "answer": f"No conjunto demonstrativo persistido, {client['name']} possui perfil {client['risk_profile']} e patrimônio de R$ {client['net_worth']}. Há uma prioridade aberta para revisão de concentração.", "sources": [{"type":"client","id":client["id"],"label":client["name"],"updated_at":"2026-10-10T12:00:00Z"},{"type":"alert","id":alert_data["id"],"label":alert_data["title"],"updated_at":"2026-10-10T09:00:00Z"}], "suggested_actions": [{"type":"open_client","label":f"Abrir {client['name']}","target_id":client["id"]}], "disclaimer":"Conteúdo sintético persistido no PostgreSQL local, sujeito à revisão do assessor."}
