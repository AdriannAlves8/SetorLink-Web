const base = {
  destinations: [],
  hidden_sent_from: []
};

const common = {
  send: true,
  view_sent: true,
  view_received: true, 
  evaluate: true, 
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
  "RH": { ...common},
  "Financeiro": { ...common },
  "Assistência Técnica": { ...common },
  "Funilaria": { ...common },
  "TI": { ...common },
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
  
};
