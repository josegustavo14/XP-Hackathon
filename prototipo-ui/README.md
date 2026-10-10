# XP Advisor Copilot — Protótipo

Protótipo do hackathon XP. Todos os dados são **fictícios**: não há backend, login real nem integração bancária.

## Só quero ver

Abra `XP_Advisor_Copilot.html` com dois cliques. Funciona sem internet e sem instalar nada. Esse arquivo é uma cópia "congelada" e não atualiza sozinho.

## Quero mexer no código

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm run dev
```

Abra http://localhost:5173. Cada arquivo salvo em `src/` atualiza a página na hora.

- **Ver no celular** (mesmo Wi-Fi): `npm run dev -- --host` e abra o endereço "Network" que aparecer.
- **Se der erro na primeira vez** (comum em Mac/Linux, porque o `node_modules` veio do Windows): apague a pasta `node_modules` e rode `npm install`.

Para atualizar o HTML compartilhável depois das mudanças:

```bash
npm run build:html
```

O resultado sai em `dist-html/index.html`. Copie esse arquivo para a raiz como `XP_Advisor_Copilot.html`.

## Onde fica cada coisa

| Arquivo | O que tem |
|---|---|
| `src/pages.jsx` | Todas as telas: visão geral, clientes, perfil, alertas, copiloto, briefings, dados integrados, configurações e login |
| `src/App.jsx` | Menu lateral, header, navegação entre telas e estado global (alertas, anotações, conversa, tema) |
| `src/CopilotWidget.jsx` | Botão flutuante do copiloto e painel de chat |
| `src/chat.jsx` | Lista de mensagens e perguntas sugeridas (usadas pela página e pelo painel) |
| `src/charts.jsx` | Gráficos animados: barras, rosca e colunas |
| `src/components/MarketIntelligence.jsx` | Painel de notícias |
| `src/ui.jsx` | Peças reutilizáveis: botões, cards, badges, métricas, notificações, botão de tema |
| `src/data.js` | Clientes, alertas, anotações e respostas do copiloto (tudo fictício) |
| `src/index.css` | Cores do tema claro e escuro |

## Regras para manter o visual consistente

- **Modo claro e escuro:** toda mudança precisa funcionar nos dois. Use as classes de cor já existentes (`slate-*`, `amber-*`, `blue-*`, `red-*`, `emerald-*`, `bg-surface`, `bg-primary`/`text-on-primary`). Elas trocam sozinhas no modo escuro. **Não use** `bg-white` nem cores em hex direto nos componentes.
- **Botão de ação principal:** `<Button variant="primary">`. Ele inverte as cores entre os modos.
- **Cores dos gráficos:** use `var(--color-chart-1)` a `var(--color-chart-4)`. A paleta foi testada para daltonismo nos dois temas.
- **Textos de aviso:** mantenha os avisos de "dados fictícios" e "não é recomendação de investimento".

## Notícias reais (futuro)

O painel de notícias procura um arquivo `news.json` ao lado da página. Enquanto ele não existir, mostra exemplos marcados como fictícios. O formato esperado está descrito no topo de `src/components/MarketIntelligence.jsx`.
