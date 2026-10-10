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

```
src/
├── main.jsx                 Ponto de entrada (monta o App e carrega o CSS)
├── App.jsx                  Estado global (store), tema, login e roteamento entre telas
├── styles/index.css         Tokens de cor dos temas claro e escuro, fonte e animações
├── data/mock.js             Base fictícia: clientes, alertas, anotações, instituições
├── lib/                     Lógica sem interface
│   ├── store.js             Contexto global (useStore) e persistência no navegador
│   ├── copilot.js           Respostas e sugestões do copiloto (regras locais)
│   ├── alerts.js            Ordenação dos alertas por gravidade
│   └── dates.js             "Hoje" da demonstração e contagem de dias
├── hooks/useBackLink.js     "Voltar" que leva à tela de origem
├── layout/                  Moldura do app
│   ├── Header.jsx           Marca, menu em pílula (desktop), busca, tema, avatar
│   ├── BottomNav.jsx        Barra inferior (celular e tablet)
│   ├── MenuSheet.jsx        Folha "Todas as telas" do botão Menu
│   ├── BrandMark.jsx        Logo XP Advisor
│   └── navigation.js        Itens de menu e hierarquia das telas
├── components/
│   ├── ui/                  Design system: Badge, Button, Card, Metric, Table,
│   │                        Controls (abas e seletor), Theme, Toast — importe de "components/ui"
│   ├── alerts/              Tabela/lista de alertas
│   ├── clients/             Tabela/lista de clientes e painel "Registrar interação"
│   ├── copilot/             Conversa e botão flutuante do copiloto
│   ├── search/              Busca global (Ctrl K)
│   ├── market/              Painel de notícias
│   ├── backgrounds/         Fundo animado Ghost Fibers (React Bits), só no desktop
│   └── charts.jsx           Gráficos: barras, rosca e colunas
└── pages/                   Uma tela por arquivo; index.js tem o mapa de rotas
    Dashboard · Clients · Profile · Alerts · AlertDetail · Copilot
    Briefings · Briefing · Finance · Sources · Settings · Login
```

## Regras para manter o visual consistente

- **Modo claro e escuro:** toda mudança precisa funcionar nos dois. As cores ficam em `src/styles/index.css`. Use as classes de cor já existentes (`slate-*`, `amber-*`, `blue-*`, `red-*`, `emerald-*`, `bg-surface`, `bg-primary`/`text-on-primary`). Elas trocam sozinhas no modo escuro. **Não use** `bg-white` nem cores em hex direto nos componentes.
- **Botão de ação principal:** `<Button variant="primary">`. Ele inverte as cores entre os modos.
- **Cores dos gráficos:** use `var(--color-chart-1)` a `var(--color-chart-4)`. A paleta foi testada para daltonismo nos dois temas.
- **Textos de aviso:** mantenha os avisos de "dados fictícios" e "não é recomendação de investimento".

## Notícias reais (futuro)

O painel de notícias procura um arquivo `news.json` ao lado da página. Enquanto ele não existir, mostra exemplos marcados como fictícios. O formato esperado está descrito no topo de `src/components/MarketIntelligence.jsx`.
