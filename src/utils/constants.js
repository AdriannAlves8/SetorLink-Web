export const sectors = [
  "Estoque",
  "Suprimentos",
  "Vendas",
  "Diretoria",
  "Marketing",
  "Tráfego Avanti",
  "Tráfego Solaris",
  "Segurança",
  "Qualidade",
  "RH",
  "Financeiro",
  "Assistência Técnica",
  "Funilaria",
  "Peças",
  "TI"
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
  "Suprimentos": "suprimentos@poligonofiat.com.br",
  "Estoque": "estoque@poligonofiat.com.br",
  "Manutenção": "pedroandre@solaristransportes.com.br"
};

export const statuses = {
  PENDENTE: "CRIADO",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  ENCAMINHADO: "ENCAMINHADO",
  APROVADO: "APROVADO",
  FINALIZADO: "FINALIZADO",
  RECUSADO: "RECUSADO"
};

function normKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**np
 * Converte qualquer status legado ou atual para um dos valores canônicos em `statuses`.
 */
export function normalizeStatus(s) {
  const raw = String(s ?? "").trim();
  const n = normKey(raw);

  if (Object.values(statuses).includes(raw)) {
    return raw;
  }
  
  if (n === "pendente" || n === "criado" || n === "em_analise" || n === "emanalise") return statuses.PENDENTE;
  if (n === "em_atendimento" || n === "ematendimento") return statuses.EM_ATENDIMENTO;
  if (n === "encaminhado") return statuses.ENCAMINHADO;
  if (n === "aprovado_setor" || n === "aprovado") return statuses.APROVADO;
  if (n === "finalizado") return statuses.FINALIZADO;
  if (n === "rejeitado" || n === "reprovado" || n === "recusado") return statuses.RECUSADO;

  return statuses.PENDENTE;
}

/** Texto para exibição na UI */
export function statusLabel(s) {
  const n = normalizeStatus(s);
  switch (n) {
    case statuses.PENDENTE: return "Em análise";
    case statuses.EM_ATENDIMENTO: return "Em atendimento";
    case statuses.ENCAMINHADO: return "Encaminhado";
    case statuses.APROVADO: return "Aprovado (Aguardando compra)";
    case statuses.FINALIZADO: return "Finalizado";
    case statuses.RECUSADO: return "Rejeitado";
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
  if (n === statuses.FINALIZADO) return "finalizado"; // Verde escuro
  if (n === statuses.APROVADO) return "aprovado"; // Verde claro
  if (n === statuses.RECUSADO) return "rejeitado"; // Vermelho
  if (n === statuses.EM_ATENDIMENTO) return "em_atendimento"; // Azul
  if (n === statuses.ENCAMINHADO) return "encaminhado"; // Roxo ou Azul claro
  if (n === statuses.PENDENTE) return "pendente"; // Laranja
  return "pendente";
}
