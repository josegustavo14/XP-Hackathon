"""Gera supabase/seed.sql com dados sintéticos e determinísticos para o MVP.

Uso (só biblioteca padrão, Python 3.10+):
    python database/generate_seed.py

O SQL gerado é versionado. Rode este script de novo só quando mudar os dados.

Cenário da demo (proposta, seção 4): a assessora Ana tem 120 clientes e o
motor encontra exatamente 3 situações de prioridade alta:
  - Helena Duarte: 48% da carteira no emissor Banco Aurora (concentração)
  - Ricardo Mendes: CDB de R$ 380 mil vencendo em 5 dias (vencimento)
  - Camila Rocha: perfil conservador com ETF de cripto e R$ 260 mil parados
    em conta há 75 dias (desenquadramento + caixa parado)
Os demais clientes têm carteiras dentro das regras, com alguns alertas médios
e baixos plantados para dar realismo. O assessor Bruno tem 15 clientes e serve
para demonstrar o isolamento por RLS.

Emissores, empresas, tickers e notícias são FICTÍCIOS: não publicar notícia
inventada sobre empresa real. Exceções: XP e Tesouro Nacional.

Datas são relativas (current_date + N): os alertas de vencimento continuam
válidos sempre que o seed for aplicado. Aplique no dia da demo.
"""

from __future__ import annotations

import json
import math
import random
import uuid
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "supabase" / "seed.sql"
RNG = random.Random(42)
NS = uuid.UUID("7c0f8e5e-2b1a-4c55-9d3e-1a2b3c4d5e6f")
DEMO_PASSWORD = "Demo@2026"

MAX_RISK = {"conservative": 2, "moderate": 3, "aggressive": 5}
CENT = Decimal("0.01")


def uid(*parts: object) -> str:
    return str(uuid.uuid5(NS, ":".join(map(str, parts))))


def money(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


# -----------------------------------------------------------------------------
# Literais SQL
# -----------------------------------------------------------------------------


class Raw(str):
    """Expressão SQL inserida sem aspas."""


def days(n: int) -> Raw:
    return Raw(f"current_date + {n}" if n >= 0 else f"current_date - {-n}")


def ago(n_days: float) -> Raw:
    return Raw(f"now() - interval '{n_days} days'")


def ahead(n_days: float) -> Raw:
    return Raw(f"now() + interval '{n_days} days'")


def text_array(items: list[str], cast: str = "text[]") -> Raw:
    return Raw("'{" + ",".join(f'"{i}"' for i in items) + "}'::" + cast)


def lit(v: object) -> str:
    if v is None:
        return "null"
    if isinstance(v, Raw):
        return v
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, Decimal)):
        return str(v)
    if isinstance(v, (dict, list)):
        return lit(json.dumps(v, ensure_ascii=False, default=str)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table: str, cols: list[str], rows: list[tuple]) -> str:
    if not rows:
        return ""
    values = ",\n".join("  (" + ", ".join(lit(v) for v in r) + ")" for r in rows)
    return f"insert into {table} ({', '.join(cols)}) values\n{values};\n\n"


# -----------------------------------------------------------------------------
# Catálogo (fictício)
# -----------------------------------------------------------------------------

INSTITUTIONS = {
    "xp": ("XP Investimentos", True),
    "horizonte": ("Banco Horizonte", False),
    "pioneiro": ("Banco Pioneiro Digital", False),
    "sulcred": ("Cooperativa Sul Crédito", False),
}

ISSUERS = {
    "tesouro": ("Tesouro Nacional", "government"),
    "aurora": ("Banco Aurora", "bank"),
    "meridiano": ("Banco Meridiano", "bank"),
    "litoral": ("Banco Litoral", "bank"),
    "solar": ("Banco Solar Agro", "bank"),
    "valesul": ("Banco Vale do Sul", "bank"),
    "horizonte": ("Banco Horizonte", "bank"),
    "pioneiro": ("Banco Pioneiro Digital", "bank"),
    "valeverde": ("Energética Vale Verde S.A.", "company"),
    "nortelog": ("Nortelog Logística S.A.", "company"),
    "campoforte": ("Campo Forte Agronegócio S.A.", "company"),
    "farmavida": ("Farmavida S.A.", "company"),
    "saber": ("Rede Saber Educação S.A.", "company"),
    "aguaclara": ("Saneamento Água Clara S.A.", "company"),
    "cume": ("Cume Asset", "fund_manager"),
    "patio": ("Pátio Gestora", "fund_manager"),
    "quanta": ("Quanta Investimentos", "fund_manager"),
    "atlas": ("Atlas Capital", "fund_manager"),
    "amparo": ("Amparo Previdência", "fund_manager"),
}


@dataclass(frozen=True)
class Asset:
    code: str
    name: str
    asset_class: str
    issuer: str | None
    risk: int
    maturity_days: int | None = None
    indexer: str | None = None
    rate: str | None = None
    fgc: bool = False
    unit_price: str = "1000"
    # Só usado em cenários plantados / Open Finance, nunca em carteira aleatória
    special: bool = False


