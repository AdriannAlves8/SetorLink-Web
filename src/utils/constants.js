export const sectors = [
  "RH",
  "Peças",
  "TI",
  "Funilaria",
  "Financeiro",
  "Pós-Vendas",
  "Qualidade",
  "Vendas",
  "Assistencia Técnica",
  "Diretoria",
  "Marketing",
  "Tráfego Avanti",
  "Segurança",
  "Veículos Seminovos",
  "Veículos Novos",
  "Tráfego Solaris",
  "Suprimentos",
  "Estoque",
  "Manutenção"
];

export const sectorEmails = {
  "RH": ["aline@gsapori.com.br","gpessoas@gsapori.com.br"],
  "Peças": "thais@poligonofiat.com.br",
  "TI": ["william@gsapori.com.br", "ti@gsapori.com.br"],
  "Funilaria": "funilaria@poligonofiat.com.br",
  "Assistencia Técnica": "samanta@poligonofiat.com.br",
  "Financeiro": "kellen@gsapori.com.br ",
  "Pós-Vendas": "samanta@poligonofiat.com.br",
  "Qualidade": "matheusfreitas@gsapori.com.br",
  "Vendas": "rodrigomendes@poligonofiat.com.br",
  "Diretoria": "camialsapori@gsapori.com.br",
  "Marketing": "joaoneto@gsapori.com.br",
  "Tráfego Avanti": "pedrofrancisco@viacaoavanti.com.br",
  "Segurança": "anafurtado@gsapori.com.br",
  "Veículos Seminovos": "rodrigomendes@poligonofiat.com.br",
  "Veículos Novos": "rodrigomendes@poligonofiat.com.br",
  "Tráfego Solaris": "pedroandre@solaristransportes.com.br",
  "Suprimentos": "suprimentos@gsapori.com.br",
  "Estoque": "estoque@gsapori.com.br",
  "Manutenção": "pedroandre@solaristransportes.com.br"
};

/** Valores gravados no Appwrite para novos pedidos (Pedido de Compra centralizado em Peças) */
export const statuses = {
  PENDENTE: "PENDENTE",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  FINALIZADO: "FINALIZADO",
  REJEITADO: "REJEITADO"
};

function normKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Converte qualquer status legado ou atual para um dos valores canônicos em `statuses`.
 * Legado: "Pendente"/"Aprovado"/"Reprovado" → PENDENTE / FINALIZADO / REJEITADO
 */
export function normalizeStatus(s) {
  const raw = String(s ?? "").trim();
  const n = normKey(raw);

  if (raw === statuses.PENDENTE || raw === statuses.EM_ATENDIMENTO || raw === statuses.FINALIZADO || raw === statuses.REJEITADO) {
    return raw;
  }
  if (n === "pendente") return statuses.PENDENTE;
  if (n === "em_atendimento" || n === "ematendimento") return statuses.EM_ATENDIMENTO;
  if (n === "finalizado" || n === "aprovado") return statuses.FINALIZADO;
  if (n === "rejeitado" || n === "reprovado") return statuses.REJEITADO;

  return statuses.PENDENTE;
}

/** Texto para exibição na UI */
export function statusLabel(s) {
  const n = normalizeStatus(s);
  switch (n) {
    case statuses.PENDENTE: return "Pendente";
    case statuses.EM_ATENDIMENTO: return "Em atendimento";
    case statuses.FINALIZADO: return "Finalizado";
    case statuses.REJEITADO: return "Rejeitado";
    default: return String(s || "—");
  }
}

export function isPecasSector(sector) {
  return normKey(sector) === "pecas";
}

export function isPrivilegedSector(sector) {
  return sector === "RH" || sector === "Peças";
}

export function statusClass(s) {
  const n = normalizeStatus(s);
  if (n === statuses.FINALIZADO) return "finalizado";
  if (n === statuses.REJEITADO) return "rejeitado";
  if (n === statuses.EM_ATENDIMENTO) return "em_atendimento";
  if (n === statuses.PENDENTE) return "pendente";
  return "pendente";
}
