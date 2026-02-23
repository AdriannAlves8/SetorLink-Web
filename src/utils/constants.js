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
  "Veiculos seminovos",
  "Veiculos novos",
  "Tráfego Solaris",
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