ASSETS = [
    Asset("CAIXA", "Saldo em conta", "cash", None, 1, unit_price="1"),
    Asset("TSELIC29", "Tesouro Selic 2029", "fixed_income", "tesouro", 1, 1180, "SELIC", "0.0010", unit_price="15200"),
    Asset("TIPCA35", "Tesouro IPCA+ 2035", "fixed_income", "tesouro", 1, 3300, "IPCA", "0.0650", unit_price="2300"),
    Asset("TPRE27", "Tesouro Prefixado 2027", "fixed_income", "tesouro", 1, 450, "PRE", "0.1320", unit_price="870"),
    Asset("CDB-AUR-29", "CDB Banco Aurora 2029", "fixed_income", "aurora", 2, 1100, "CDI", "1.1200", True),
    Asset("LCI-AUR-28", "LCI Banco Aurora 2028", "fixed_income", "aurora", 2, 700, "CDI", "0.9400", True),
    Asset("CDB-MER-30", "CDB Banco Meridiano 2030", "fixed_income", "meridiano", 2, 1500, "CDI", "1.1000", True),
    Asset("CDB-LIT-30", "CDB Banco Litoral 2030", "fixed_income", "litoral", 2, 1450, "CDI", "1.0800", True),
    Asset("LCA-SOL-28", "LCA Banco Solar Agro 2028", "fixed_income", "solar", 2, 800, "CDI", "0.9200", True),
    Asset("CDB-VSU-29", "CDB Banco Vale do Sul 2029", "fixed_income", "valesul", 2, 1000, "IPCA", "0.0610", True),
    Asset("LCI-VSU-27", "LCI Banco Vale do Sul 2027", "fixed_income", "valesul", 2, 600, "CDI", "0.9300", True),
    Asset("DEB-VVE-31", "Debênture Energética Vale Verde 2031", "fixed_income", "valeverde", 3, 1800, "IPCA", "0.0720"),
    Asset("DEB-AGC-32", "Debênture Saneamento Água Clara 2032", "fixed_income", "aguaclara", 3, 2200, "IPCA", "0.0690"),
    # Vencimentos curtos: cenários plantados
    Asset("CDB-MER-VC", "CDB Banco Meridiano 115% CDI", "fixed_income", "meridiano", 2, 5, "CDI", "1.1500", True, special=True),
    Asset("CDB-LIT-VC", "CDB Banco Litoral 102% CDI", "fixed_income", "litoral", 2, 18, "CDI", "1.0200", True, special=True),
    Asset("LCA-SOL-VC", "LCA Banco Solar Agro 90% CDI", "fixed_income", "solar", 2, 24, "CDI", "0.9000", True, special=True),
    # Fora da XP (Open Finance)
    Asset("CDB-HOR-27", "CDB Banco Horizonte 2027", "fixed_income", "horizonte", 2, 500, "CDI", "1.0500", True, special=True),
    Asset("CDB-PIO-28", "CDB Banco Pioneiro Digital 2028", "fixed_income", "pioneiro", 2, 900, "CDI", "1.1000", True, special=True),
    Asset("FND-CUME-CP", "Cume Crédito Privado FIC FIM", "funds", "cume", 2, unit_price="2.85"),
    Asset("FND-ATLAS-RF", "Atlas Renda Fixa Ativa FIC", "funds", "atlas", 2, unit_price="1.94"),
    Asset("FND-PATIO-MM", "Pátio Macro Multimercado FIC", "funds", "patio", 3, unit_price="3.41"),
    Asset("FND-QNT-MM", "Quanta Quantitativo Multimercado", "funds", "quanta", 3, unit_price="1.67"),
    Asset("PREV-AMP-RF", "Amparo Previdência RF PGBL", "pension", "amparo", 2, unit_price="1.52"),
    Asset("PREV-CUME-MM", "Cume Previdência Multimercado VGBL", "pension", "cume", 3, unit_price="2.08"),
    Asset("PTLG11", "FII Pátio Logística", "real_estate", "patio", 3, unit_price="98.40"),
    Asset("ATRC11", "FII Atlas Recebíveis", "real_estate", "atlas", 3, unit_price="9.12"),
    Asset("CMLJ11", "FII Cume Lajes Corporativas", "real_estate", "cume", 3, unit_price="71.30"),
    Asset("VVER3", "Energética Vale Verde ON", "equities", "valeverde", 4, unit_price="38.15"),
    Asset("NLOG3", "Nortelog Logística ON", "equities", "nortelog", 4, unit_price="17.62"),
    Asset("CFAG3", "Campo Forte Agronegócio ON", "equities", "campoforte", 4, unit_price="24.90"),
    Asset("FMVD3", "Farmavida ON", "equities", "farmavida", 4, unit_price="52.07"),
    Asset("RSAB3", "Rede Saber Educação ON", "equities", "saber", 4, unit_price="8.44"),
    Asset("AGCL3", "Saneamento Água Clara ON", "equities", "aguaclara", 4, unit_price="61.33"),
    Asset("GLOB11", "ETF Mercados Globais", "international", "quanta", 4, unit_price="312.50"),
    Asset("QBTC11", "ETF Quanta Bitcoin", "crypto", "quanta", 5, unit_price="45.80"),
]
ASSET = {a.code: a for a in ASSETS}

# Faixas de alocação por classe (antes de normalizar)
TEMPLATES = {
    "conservative": {"cash": (0.01, 0.05), "fixed_income": (0.55, 0.75), "funds": (0.10, 0.20), "pension": (0.05, 0.15)},
    "moderate": {"cash": (0.01, 0.05), "fixed_income": (0.35, 0.50), "funds": (0.15, 0.25),
                 "real_estate": (0.08, 0.15), "pension": (0.05, 0.12)},
    "aggressive": {"cash": (0.01, 0.04), "fixed_income": (0.20, 0.30), "funds": (0.10, 0.18), "real_estate": (0.05, 0.12),
                   "equities": (0.20, 0.35), "international": (0.08, 0.15), "crypto": (0.02, 0.06)},
}

# -----------------------------------------------------------------------------
# Pessoas e textos
# -----------------------------------------------------------------------------

