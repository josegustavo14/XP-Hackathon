import React from 'react';
import { MessageSquarePlus, Calendar, Phone, MessageSquare, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import type { ClientInteractionItem } from '../types';

interface InteractionsTimelineProps {
  interactions: ClientInteractionItem[];
  onOpenNewModal: () => void;
}

const getChannelMeta = (channel: string) => {
  switch (channel) {
    case 'meeting':
      return {
        label: 'Reunião',
        icon: <Calendar size={14} className="icon-gold" />,
        badge: <Badge variant="gold">Reunião</Badge>,
      };
    case 'phone':
      return {
        label: 'Ligação',
        icon: <Phone size={14} className="icon-blue" />,
        badge: <Badge variant="blue">Ligação</Badge>,
      };
    case 'whatsapp':
      return {
        label: 'WhatsApp',
        icon: <MessageSquare size={14} className="icon-green" />,
        badge: <Badge variant="green">WhatsApp</Badge>,
      };
    case 'email':
      return {
        label: 'E-mail',
        icon: <Mail size={14} className="icon-slate" />,
        badge: <Badge variant="slate">E-mail</Badge>,
      };
    case 'note':
    default:
      return {
        label: 'Anotação',
        icon: <FileText size={14} className="icon-slate" />,
        badge: <Badge variant="slate">Anotação</Badge>,
      };
  }
};

export const InteractionsTimeline: React.FC<InteractionsTimelineProps> = ({
  interactions,
  onOpenNewModal,
}) => {
  return (
    <div className="timeline-tab-content">
      <div className="split">
        {/* Linha do Tempo */}
        <Card>
          <div className="sectionhead">
            <div>
              <h2>Linha do Tempo de Relacionamento</h2>
              <p>Histórico auditável de reuniões, contatos e deliberações com o cliente</p>
            </div>
            <Button variant="primary" onClick={onOpenNewModal}>
              <MessageSquarePlus size={14} style={{ marginRight: '6px' }} />
              Novo Atendimento
            </Button>
          </div>

          {interactions.length === 0 ? (
            <div className="empty">
              <b>Nenhum atendimento registrado</b>
              <p>Cadastre sua primeira reunião ou contato para iniciar o histórico de relacionamento.</p>
              <Button
                variant="gold"
                className="btn-sm"
                style={{ marginTop: '14px' }}
                onClick={onOpenNewModal}
              >
                Registrar primeiro contato
              </Button>
            </div>
          ) : (
            <div className="timeline-container">
              {interactions.map((item, index) => {
                const meta = getChannelMeta(item.channel);
                const dateObj = new Date(item.occurred_at);
                const formattedDate = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : item.occurred_at;

                return (
                  <div key={item.id || index} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="timeline-dot">{meta.icon}</div>
                      {index < interactions.length - 1 && <div className="timeline-line" />}
                    </div>

                    <div className="timeline-card">
                      <div className="row justify-between align-center mb-1">
                        <div className="row align-center gap-2">
                          {meta.badge}
                          <span className="timeline-date">{formattedDate}</span>
                        </div>
                        <span className="timeline-author text-xs text-muted">
                          {item.advisor_name || 'Assessor XP'}
                        </span>
                      </div>

                      <p className="timeline-summary">{item.summary}</p>

                      {item.next_step && (
                        <div className="timeline-next-step">
                          <CheckCircle2 size={13} className="icon-gold shrink-0" />
                          <span>
                            <b>Próximo passo:</b> {item.next_step}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Card Lateral de Memória e Boas Práticas */}
        <Card>
          <div className="sectionhead">
            <div>
              <h2>Memória do Cliente & Contexto</h2>
              <p>Registros contínuos para contextualização com IA</p>
            </div>
          </div>

          <div className="memory-guide-box">
            <h4>Como a Memória é Utilizada</h4>
            <p>
              Todos os registros adicionados aqui são utilizados pelo <b>Copiloto IA</b> e na geração de{' '}
              <b>Briefings</b> automáticos para que você nunca perca o contexto histórico das decisões do investidor.
            </p>

            <div className="guideline-item">
              <b>Alinhamentos de Risco</b>
              <p>Registre quando o cliente pedir alteração de alocação ou manifestar receio com volatilidade.</p>
            </div>

            <div className="guideline-item">
              <b>Momentos de Vida</b>
              <p>Mudanças familiares, venda de bens ou previsão de liquidez em datas futuras.</p>
            </div>

            <div className="guideline-item">
              <b>Preferências Pessoais</b>
              <p>Melhores horários para chamadas e canais de comunicação aprovados.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-top">
            <Button
              variant="gold"
              className="w-full justify-center"
              onClick={onOpenNewModal}
            >
              <MessageSquarePlus size={14} style={{ marginRight: '6px' }} />
              Registrar Atendimento Agora
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
