export const sectors = [
  "RH",
  "Peças",
  "TI",
  "Funilaria",
  "Assistencia Técnica",
  "Financeiro",
  "Pós-Vendas",
  "Qualidade",
  "Vendas",
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
  "RH": "rh@gsapori.com",
  "Peças": "pecas@gsapori.com",
  "TI": "ti@gsapori.com",
  "Funilaria": "funilaria@gsapori.com",
  "Assistencia Técnica": "assistecnica@gsapori.com",
  "Financeiro": "financeiro@gsapori.com",
  "Pós-Vendas": "posvendas@gsapori.com",
  "Qualidade": "qualidade@gsapori.com",
  "Vendas": "vendas@gsapori.com",
  "Diretoria": "diretoria@gsapori.com",
  "Marketing": "marketing@gsapori.com",
  "Tráfego Avanti": "trafegoavanti@gsapori.com",
  "Segurança": "seguranca@gsapori.com",
  "Veículos Seminovos": "vseminovos@gsapori.com",
  "Veículos Novos": "vnovos@gsapori.com",
  "Tráfego Solaris": "trafegosolaris@gsapori.com",
  "Manutenção": "manutencao@gsapori.com"
};

export const statuses = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PENDENTE: "Pendente"
};

export function isPrivilegedSector(sector) {
  const n = String(sector || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return n === "rh" || n === "pecas";
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