FIRST_NAMES = """Ana Beatriz Bruno Carla Daniel Eduarda Felipe Gabriela Gustavo Heloísa Igor Isabela Jorge Juliana
Leonardo Larissa Marcelo Mariana Nicolas Natália Otávio Patrícia Paulo Renata Rodrigo Sabrina Sérgio Tatiana
Thiago Vanessa Vinícius Yasmin André Bianca Caio Débora Elias Fernanda Fábio Giovana Henrique Ingrid Júlio Lívia
Murilo Priscila Rafael Simone Tomás Valéria Wagner Aline Diego Letícia Matheus Raquel Samuel Teresa Ulisses Viviane""".split()
LAST_NAMES = """Silva Santos Oliveira Souza Lima Pereira Ferreira Costa Rodrigues Almeida Nascimento Carvalho Araújo
Ribeiro Gomes Martins Barbosa Rocha Dias Teixeira Moreira Cardoso Correia Mendes Freitas Barros Pinto Cavalcanti
Monteiro Moura Vieira Nogueira Batista Campos Farias Guimarães Lopes Macedo Peixoto Queiroz Ramos Siqueira""".split()

CITIES = [
    ("São Paulo", "SP"), ("Campinas", "SP"), ("Ribeirão Preto", "SP"), ("Rio de Janeiro", "RJ"), ("Niterói", "RJ"),
    ("Belo Horizonte", "MG"), ("Uberlândia", "MG"), ("Montes Claros", "MG"), ("Curitiba", "PR"), ("Londrina", "PR"),
    ("Cascavel", "PR"), ("Porto Alegre", "RS"), ("Passo Fundo", "RS"), ("Florianópolis", "SC"), ("Chapecó", "SC"),
    ("Joinville", "SC"), ("Salvador", "BA"), ("Vitória da Conquista", "BA"), ("Recife", "PE"), ("Petrolina", "PE"),
    ("Fortaleza", "CE"), ("Juazeiro do Norte", "CE"), ("Goiânia", "GO"), ("Rio Verde", "GO"), ("Brasília", "DF"),
    ("Cuiabá", "MT"), ("Sinop", "MT"), ("Campo Grande", "MS"), ("Dourados", "MS"), ("Manaus", "AM"),
    ("Belém", "PA"), ("Marabá", "PA"), ("São Luís", "MA"), ("Teresina", "PI"), ("Natal", "RN"), ("Palmas", "TO"),
]

LIQUIDITY_NEEDS = [
    "Reserva para reforma da casa em 2027",
    "Pagamento da faculdade dos filhos a partir de 2028",
    "Possível troca de veículo no próximo ano",
    "Entrada de imóvel em cerca de dois anos",
    "Capital de giro para a empresa familiar",
]

THEMES = ["renda passiva", "aposentadoria", "sucessão", "imóveis", "educação dos filhos", "viagens",
          "proteção contra inflação", "investimentos no exterior", "benefício fiscal"]

GOAL_POOL = [
    ("Aposentadoria", 3.0, 15), ("Reserva de emergência", 0.15, 1), ("Faculdade dos filhos", 0.5, 8),
    ("Compra de imóvel", 0.8, 4), ("Viagem internacional", 0.05, 2), ("Troca de veículo", 0.12, 2),
]

INTERACTION_POOL = [
    ("Revisão periódica da carteira; cliente satisfeito com o desempenho da renda fixa.", "Manter a estratégia atual."),
    ("Cliente perguntou sobre o impacto de um ciclo de queda de juros nos investimentos.", None),
    ("Conversa sobre planejamento de aposentadoria e definição de aportes mensais.", "Iniciar aportes mensais."),
    ("Cliente pediu explicação sobre diferenças entre LCI, LCA e CDB, incluindo tributação.", None),
    ("Alinhamento sobre aporte extra vindo do bônus anual.", "Aportar em renda fixa pós-fixada."),
    ("Cliente comentou planos de viagem internacional; falamos sobre reserva em moeda forte.", None),
    ("Apresentação de fundos imobiliários como fonte de renda passiva.", "Avaliar com calma antes de investir."),
    ("Cliente demonstrou interesse em previdência para aproveitar benefício fiscal (PGBL).", None),
    ("Atualização cadastral e confirmação do perfil de investidor.", None),
    ("Cliente questionou a volatilidade recente da bolsa e o efeito na carteira.", "Manter posições."),
    ("Reunião anual de revisão de objetivos com o casal.", "Revisar metas no próximo semestre."),
]

ACTION_POOL = [
    "Enviar simulação de previdência PGBL",
    "Compartilhar relatório mensal da carteira",
    "Agendar revisão semestral",
    "Enviar material comparativo sobre fundos imobiliários",
    "Confirmar dados bancários para aporte extra",
]

CHANNELS = ["meeting", "call", "whatsapp", "email"]

