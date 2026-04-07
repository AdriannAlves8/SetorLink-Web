// Permissões: fluxo centralizado em Peças (pedidos de compra).
// setorDestino não é usado na lógica; qualquer setor autenticado pode enviar (send).

const base = {
  destinations: [],
  hidden_sent_from: []
};

const common = {
  send: true,
  view_sent: true,
  view_received: true, // Todos podem ver o que receberam de Peças para avaliar
  evaluate: true, // Todos podem aprovar/rejeitar o que receberam
  delete_if_pending: true,
  reset_password: false,
  notifications: true,
  ...base
};

export const acl = {
  "Estoque": { ...common },
  "Suprimentos": { ...common },
  "Vendas": { ...common },
  "Diretoria": { ...common },
  "Marketing": { ...common },
  "Tráfego Avanti": { ...common },
  "Tráfego Solaris": { ...common },
  "Segurança": { ...common },
  "Qualidade": { ...common },
  "RH": {
    send: true,
    view_sent: true,
    view_received: true, 
    evaluate: true,
    delete_if_pending: true,
    reset_password: true,
    notifications: true,
    ...base
  },
  "Financeiro": { ...common },
  "Assistência Técnica": { ...common },
  "Funilaria": { ...common },
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
  "TI": { ...common }
};
