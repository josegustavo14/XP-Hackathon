"""Regras de negócio da feature interactions.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from app.features.interactions.repository import InteractionRepository


class InteractionService:
    def __init__(self, repository: InteractionRepository) -> None:
        self.repository = repository