NEWS = [
    # (título, resumo, horas atrás, tickers, emissores, classes, tópicos)
    ("Agência rebaixa rating do Banco Aurora e coloca perspectiva negativa",
     "Rebaixamento reflete piora na qualidade da carteira de crédito e menor liquidez do banco.",
     6, [], ["aurora"], [], ["crédito bancário", "rating"]),
    ("Copom mantém Selic e sinaliza cautela com inflação de serviços",
     "Comitê manteve a taxa básica e indicou que pode prolongar o ciclo de juros elevados.",
     20, [], [], ["fixed_income"], ["juros"]),
    ("Bitcoin recua 12% na semana com aversão global a risco",
     "Criptoativos acompanharam a queda de ativos de risco após dados fracos de atividade global.",
     30, ["QBTC11"], [], [], ["criptoativos", "volatilidade"]),
    ("Banco Meridiano amplia captação via CDB com taxas acima da média",
     "Banco oferece novas emissões pós-fixadas com liquidez diária e prazos curtos.",
     40, [], ["meridiano"], [], ["crédito bancário", "renda fixa"]),
    ("Energética Vale Verde anuncia novo parque eólico no Nordeste",
     "Investimento amplia a capacidade instalada da companhia em 15% até 2028.",
     50, ["VVER3"], ["valeverde"], [], ["energia"]),
    ("Nortelog reporta lucro acima do esperado no trimestre",
     "Resultado foi impulsionado pelo crescimento do e-commerce e pela redução de custos.",
     60, ["NLOG3"], [], [], ["resultados"]),
    ("Vacância de galpões logísticos cai pelo terceiro trimestre seguido",
     "Fundos imobiliários de logística se beneficiam da demanda por centros de distribuição.",
     70, ["PTLG11"], [], [], ["imóveis"]),
    ("Campo Forte Agronegócio enfrenta quebra de safra no Sul",
     "Estiagem prolongada deve reduzir a produção de grãos da companhia nesta temporada.",
     80, ["CFAG3"], ["campoforte"], [], ["agronegócio", "clima"]),
    ("Tesouro IPCA+ volta a pagar juro real acima de 6,5%",
     "Taxas dos títulos atrelados à inflação subiram com a revisão das expectativas fiscais.",
     90, ["TIPCA35"], [], [], ["juros", "inflação"]),
    ("Saneamento Água Clara conclui emissão de debêntures incentivadas",
     "Recursos serão usados na expansão da rede de esgoto em municípios do interior.",
     100, [], ["aguaclara"], [], ["infraestrutura"]),
    ("Dólar sobe com tensão comercial entre grandes economias",
     "Moeda americana avançou frente a emergentes, valorizando ativos no exterior em reais.",
     110, [], [], ["international"], ["câmbio"]),
    ("Farmavida recebe aprovação para novo medicamento genérico",
     "Aprovação abre mercado estimado em R$ 400 milhões por ano para a companhia.",
     120, ["FMVD3"], [], [], ["saúde"]),
    ("Inflação de setembro vem abaixo do esperado",
     "Alívio em alimentos e combustíveis fez o índice mensal desacelerar.",
     130, [], [], [], ["inflação"]),
    ("Banco Litoral conclui aquisição de fintech de crédito",
     "Operação amplia a base de clientes digitais do banco em cerca de 2 milhões.",
     140, [], ["litoral"], [], ["crédito bancário"]),
    ("Rede Saber Educação revisa projeções após queda de matrículas",
     "Companhia reduziu a estimativa de receita para o ano em 8%.",
     150, ["RSAB3"], ["saber"], [], ["educação"]),
    ("Banco Solar Agro tem rating reafirmado com perspectiva estável",
     "Agência destacou a carteira pulverizada de crédito rural do banco.",
     160, [], ["solar"], [], ["crédito bancário", "rating"]),
    # Fora da janela padrão de 7 dias do match_news_to_clients()
    ("Mercado de cripto atrai novos investidores pessoa física",
     "Número de investidores em criptoativos cresceu 30% em um ano.",
     200, [], [], ["crypto"], ["criptoativos"]),
    ("Atlas Capital lança fundo de recebíveis imobiliários",
     "Novo fundo terá foco em CRIs de incorporadoras de médio porte.",
     260, [], ["atlas"], [], ["imóveis"]),
    ("Previdência privada registra captação recorde no semestre",
     "Planos PGBL e VGBL lideraram a entrada de recursos.",
     300, [], [], ["pension"], ["previdência"]),
    ("Banco Vale do Sul expande operação no Centro-Oeste",
     "Banco abrirá 12 agências focadas no agronegócio.",
     400, [], ["valesul"], [], ["crédito bancário"]),
]

# -----------------------------------------------------------------------------
# Modelo em memória
# -----------------------------------------------------------------------------


@dataclass
class Position:
    code: str
    value: Decimal
    institution: str = "xp"
    held_days: int = 365   # há quantos dias a posição existe (caixa: parado)


@dataclass
class Client:
    key: str
    advisor: str
    name: str
    profile: str
    city: tuple[str, str]
    age: int
    positions: list[Position] = field(default_factory=list)
    consent_institution: str | None = None
    net_worth: Decimal | None = None
    suitability_days: int = 365
    horizon: int = 5
    liquidity_need: str | None = None
    preferences: dict = field(default_factory=dict)
    next_contact_days: float | None = None
    goals: list[tuple] = field(default_factory=list)            # (título, valor, dias até a meta, notas)
    interactions: list[tuple] = field(default_factory=list)     # (dias atrás, canal, resumo, decisões, [pendências])

    @property
    def id(self) -> str:
        return uid("client", self.key)

    def total(self) -> Decimal:
        return sum((p.value for p in self.positions), Decimal(0))


def issuer_exposure(c: Client) -> dict[str, float]:
    total = float(c.total())
    out: dict[str, float] = {}
    for p in c.positions:
        a = ASSET[p.code]
        if a.issuer and ISSUERS[a.issuer][1] != "government":
            out[a.issuer] = out.get(a.issuer, 0) + float(p.value) / total
    return out


def violations(c: Client, allow: set[str]) -> list[str]:
    """Espelha refresh_alerts() com margem; `allow` libera regras plantadas de propósito
    ("concentration:<emissor>" libera só aquele emissor)."""
    v = []
    total = float(c.total())
    if any(pct > 0.22 for iss, pct in issuer_exposure(c).items() if f"concentration:{iss}" not in allow):
        v.append("concentration")
    cash = sum(float(p.value) for p in c.positions if ASSET[p.code].asset_class == "cash")
    if "idle_cash" not in allow and cash / total >= 0.08:
        v.append("idle_cash")
    if len({ASSET[p.code].asset_class for p in c.positions}) < 3 and "low_div" not in allow:
        v.append("low_div")
    if any(ASSET[p.code].risk > MAX_RISK[c.profile] for p in c.positions):
        v.append("suitability")
    if "maturity" not in allow and any(
        (ASSET[p.code].maturity_days or 9999) <= 30 for p in c.positions
    ):
        v.append("maturity")
    return v


