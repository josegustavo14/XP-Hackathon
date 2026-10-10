"""Regras de negócio da feature clients.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from app.features.clients.repository import ClientRepository


class ClientService:
    def __init__(self, repository: ClientRepository) -> None:
        self.repository = repository
