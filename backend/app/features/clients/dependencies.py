"""Dependências locais da feature clients."""

from typing import Annotated

from fastapi import Depends

from app.features.auth.dependencies import AdvisorSession
from app.features.clients.repository import ClientRepository
from app.features.clients.service import ClientService


def get_clients_service(session: AdvisorSession) -> ClientService:
    return ClientService(ClientRepository(session))


ClientServiceDep = Annotated[ClientService, Depends(get_clients_service)]
