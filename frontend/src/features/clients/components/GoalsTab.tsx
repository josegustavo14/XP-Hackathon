import React, { useState } from 'react';
import { Target, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Card } from '../../../shared/ui/Card';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { formatMoney } from '../../../shared/formatters/money';
import type { ClientGoalItem } from '../types';

interface GoalsTabProps {
  goals: ClientGoalItem[];
  onAddGoal?: (goal: Omit<ClientGoalItem, 'id' | 'client_id'>) => void;
}

const formatWealth = (value: number | string): string => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return formatMoney(value);
};

export const GoalsTab: React.FC<GoalsTabProps> = ({ goals, onAddGoal }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tVal = parseFloat(targetValue.replace(/[^\d.-]/g, '')) || 0;
    const cVal = parseFloat(currentValue.replace(/[^\d.-]/g, '')) || 0;
    const pct = tVal > 0 ? Math.min(100, Math.round((cVal / tVal) * 100)) : 0;

    if (onAddGoal) {
      onAddGoal({
        name,
        target_value: tVal,
        current_value: cVal,
        progress_percentage: pct,
        target_date: targetDate || '2030-12-31',
        status: pct >= 100 ? 'completed' : 'in_progress',
      });
    }

    setName('');
    setTargetValue('');
    setCurrentValue('');
    setTargetDate('');
    setShowAddModal(false);
  };

  return (
    <div className="goals-tab-content">
      <div className="row justify-between align-center mb-4">
        <div>
          <h2>Planejamento Financeiro e Objetivos</h2>
          <p className="text-muted text-sm">
            Metas de médio e longo prazo alinhadas com o planejamento do investidor
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowAddModal(true)}>
          <Plus size={14} style={{ marginRight: '6px' }} />
          Novo Objetivo
        </Button>
      </div>

      <div className="goals-grid">
        {goals.map((goal) => {
          const isCompleted = goal.status === 'completed' || goal.progress_percentage >= 100;
          return (
            <Card key={goal.id} className="goal-card">
              <div className="row justify-between align-center mb-3">
                <div className="row align-center gap-2">
                  <div
                    className={`goal-icon-badge ${
                      isCompleted ? 'goal-completed' : 'goal-active'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : <Target size={16} />}
                  </div>
                  <h3 className="goal-title">{goal.name}</h3>
                </div>
                <Badge variant={isCompleted ? 'green' : 'gold'}>
                  {isCompleted ? 'Atingido' : `${goal.progress_percentage}% concluído`}
                </Badge>
              </div>

              {/* Barra de Progresso */}
              <div className="progress-bar-bg my-3">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(goal.progress_percentage, 100)}%`,
                    backgroundColor: isCompleted ? '#1a805a' : '#e8b44b',
                  }}
                />
              </div>

              <div className="row justify-between align-center goal-values-row">
                <div>
                  <span className="goal-val-label">Acumulado</span>
                  <div className="goal-val-num">{formatWealth(goal.current_value)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="goal-val-label">Meta Final</span>
                  <div className="goal-val-target">{formatWealth(goal.target_value)}</div>
                </div>
              </div>

              <div className="goal-card-footer">
                <span className="text-xs text-muted">
                  Prazo estimado: <b>{goal.target_date}</b>
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Adicionar Objetivo */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadastrar Novo Objetivo</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Nome da Meta</label>
                  <input
                    type="text"
                    className="field w-full"
                    placeholder="Ex: Compra de Casa Própria"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid2 mb-3">
                  <div className="form-group">
                    <label className="form-label">Valor Alvo (R$)</label>
                    <input
                      type="text"
                      className="field w-full"
                      placeholder="Ex: 500.000"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valor Atual (R$)</label>
                    <input
                      type="text"
                      className="field w-full"
                      placeholder="Ex: 150.000"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Data / Ano Alvo</label>
                  <input
                    type="text"
                    className="field w-full"
                    placeholder="Ex: 31/12/2030"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar Objetivo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
