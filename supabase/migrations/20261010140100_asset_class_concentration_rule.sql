-- Parâmetros da regra de concentração por classe (issue #16).
-- VALORES FICTÍCIOS DE DEMONSTRAÇÃO: pendentes de validação com assessor/compliance.
-- Ainda não há seção correspondente em refresh_alerts(); a regra roda em
-- backend/app/features/alerts/rules.py (detect_concentrations).

insert into alert_rules (type, description, params) values
  ('asset_class_concentration',
   'Exposição a uma única classe de ativo acima do limite da carteira (valores de demonstração)',
   '{"max_pct": 0.50, "high_pct": 0.70}')
on conflict (type) do nothing;