def split(weight: float, pool: list[Asset], max_each: float, exclude_issuers: set[str]) -> list[tuple[Asset, float]]:
    pool = [a for a in pool if a.issuer not in exclude_issuers]
    RNG.shuffle(pool)
    chosen, used = [], set()
    n = min(len(pool), max(1, math.ceil(weight / max_each) + RNG.randint(0, 1)))
    for a in pool:
        if len(chosen) == n:
            break
        if a.issuer in used:
            continue
        chosen.append(a)
        used.add(a.issuer)
    shares = [RNG.uniform(1, 2) for _ in chosen]
    s = sum(shares)
    return [(a, weight * sh / s) for a, sh in zip(chosen, shares)]


def build_portfolio(c: Client, total: Decimal, template: dict | None = None,
                    forced: list[tuple[str, float]] = (), allow: set[str] = frozenset()) -> None:
    """Sorteia uma carteira até ela respeitar as regras (exceto as em `allow`)."""
    template = template or TEMPLATES[c.profile]
    max_risk = MAX_RISK[c.profile]
    forced_issuers = {ASSET[code].issuer for code, _ in forced}
    for _ in range(500):
        weights = {k: RNG.uniform(*rng) for k, rng in template.items()}
        s = sum(weights.values())
        weights = {k: w / s for k, w in weights.items()}
        forced_total = sum(w for _, w in forced)
        picks: list[tuple[Asset, float]] = [(ASSET[code], w) for code, w in forced]
        for cls, w in weights.items():
            w *= 1 - forced_total
            pool = [a for a in ASSETS if a.asset_class == cls and a.risk <= max_risk and not a.special]
            if cls == "cash":
                picks.append((ASSET["CAIXA"], w))
            elif cls == "fixed_income":
                gov = [a for a in pool if a.issuer == "tesouro"]
                gov_w = w * RNG.uniform(0.3, 0.6)
                picks += split(gov_w, gov, 1.0, set())
                private = [a for a in pool if a.issuer != "tesouro"]
                picks += split(w - gov_w, private, 0.15, forced_issuers)
            else:
                picks += split(w, pool, 0.12, forced_issuers)
        c.positions = []
        merged: dict[str, float] = {}
        for a, w in picks:
            merged[a.code] = merged.get(a.code, 0) + w
        for code, w in merged.items():
            held = RNG.randint(2, 20) if code == "CAIXA" else RNG.randint(60, 900)
            c.positions.append(Position(code, money(float(total) * w), held_days=held))
        add_open_finance(c)
        if not violations(c, set(allow)):
            return
    raise RuntimeError(f"não consegui gerar carteira válida para {c.name}")


def add_open_finance(c: Client) -> None:
    if not c.consent_institution:
        return
    xp_total = float(c.total())
    c.positions.append(Position("CAIXA", money(xp_total * RNG.uniform(0.01, 0.03)),
                                c.consent_institution, RNG.randint(2, 20)))
    ext_asset = {"horizonte": "CDB-HOR-27", "pioneiro": "CDB-PIO-28"}.get(c.consent_institution)
    if ext_asset:
        c.positions.append(Position(ext_asset, money(xp_total * RNG.uniform(0.05, 0.12)),
                                    c.consent_institution, RNG.randint(90, 700)))


def random_client(advisor: str, idx: int, used_names: set[str]) -> Client:
    while True:
        name = f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)} {RNG.choice(LAST_NAMES)}"
        if name not in used_names and len(set(name.split()[1:])) == 2:
            used_names.add(name)
            break
    profile = RNG.choices(["conservative", "moderate", "aggressive"], [0.35, 0.45, 0.20])[0]
    c = Client(
        key=f"{advisor}-{idx}", advisor=advisor, name=name, profile=profile,
        city=RNG.choice(CITIES), age=RNG.randint(25, 78),
        consent_institution=RNG.choice(["horizonte", "pioneiro", "sulcred"]) if RNG.random() < 0.6 else None,
        suitability_days=RNG.randint(60, 700),
        horizon={"conservative": RNG.randint(1, 5), "moderate": RNG.randint(3, 10),
                 "aggressive": RNG.randint(5, 20)}[profile],
        liquidity_need=RNG.choice(LIQUIDITY_NEEDS) if RNG.random() < 0.25 else None,
        preferences={"canal": RNG.choice(["whatsapp", "ligação", "e-mail", "presencial"]),
                     "horario": RNG.choice(["manhã", "tarde", "noite"]),
                     "temas": RNG.sample(THEMES, 2)},
        next_contact_days=RNG.randint(1, 30) if RNG.random() < 0.5 else None,
    )
    total = money(min(8_000_000, max(60_000, math.exp(RNG.gauss(math.log(600_000), 0.9)))))
    build_portfolio(c, total)
    for _ in range(RNG.choices([0, 1, 2], [0.55, 0.35, 0.10])[0]):
        title, mult, years = RNG.choice(GOAL_POOL)
        if title not in [g[0] for g in c.goals]:
            c.goals.append((title, money(float(total) * mult * RNG.uniform(0.6, 1.4)),
                            int(years * 365 * RNG.uniform(0.7, 1.3)), None))
    for d in sorted(RNG.sample(range(15, 360), RNG.randint(1, 3))):
        summary, decision = RNG.choice(INTERACTION_POOL)
        actions = [(RNG.choice(ACTION_POOL), RNG.randint(-10, 20), RNG.random() < 0.4)] if RNG.random() < 0.3 else []
        c.interactions.append((d, RNG.choice(CHANNELS), summary, decision, actions))
    return c


# -----------------------------------------------------------------------------
# Clientes da demo
# -----------------------------------------------------------------------------


