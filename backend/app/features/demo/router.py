"""API demonstrativa persistida; só é montada com AUTH_MODE=mock."""
import json
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

router = APIRouter(tags=["demo"])
Session = Annotated[AsyncSession, Depends(get_db_session)]


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
    values = await session.scalars(text("select payload from demo_interactions where client_id=:id order by occurred_at desc"), {"id": client_id})
    return {"items": list(values)}


@router.post("/clients/{client_id}/interactions")
async def add_interaction(client_id: str, body: InteractionIn, session: Session):
    occurred_at = body.occurred_at or datetime.now(UTC)
    item = {"id": str(uuid4()), "client_id": client_id, "channel": body.channel, "summary": body.summary, "next_step": body.next_step, "occurred_at": occurred_at.isoformat(), "advisor_name": "Assessor Demo"}
    await session.execute(text("insert into demo_interactions(id,client_id,occurred_at,payload) values(:id,:client_id,:occurred_at,cast(:payload as jsonb))"), {"id": item["id"], "client_id": client_id, "occurred_at": occurred_at, "payload": json.dumps(item)})
    return item


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
