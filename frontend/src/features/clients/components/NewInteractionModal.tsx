import React, { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { CreateInteractionPayload } from '../types';

interface NewInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateInteractionPayload, file?: File) => Promise<void>;
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() && !file) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        channel,
        summary: summary.trim(),
        next_step: nextStep.trim() || undefined,
        occurred_at: new Date().toISOString(),
      }, file ?? undefined);
      setSummary('');
      setNextStep('');
      setFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a interação.');
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
                <option value="call">Ligação Telefônica</option>
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
                required={!file}
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label" htmlFor="interaction-file">Ata em texto/PDF, áudio ou vídeo da reunião</label>
              <input
                id="interaction-file"
                className="field w-full"
                type="file"
                accept=".txt,.md,.pdf,.mp3,.m4a,.wav,.ogg,.aac,.flac,.mp4,.mov,.webm,text/plain,text/markdown,application/pdf,audio/*,video/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted">Até 25 MB. PDF deve conter texto selecionável. Áudio e vídeo serão transcritos em português.</p>
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
            {error && <p role="alert" className="interaction-upload-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || (!summary.trim() && !file)}
            >
              {isSubmitting ? (file ? 'Enviando e transcrevendo...' : 'Salvando...') : 'Salvar Registro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
