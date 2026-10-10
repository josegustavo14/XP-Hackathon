import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import '../styles.css';

function Placeholder({ title }: { title: string }) { return <section><p className="eyebrow">Em construção</p><h1>{title}</h1></section>; }

export function App() {
  return <BrowserRouter><div className="shell"><aside><div className="brand">XP <span>Advisor</span></div><nav><NavLink to="/" end>Dashboard</NavLink><NavLink to="/clientes">Clientes</NavLink><NavLink to="/alertas">Alertas</NavLink><NavLink to="/copiloto">Copiloto</NavLink></nav></aside><main><Routes><Route path="/" element={<DashboardPage />} /><Route path="/clientes" element={<Placeholder title="Clientes" />} /><Route path="/alertas" element={<Placeholder title="Alertas" />} /><Route path="/copiloto" element={<Placeholder title="Copiloto" />} /></Routes></main></div></BrowserRouter>;
}
