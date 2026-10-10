import React, { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { CreateInteractionPayload } from '../types';

interface NewInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateInteractionPayload) => Promise<void>;
  clientName: string;
}

export const NewInteractionModal: React.FC<NewInteractionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientName,
}) => {
  const [channel, setChannel] = useState<CreateInteractionPayload['channel']>('meeting');
  const [summary, setSummary] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        channel,
        summary: summary.trim(),
        next_step: nextStep.trim() || undefined,
        occurred_at: new Date().toISOString(),
      });
      setSummary('');
      setNextStep('');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar interação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Registrar Interação com o Cliente</h3>
            <p className="text-xs text-muted" style={{ margin: '2px 0 0' }}>
              Cliente: <b>{clientName}</b>
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group mb-3">
              <label className="form-label">Canal do Atendimento</label>
              <select
                className="field w-full"
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as CreateInteractionPayload['channel'])
                }
              >
                <option value="meeting">Reunião (Presencial / Vídeo)</option>
                <option value="phone">Ligação Telefônica</option>
                <option value="whatsapp">WhatsApp / Mensagem</option>
                <option value="email">E-mail</option>
                <option value="note">Anotação Interna do Assessor</option>
              </select>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Resumo dos Pontos Abordados *</label>
              <textarea
                className="field-textarea w-full"
                rows={4}
                placeholder="Descreva as demandas levantadas, perfil de interesse, dúvidas do cliente ou alinhamento patrimonial..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Próximo Passo / Ação Combinada</label>
              <input
                type="text"
                className="field w-full"
                placeholder="Ex: Enviar lâmina de alocação até sexta-feira ou agendar revisão"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !summary.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
