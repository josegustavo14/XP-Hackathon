"""Regras de negócio da feature briefings.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from app.features.briefings.repository import BriefingRepository


class BriefingService:
    def __init__(self, repository: BriefingRepository) -> None:
        self.repository = repository
