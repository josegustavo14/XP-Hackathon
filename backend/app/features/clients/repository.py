"""Persistência da feature clients e indicadores do assessor (EP01/EP04)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.clients.models import Client
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.clients.models import Client
from app.shared.enums import RiskProfile


class ClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search_for_copilot(
        self,
        *,
        query: str | None,
        client_id: UUID | None,
        limit: int,
    ) -> list[Client]:
        statement = select(Client).order_by(Client.full_name).limit(limit)
        if client_id is not None:
            statement = statement.where(Client.id == client_id)
        if query:
            escaped_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            statement = statement.where(Client.full_name.ilike(f"%{escaped_query}%", escape="\\"))
        result = await self.session.scalars(statement)
        return list(result.all())
    async def list_clients(
        self,
        *,
        advisor_id: UUID | None = None,
        search: str | None = None,
        risk_profile: RiskProfile | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[dict[str, Any]], int]:
        """Lista clientes com filtros de busca e paginação."""
        # Subquery para contar alertas abertos por cliente
        alerts_sql = text("""
            select client_id, count(id) as open_alerts
            from alerts
            where status = 'open'
            group by client_id
        """).columns()

        # Subquery para contar instituições distintas por cliente
        inst_sql = text("""
            select client_id, count(distinct institution_id) as institutions_count
            from positions
            group by client_id
        """).columns()

        # Montagem do select base
        stmt = (
            select(
                Client.id,
                Client.full_name,
                Client.city,
                Client.state,
                Client.risk_profile,
                Client.net_worth,
                Client.next_contact_at,
                Client.liquidity_need,
                func.coalesce(text("al_sub.open_alerts"), 0).label("open_alerts"),
                func.coalesce(text("inst_sub.institutions_count"), 1).label("institutions_count"),
            )
            .outerjoin(alerts_sql.subquery("al_sub"), Client.id == text("al_sub.client_id"))
            .outerjoin(inst_sql.subquery("inst_sub"), Client.id == text("inst_sub.client_id"))
        )

        count_stmt = select(func.count(Client.id))

        if advisor_id:
            stmt = stmt.where(Client.advisor_id == advisor_id)
            count_stmt = count_stmt.where(Client.advisor_id == advisor_id)

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            filter_expr = func.lower(Client.full_name).like(search_pattern) | func.lower(
                Client.city
            ).like(search_pattern)
            stmt = stmt.where(filter_expr)
            count_stmt = count_stmt.where(filter_expr)

        if risk_profile:
            stmt = stmt.where(Client.risk_profile == risk_profile)
            count_stmt = count_stmt.where(Client.risk_profile == risk_profile)

        # Total
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        # Paginação e ordenação
        offset = (page - 1) * page_size
        stmt = stmt.order_by(Client.full_name.asc()).offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        rows = result.fetchall()

        items: list[dict[str, Any]] = []
        for r in rows:
            items.append({
                "id": r.id,
                "name": r.full_name,
                "city": r.city,
                "state": r.state,
                "risk_profile": r.risk_profile,
                "net_worth": r.net_worth or Decimal("0.00"),
                "open_alerts": int(r.open_alerts or 0),
                "institutions_count": max(1, int(r.institutions_count or 1)),
                "next_contact_at": r.next_contact_at,
                "primary_objective": r.liquidity_need,
            })

        return items, total

    async def get_client_by_id(
        self, client_id: UUID, *, advisor_id: UUID | None = None
    ) -> dict[str, Any] | None:
        """Busca detalhada da ficha do cliente."""
        stmt = select(Client).where(Client.id == client_id)
        if advisor_id:
            stmt = stmt.where(Client.advisor_id == advisor_id)

        result = await self.session.execute(stmt)
        client = result.scalar_one_or_none()
        if not client:
            return None

        # Alertas abertos
        alerts_stmt = text(
            "select count(id) from alerts where client_id = :client_id and status = 'open'"
        )
        alerts_res = await self.session.execute(alerts_stmt, {"client_id": client_id})
        open_alerts = alerts_res.scalar() or 0

        # Instituições com custódia
        inst_stmt = text(
            "select count(distinct institution_id) from positions where client_id = :client_id"
        )
        inst_res = await self.session.execute(inst_stmt, {"client_id": client_id})
        institutions_count = inst_res.scalar() or 1

        return {
            "id": client.id,
            "advisor_id": client.advisor_id,
            "name": client.full_name,
            "birthday": client.birthday,
            "city": client.city,
            "state": client.state,
            "risk_profile": client.risk_profile,
            "suitability_expires_at": client.suitability_expires_at,
            "investment_horizon_yrs": client.investment_horizon_yrs,
            "liquidity_need": client.liquidity_need,
            "preferences": client.preferences or {},
            "last_contact_at": client.last_contact_at,
            "next_contact_at": client.next_contact_at,
            "net_worth": client.net_worth or Decimal("0.00"),
            "net_worth_updated_at": client.net_worth_updated_at,
            "open_alerts": int(open_alerts),
            "institutions_count": max(1, int(institutions_count)),
            "created_at": client.created_at,
            "updated_at": client.updated_at,
        }

    async def get_dashboard_summary(self, *, advisor_id: UUID | None = None) -> dict[str, Any]:
        """Calcula métricas agregadas do dashboard do assessor e fila de prioridades."""
        # 1. Total de clientes e patrimônio consolidado
        clients_filter = "where advisor_id = :advisor_id" if advisor_id else ""
        params = {"advisor_id": advisor_id} if advisor_id else {}

        summary_sql = text(f"""
            select
                count(id) as clients_total,
                coalesce(sum(net_worth), 0) as total_assets
            from clients
            {clients_filter}
        """)
        summary_res = await self.session.execute(summary_sql, params)
        summary_row = summary_res.fetchone()
        clients_total = summary_row.clients_total if summary_row else 0
        total_assets = summary_row.total_assets if summary_row else Decimal("0.00")

        # 2. Total de alertas abertos e clientes precisando de atenção
        alerts_join = "join clients c on c.id = a.client_id"
        alerts_where = "where a.status = 'open'"
        if advisor_id:
            alerts_where += " and c.advisor_id = :advisor_id"

        alerts_sql = text(f"""
            select
                count(a.id) as open_alerts,
                count(distinct a.client_id) as clients_need_attention
            from alerts a
            {alerts_join}
            {alerts_where}
        """)
        alerts_res = await self.session.execute(alerts_sql, params)
        alerts_row = alerts_res.fetchone()
        open_alerts = alerts_row.open_alerts if alerts_row else 0
        clients_need_attention = alerts_row.clients_need_attention if alerts_row else 0

        # 3. Fila de prioridades: alertas mais críticos em aberto com dados do cliente
        priority_order = """
            case a.priority
                when 'high' then 1
                when 'medium' then 2
                when 'low' then 3
                else 4
            end,
            c.next_contact_at asc nulls last,
            a.created_at desc
        """
        priorities_sql = text(f"""
            select
                c.id as client_id,
                c.full_name as client_name,
                c.risk_profile as client_risk,
                c.net_worth as client_assets,
                a.id as alert_id,
                a.type as reason_type,
                a.title as reason_label,
                a.priority as severity
            from alerts a
            join clients c on c.id = a.client_id
            {alerts_where}
            order by {priority_order}
            limit 5
        """)
        priorities_res = await self.session.execute(priorities_sql, params)
        priority_rows = priorities_res.fetchall()

        priorities = [
            {
                "client": {
                    "id": p.client_id,
                    "name": p.client_name,
                    "risk_profile": p.client_risk,
                    "total_assets": p.client_assets or Decimal("0.00"),
                },
                "reason_type": p.reason_type,
                "reason_label": p.reason_label,
                "severity": p.severity,
                "alert_id": p.alert_id,
            }
            for p in priority_rows
        ]

        return {
            "clients_total": int(clients_total),
            "clients_need_attention": int(clients_need_attention),
            "open_alerts": int(open_alerts),
            "total_assets": total_assets,
            "priorities": priorities,
        }
