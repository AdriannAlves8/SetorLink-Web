// Permissões: fluxo centralizado em Peças (pedidos de compra).
// setorDestino não é usado na lógica; qualquer setor autenticado pode enviar (send).

const base = {
  destinations: [],
  hidden_sent_from: []
};

const common = {
  send: true,
  view_sent: true,
  view_received: false,
  evaluate: false,
  delete_if_pending: true,
  reset_password: false,
  notifications: true,
  ...base
};

export const acl = {
  RH: {
    send: true,
    view_sent: true,
    view_received: false,
    evaluate: false,
    delete_if_pending: true,
    reset_password: true,
    notifications: true,
    ...base
  },
  "Peças": {
    send: true,
    view_sent: true,
    view_received: true,
    evaluate: true,
    delete_if_pending: true,
    reset_password: false,
    notifications: true,
    ...base
  },
  TI: { ...common },
  Funilaria: { ...common },
  "Assistencia Técnica": { ...common },
  Financeiro: { ...common },
  "Pós-Vendas": { ...common },
  Qualidade: { ...common },
  Vendas: { ...common },
  Diretoria: { ...common },
  Marketing: { ...common },
  "Tráfego Avanti": { ...common },
  Segurança: { ...common },
  "Tráfego Solaris": { ...common },
  "Veículos Seminovos": { ...common },
  "Veículos Novos": { ...common },
  Suprimentos: { ...common },
  Estoque: { ...common },
  Manutenção: { ...common }
};
