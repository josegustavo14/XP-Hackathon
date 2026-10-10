import unittest
from uuid import uuid4

from app.features.copilot.conversation import ConversationStore
from app.shared.exceptions import InvalidRequestError, NotFoundError


class ConversationStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = ConversationStore(ttl_seconds=3600)
        self.advisor_id = uuid4()
        self.client_id = uuid4()

    def test_session_keeps_recent_turns_for_same_advisor_and_client(self) -> None:
        session_id, history = self.store.load(
            session_id=None,
            advisor_id=self.advisor_id,
            client_id=self.client_id,
        )
        self.assertEqual(history, [])

        self.store.save_turn(
            session_id=session_id,
            advisor_id=self.advisor_id,
            client_id=self.client_id,
            prompt="Quais alertas estão abertos?",
            answer="Há um alerta de concentração.",
        )
        returned_id, history = self.store.load(
            session_id=session_id,
            advisor_id=self.advisor_id,
            client_id=self.client_id,
        )

        self.assertEqual(returned_id, session_id)
        self.assertEqual([message.role for message in history], ["user", "assistant"])

    def test_session_is_not_shared_between_advisors(self) -> None:
        session_id, _ = self.store.load(session_id=None, advisor_id=self.advisor_id, client_id=None)

        with self.assertRaises(NotFoundError):
            self.store.load(session_id=session_id, advisor_id=uuid4(), client_id=None)

    def test_session_cannot_change_client_scope(self) -> None:
        session_id, _ = self.store.load(
            session_id=None,
            advisor_id=self.advisor_id,
            client_id=self.client_id,
        )

        with self.assertRaises(InvalidRequestError):
            self.store.load(session_id=session_id, advisor_id=self.advisor_id, client_id=uuid4())