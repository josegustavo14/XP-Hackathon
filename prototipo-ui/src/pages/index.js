// Mapa de rotas: id da tela -> componente. O App.jsx escolhe a página por aqui.
import { AlertDetail } from "./AlertDetail.jsx";
import { AlertsPage } from "./Alerts.jsx";
import { Briefing } from "./Briefing.jsx";
import { Briefings } from "./Briefings.jsx";
import { ClientsPage } from "./Clients.jsx";
import { Copilot } from "./Copilot.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { Finance } from "./Finance.jsx";
import { Login } from "./Login.jsx";
import { Profile } from "./Profile.jsx";
import { Settings } from "./Settings.jsx";
import { Sources } from "./Sources.jsx";

export const PAGES = {
  dashboard: Dashboard,
  clients: ClientsPage,
  profile: Profile,
  alerts: AlertsPage,
  alertDetail: AlertDetail,
  copilot: Copilot,
  briefings: Briefings,
  briefing: Briefing,
  finance: Finance,
  sources: Sources,
  settings: Settings,
};

export { Dashboard, Login };
