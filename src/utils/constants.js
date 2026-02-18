export const sectors = [
  "RH",
  "Peças",
  "TI",
  "Funilaria",
  "Assistencia Técnica",
  "Financeira",
  "Pos vendas",
  "Qualidade",
  "Vendas",
  "Diretoria",
  "Marketing",
  "Trafego Avanti",
  "Segurança",
  "Veiculos seminovos",
  "Veiculos novos",
  "Trafego solaris",
  "Manutenção"
];

export const statuses = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PENDENTE: "Pendente"
};

export function isPrivilegedSector(sector) {
  return sector === "RH" || sector === "Peças";
}
