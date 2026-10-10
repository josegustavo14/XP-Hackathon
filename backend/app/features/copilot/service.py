"""Regras de negócio da feature copilot.

Recebe tipos de domínio (nunca `Request`) e levanta exceções de
`app.shared.exceptions`; a tradução para HTTP acontece no boundary.
"""

from app.features.copilot.repository import CopilotRepository


class CopilotService:
    def __init__(self, repository: CopilotRepository) -> None:
        self.repository = repository
