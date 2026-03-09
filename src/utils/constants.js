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
  "Manutenção": "pedroandre@solaristransportes.com.br"
};

export const statuses = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PENDENTE: "Pendente"
};

export function isPrivilegedSector(sector) {
  return sector === "RH" || sector === "Peças";
}

export function normalizeStatus(s) {
  const t = String(s || "").toLowerCase();
  if (t === "aprovado") return statuses.APROVADO;
  if (t === "reprovado") return statuses.REPROVADO;
  return statuses.PENDENTE;
}

export function statusClass(s) {
  const n = normalizeStatus(s);
  return n === statuses.APROVADO ? "aprovado" : n === statuses.REPROVADO ? "reprovado" : "pendente";
}
