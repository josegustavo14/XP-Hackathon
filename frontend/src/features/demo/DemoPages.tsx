import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, Database, FileText, Settings } from 'lucide-react';

import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, SectionHead } from '../../shared/ui/Card';
import { PageHeader } from '../../shared/ui/PageHeader';
import { env } from '../../shared/config/env';
import { request } from '../../shared/api/http';

type DemoAlert = { id: string; clientId: string; client: string; title: string; description: string; priority: string };
type DemoBriefing = { id: string; clientId: string; title: string; description: string; status: string };
type DemoSource = { name: string; description: string; status: string };

const alertItems: DemoAlert[] = [
  { id: '00000000-0000-0000-0000-000000002001', clientId: '11111111-1111-4111-8111-111111111111', client: 'Mariana Costa', title: 'Concentração em renda fixa', description: 'Exposição relevante a crédito privado para o perfil atual da carteira.', priority: 'Alta' },
  { id: '00000000-0000-0000-0000-000000002002', clientId: '22222222-2222-4222-8222-222222222222', client: 'Ricardo Almeida', title: 'Vencimento próximo', description: 'Há um CDB com vencimento nos próximos dias para revisão do assessor.', priority: 'Alta' },
  { id: '00000000-0000-0000-0000-000000002003', clientId: '44444444-4444-4444-8444-444444444444', client: 'Carlos Rocha', title: 'Saldo disponível acima do habitual', description: 'O caixa disponível merece avaliação dentro dos objetivos declarados.', priority: 'Média' },
];

const fallbackBriefings: DemoBriefing[] = [{ id: 'briefing-1', clientId: '11111111-1111-4111-8111-111111111111', title: 'Reunião sugerida: Mariana Costa', description: 'Revisar concentração em renda fixa, objetivos de aposentadoria e próximos vencimentos.', status: 'Rascunho' }];
const fallbackSources: DemoSource[] = [['Base XP', 'Clientes e posições sintéticas consolidadas', 'Disponível'], ['Open Finance', 'Aguardando consentimento do cliente', 'Em aberto'], ['Notícias', 'Feed sintético de inteligência de mercado', 'Atualizado']].map(([name, description, status]) => ({ name, description, status }));
const fallbackStatus = { label: 'Modo demonstração', message: 'Dados sintéticos locais para a apresentação.' };

function useDemoResource<T>(path: string, fallback: T) {
  const [resource, setResource] = useState(fallback);
  useEffect(() => {
    if (env.mode === 'mock') return;
    void request<{ items?: T } | T>(path).then((data) => {
      const payload = data as { items?: T };
      setResource(payload.items ?? (data as T));
    }).catch(() => undefined);
  }, [fallback, path]);
  return resource;
}

function priorityBadge(priority: string) {
  return <Badge variant={priority === 'Alta' ? 'red' : 'gold'}>{priority} prioridade</Badge>;
}

export function AlertsDemoPage() {
  const navigate = useNavigate();
  const alerts = useDemoResource('/alerts', alertItems);
  return <div className="demo-page">
    <PageHeader kicker="Monitoramento" title="Alertas e oportunidades" lead="Ocorrências priorizadas para orientar o próximo contato — sempre sujeitas à revisão do assessor." />
    <div className="demo-alert-list">{alerts.map((alert) => <Card key={alert.id} className="demo-alert-card">
      <div className="demo-alert-icon"><CircleAlert size={19} /></div>
      <div className="demo-alert-copy"><div className="row"><strong>{alert.title}</strong>{priorityBadge(alert.priority)}</div><p>{alert.description}</p><span>{alert.client}</span></div>
      <Button variant="secondary" onClick={() => navigate(`/clients/${alert.clientId}`)}>Abrir cliente <ArrowRight size={14} /></Button>
    </Card>)}</div>
    <p className="demo-disclaimer">Os alertas são sinais de apoio e não constituem recomendação financeira.</p>
  </div>;
}

export function AlertDetailDemoPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const fallback = alertItems.find((item) => item.id === alertId) ?? alertItems[0];
  const alert = useDemoResource(`/alerts/${alertId ?? fallback.id}`, fallback);
  return <div className="demo-page">
    <PageHeader kicker="Monitoramento" title={alert.title} lead={alert.description} />
    <Card><SectionHead title="Contexto da ocorrência" description="Dados sintéticos para demonstração" />
      <div className="demo-detail-grid"><div><span>Cliente</span><strong>{alert.client}</strong></div><div><span>Prioridade</span>{priorityBadge(alert.priority)}</div><div><span>Status</span><Badge variant="blue">Aberto</Badge></div></div>
      <div className="demo-detail-actions"><Button variant="primary" onClick={() => navigate(`/copilot?client_id=${alert.clientId}`)}>Pedir contexto ao Copiloto</Button><Button variant="secondary" onClick={() => navigate(`/clients/${alert.clientId}`)}>Abrir perfil 360</Button></div>
    </Card>
  </div>;
}

export function BriefingsDemoPage() {
  const navigate = useNavigate();
  const briefings = useDemoResource('/briefings', fallbackBriefings);
  const briefing = briefings[0];
  return <div className="demo-page"><PageHeader kicker="Preparação de reuniões" title="Briefings" lead="Pontos de partida para uma conversa melhor preparada." />
    <Card className="demo-briefing"><FileText size={23} /><div><h2>{briefing.title}</h2><p>{briefing.description}</p><div className="row"><Badge variant="gold">{briefing.status}</Badge><Badge variant="slate">Backend sintético</Badge></div></div><Button variant="primary" onClick={() => navigate(`/clients/${briefing.clientId}`)}>Abrir perfil</Button></Card>
  </div>;
}

export function FinanceDemoPage() {
  const sources = useDemoResource('/finance/sources', fallbackSources);
  return <div className="demo-page"><PageHeader kicker="Consolidação patrimonial" title="Dados integrados" lead="Visão de fontes disponíveis para a demonstração." />
    <div className="grid3">{sources.map(({ name, description, status }) => <Card key={name} className="demo-source-card"><Database size={20} /><h2>{name}</h2><p>{description}</p><Badge variant={status === 'Em aberto' ? 'gold' : 'green'}>{status}</Badge></Card>)}</div>
  </div>;
}

export function SettingsDemoPage() {
  const status = useDemoResource('/demo/status', fallbackStatus);
  return <div className="demo-page"><PageHeader kicker="Ambiente" title="Configurações" lead="Estado da demonstração e integrações disponíveis." />
    <Card className="demo-settings-card"><Settings size={22} /><div><strong>{status.label}</strong><p>{status.message}</p></div><Badge variant="green"><CheckCircle2 size={13} /> Pronto</Badge></Card>
  </div>;
}
