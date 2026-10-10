-- Concentração por classe de ativo (issue #16).
-- Em arquivo separado: valor novo de enum só pode ser usado depois do commit.

alter type alert_type add value if not exists 'asset_class_concentration';