def demo_clients() -> list[Client]:
    helena = Client(
        key="demo-helena", advisor="ana", name="Helena Duarte", profile="moderate", city=("Petrolina", "PE"), age=54,
        positions=[
            Position("CDB-AUR-29", money(330_000), held_days=420),
            Position("LCI-AUR-28", money(246_000), held_days=380),
            Position("TIPCA35", money(170_000), held_days=700),
            Position("FND-CUME-CP", money(130_000), held_days=500),
            Position("PTLG11", money(100_000), held_days=300),
            Position("PREV-AMP-RF", money(80_000), held_days=1200),
            Position("CAIXA", money(24_000), held_days=6),
            Position("CDB-HOR-27", money(120_000), "horizonte", 400),
        ],
        consent_institution="horizonte", net_worth=money(1_650_000), suitability_days=210, horizon=12,
        preferences={"canal": "presencial", "horario": "manhã", "temas": ["aposentadoria", "segurança"]},
        next_contact_days=2,
        goals=[("Aposentadoria aos 60 anos", money(3_000_000), 6 * 365, "Quer renda mensal de R$ 15 mil")],
        interactions=[
            (45, "meeting",
             "Cliente comentou preocupação com a segurança dos investimentos após notícias sobre o setor bancário. "
             "Prefere renda fixa e pediu para avaliar a diversificação entre emissores.",
             "Manter as posições até a nova análise de emissores.",
             [("Enviar comparativo de emissores com rating e cobertura do FGC", -5, False)]),
            (160, "call", "Revisão semestral; cliente reforçou objetivo de se aposentar aos 60.", None, []),
            (330, "meeting", "Aporte de R$ 300 mil vindo da venda de um imóvel, alocado em CDB e LCI.",
             "Aplicar em CDB e LCI do Banco Aurora pela taxa.", []),
        ],
    )
    ricardo = Client(
        key="demo-ricardo", advisor="ana", name="Ricardo Mendes", profile="conservative", city=("Londrina", "PR"), age=41,
        positions=[
            Position("CDB-MER-VC", money(380_000), held_days=720),
            Position("TSELIC29", money(500_000), held_days=400),
            Position("LCA-SOL-28", money(300_000), held_days=350),
            Position("CDB-LIT-30", money(250_000), held_days=260),
            Position("FND-ATLAS-RF", money(200_000), held_days=500),
            Position("PREV-AMP-RF", money(140_000), held_days=900),
            Position("CAIXA", money(30_000), held_days=4),
            Position("CAIXA", money(45_000), "sulcred", 10),
        ],
        consent_institution="sulcred", net_worth=money(2_100_000), suitability_days=300, horizon=3,
        liquidity_need="Entrada de apartamento prevista para 2027 (cerca de R$ 400 mil)",
        preferences={"canal": "whatsapp", "horario": "noite", "temas": ["imóveis", "liquidez"]},
        next_contact_days=1,
        goals=[("Compra de apartamento", money(400_000), 420, "Valor da entrada; precisa de liquidez")],
        interactions=[
            (70, "whatsapp",
             "Cliente planeja comprar apartamento em 2027 e quer liquidez sem abrir mão de rentabilidade.",
             "Avaliar o destino do CDB Meridiano no vencimento.",
             [("Simular reinvestimento do CDB Meridiano em ativo com liquidez diária", 3, False)]),
            (250, "meeting", "Revisão anual; cliente satisfeito com a carteira conservadora.", None, []),
        ],
    )
    camila = Client(
        key="demo-camila", advisor="ana", name="Camila Rocha", profile="conservative", city=("Chapecó", "SC"), age=36,
        positions=[
            Position("CAIXA", money(260_000), held_days=75),
            Position("QBTC11", money(27_000), held_days=60),
            Position("TSELIC29", money(300_000), held_days=500),
            Position("CDB-LIT-30", money(150_000), held_days=300),
            Position("FND-CUME-CP", money(100_000), held_days=400),
            Position("PREV-AMP-RF", money(63_000), held_days=800),
        ],
        net_worth=None, suitability_days=400, horizon=4,
        preferences={"canal": "e-mail", "horario": "tarde", "temas": ["reserva de emergência"]},
        next_contact_days=-50,
        goals=[],
        interactions=[
            (80, "call",
             "Cliente informou o recebimento de uma herança e pediu tempo para decidir como investir.",
             "Retomar a conversa em 30 dias.",
             [("Apresentar proposta de alocação conservadora para os recursos da herança", -20, False)]),
            (200, "email", "Envio do relatório anual da carteira.", None, []),
        ],
    )
    return [helena, ricardo, camila]


def plant_scenarios(clients: list[Client]) -> None:
    """Alertas médios/baixos em clientes aleatórios da Ana, para dar realismo."""
    ana = [c for c in clients if c.advisor == "ana" and not c.key.startswith("demo")]
    eligible = [c for c in ana if c.profile != "aggressive"]
    picks = iter(eligible[::5])

    for code in ["CDB-LIT-VC", "LCA-SOL-VC", "CDB-LIT-VC", "LCA-SOL-VC"]:   # vencimento em 18/24 dias
        c = next(picks)
        build_portfolio(c, c.total(), forced=[(code, RNG.uniform(0.08, 0.12))], allow={"maturity"})
    for _ in range(3):                                                    # suitability vencendo
        next(picks).suitability_days = RNG.randint(10, 25)
    for _ in range(2):                                                    # caixa parado
        c = next(picks)
        build_portfolio(c, c.total(), forced=[("CAIXA", RNG.uniform(0.12, 0.16))], allow={"idle_cash"})
        next(p for p in c.positions if p.code == "CAIXA" and p.institution == "xp").held_days = RNG.randint(40, 60)
    for _ in range(2):                                                    # concentração média (~30%)
        c = next(picks)
        build_portfolio(c, c.total(), forced=[("CDB-VSU-29", 0.18), ("LCI-VSU-27", 0.12)],
                        allow={"concentration:valesul"})
    for _ in range(2):                                                    # baixa diversificação
        c = next(picks)
        c.consent_institution = None
        build_portfolio(c, max(c.total(), money(80_000)),
                        template={"cash": (0.02, 0.04), "fixed_income": (0.96, 0.98)}, allow={"low_div"})


def assign_net_worth(c: Client) -> None:
    if c.consent_institution and c.net_worth is None:
        c.net_worth = money(float(c.total()) * RNG.uniform(1.05, 1.5))


# -----------------------------------------------------------------------------
# SQL
# -----------------------------------------------------------------------------

ADVISORS = {
    "ana": ("Ana Souza", "ana.souza@demo.xpcopilot.dev", "Escritório Recife"),
    "bruno": ("Bruno Lima", "bruno.lima@demo.xpcopilot.dev", "Escritório Curitiba"),
}

APP_TABLES = ["advisors", "clients", "institutions", "issuers", "assets", "open_finance_consents", "positions",
              "goals", "interactions", "action_items", "alerts", "ai_logs", "briefings", "news_articles",
              "news_client_impacts", "portfolio_snapshots", "audit_log"]


def render(clients: list[Client]) -> str:
    out = [
        "-- =============================================================================\n"
        "-- Seed sintético do XP Advisor Copilot. ARQUIVO GERADO: não editar à mão.\n"
        "-- Fonte: database/generate_seed.py\n"
        "--\n"
        "-- APAGA todos os dados da aplicação antes de inserir (alert_rules é mantida).\n"
        f"-- Logins da demo (senha: {DEMO_PASSWORD}):\n"
        + "".join(f"--   {email}\n" for _, email, _ in ADVISORS.values())
        + "-- =============================================================================\n\n",
        "create extension if not exists pgcrypto with schema extensions;\n\n",
        f"truncate table {', '.join(APP_TABLES)} restart identity cascade;\n",
    ]
    advisor_ids = [uid("advisor", k) for k in ADVISORS]
    id_list = ", ".join(lit(i) for i in advisor_ids)
    out.append(f"delete from auth.identities where user_id in ({id_list});\n")
    out.append(f"delete from auth.users where id in ({id_list});\n\n")

    # Auth (Supabase GoTrue): usuário + identidade de e-mail
    users, identities, advisors = [], [], []
    for key, (name, email, office) in ADVISORS.items():
        aid = uid("advisor", key)
        users.append((
            "00000000-0000-0000-0000-000000000000", aid, "authenticated", "authenticated", email,
            Raw(f"extensions.crypt({lit(DEMO_PASSWORD)}, extensions.gen_salt('bf'))"), Raw("now()"),
            {"provider": "email", "providers": ["email"]}, {"full_name": name},
            Raw("now()"), Raw("now()"), "", "", "", "",
        ))
        identities.append((aid, aid, {"sub": aid, "email": email, "email_verified": True}, "email",
                           Raw("now()"), Raw("now()"), Raw("now()")))
        advisors.append((aid, name, email, office))
    out.append("-- Assessores\n")
    out.append(insert("auth.users", [
        "instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at",
        "raw_app_meta_data", "raw_user_meta_data", "created_at", "updated_at",
        "confirmation_token", "recovery_token", "email_change_token_new", "email_change"], users))
    out.append(insert("auth.identities", [
        "provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at"],
        identities))
    out.append(insert("advisors", ["id", "full_name", "email", "office"], advisors))

    # Catálogo
    out.append("-- Catálogo (fictício, exceto XP e Tesouro Nacional)\n")
    out.append(insert("institutions", ["id", "name", "is_xp"],
                      [(uid("inst", k), n, x) for k, (n, x) in INSTITUTIONS.items()]))
    out.append(insert("issuers", ["id", "name", "type"],
                      [(uid("issuer", k), n, Raw(f"'{t}'::issuer_type")) for k, (n, t) in ISSUERS.items()]))
    out.append(insert("assets", ["id", "code", "name", "asset_class", "issuer_id", "risk_level",
                                 "maturity_date", "indexer", "rate", "fgc_covered"], [
        (uid("asset", a.code), a.code, a.name, Raw(f"'{a.asset_class}'::asset_class"),
         uid("issuer", a.issuer) if a.issuer else None, a.risk,
         days(a.maturity_days) if a.maturity_days is not None else None,
         a.indexer, Decimal(a.rate) if a.rate else None, a.fgc) for a in ASSETS]))

    # Clientes
    rows = []
    for c in clients:
        rows.append((
            c.id, uid("advisor", c.advisor), c.name,
            days(-(c.age * 365 + RNG.randint(0, 364))), c.city[0], c.city[1],
            Raw(f"'{c.profile}'::risk_profile"), days(c.suitability_days), c.horizon, c.liquidity_need,
            c.preferences,
            ago(min(i[0] for i in c.interactions)) if c.interactions else None,
            (ahead(c.next_contact_days) if c.next_contact_days >= 0 else ago(-c.next_contact_days))
            if c.next_contact_days is not None else None,
            c.net_worth, ago(round(RNG.uniform(0.1, 2), 2)) if c.net_worth is not None else None,
        ))
    out.append(f"-- Clientes ({len(clients)})\n")
    out.append(insert("clients", [
        "id", "advisor_id", "full_name", "birthday", "city", "state", "risk_profile", "suitability_expires_at",
        "investment_horizon_yrs", "liquidity_need", "preferences", "last_contact_at", "next_contact_at",
        "net_worth", "net_worth_updated_at"], rows))

    consents, positions, goals, interactions, actions = [], [], [], [], []
    for c in clients:
        if c.consent_institution:
            consents.append((uid("consent", c.key), c.id, uid("inst", c.consent_institution),
                             Raw("'active'::consent_status"), ago(RNG.randint(30, 200)), ahead(RNG.randint(120, 330))))
        for p in c.positions:
            a = ASSET[p.code]
            ext = p.institution != "xp"
            ret = {1: 0.06, 2: 0.10, 3: 0.12, 4: 0.15, 5: 0.25}[a.risk] * min(p.held_days, 720) / 365
            invested = money(float(p.value) / (1 + RNG.uniform(-0.3, 1.0) * ret)) if a.asset_class != "cash" else p.value
            positions.append((
                uid("pos", c.key, p.code, p.institution), c.id, uid("asset", p.code), uid("inst", p.institution),
                Raw("'open_finance'::data_source" if ext else "'xp'::data_source"),
                uid("consent", c.key) if ext else None,
                (p.value / Decimal(a.unit_price)).quantize(Decimal("0.000001")),
                invested, p.value, days(-p.held_days),
            ))
        for i, (title, amount, due, notes) in enumerate(c.goals):
            goals.append((uid("goal", c.key, i), c.id, uid("advisor", c.advisor), title, amount, days(due), notes))
        for i, (d, channel, summary, decision, acts) in enumerate(c.interactions):
            iid = uid("interaction", c.key, i)
            interactions.append((iid, c.id, uid("advisor", c.advisor), ago(d),
                                 Raw(f"'{channel}'::interaction_channel"), summary, decision))
            for j, (desc, due, done) in enumerate(acts):
                actions.append((uid("action", c.key, i, j), c.id, iid, desc, days(due),
                                ago(max(1, d - 5)) if done else None))

    out.append("-- Open Finance\n")
    out.append(insert("open_finance_consents",
                      ["id", "client_id", "institution_id", "status", "granted_at", "expires_at"], consents))
    out.append("-- Carteiras\n")
    out.append(insert("positions", ["id", "client_id", "asset_id", "institution_id", "source", "consent_id",
                                    "quantity", "invested_value", "market_value", "held_since"], positions))
    out.append("-- Metas (opcionais, definidas pelo assessor)\n")
    out.append(insert("goals", ["id", "client_id", "advisor_id", "title", "target_amount", "target_date", "notes"], goals))
    out.append("-- Histórico de relacionamento (embeddings são gerados depois pelo backend)\n")
    out.append(insert("interactions", ["id", "client_id", "advisor_id", "occurred_at", "channel", "summary",
                                       "decisions"], interactions))
    out.append(insert("action_items", ["id", "client_id", "interaction_id", "description", "due_date", "done_at"],
                      actions))

    # Histórico patrimonial: 12 fotos mensais retroativas (a de hoje vem da função)
    snaps = []
    monthly = {"conservative": (0.008, 0.004), "moderate": (0.009, 0.010), "aggressive": (0.010, 0.030)}
    for c in clients:
        by_class: dict[str, float] = {}
        xp = ext = 0.0
        for p in c.positions:
            by_class[ASSET[p.code].asset_class] = by_class.get(ASSET[p.code].asset_class, 0) + float(p.value)
            if p.institution == "xp":
                xp += float(p.value)
            else:
                ext += float(p.value)
        factor = 1.0
        mu, sigma = monthly[c.profile]
        for m in range(1, 13):
            factor /= 1 + RNG.gauss(mu, sigma)
            bc = {k: money(v * factor) for k, v in by_class.items()}
            snaps.append((c.id, days(-30 * m), sum(bc.values(), Decimal(0)), money(xp * factor), money(ext * factor),
                          money(float(c.net_worth) * factor) if c.net_worth is not None else None,
                          {k: str(v) for k, v in bc.items()}))
    out.append("-- Histórico patrimonial (12 meses)\n")
    out.append(insert("portfolio_snapshots", ["client_id", "snapshot_date", "total_value", "xp_value",
                                              "external_value", "net_worth", "by_class"], snaps))

    # Notícias
    news = []
    for title, summary, hours, tickers, issuers, classes, topics in NEWS:
        slug = uid("news", title)[:8]
        news.append((uid("news", title), "sintetico", f"https://noticias.exemplo/sintetico/{slug}",
                     f"[Simulada] {title}", summary,
                     Raw(f"now() - interval '{hours} hours'"), text_array(tickers),
                     text_array([uid("issuer", i) for i in issuers], "uuid[]"),
                     text_array(classes, "asset_class[]"), text_array(topics)))
    out.append("-- Notícias (fictícias)\n")
    out.append(insert("news_articles", ["id", "source", "url", "title", "summary", "published_at", "tickers",
                                        "issuer_ids", "asset_classes", "topics"], news))

    out.append(
        "-- Processamentos derivados\n"
        "select refresh_alerts();\n"
        "select match_news_to_clients();\n"
        "select take_portfolio_snapshot();\n\n"
        "-- A demo começa com histórico de auditoria limpo\n"
        "truncate table audit_log restart identity;\n"
    )
    return "".join(out)


def main() -> None:
    used: set[str] = {"Helena Duarte", "Ricardo Mendes", "Camila Rocha"}
    clients = demo_clients()
    clients += [random_client("ana", i, used) for i in range(117)]
    clients += [random_client("bruno", i, used) for i in range(15)]
    plant_scenarios(clients)
    for c in clients:
        assign_net_worth(c)
    OUT.write_text(render(clients), encoding="utf-8", newline="\n")
    print(f"{OUT} gerado: {len(clients)} clientes, {sum(len(c.positions) for c in clients)} posições")


if __name__ == "__main__":
    main()
