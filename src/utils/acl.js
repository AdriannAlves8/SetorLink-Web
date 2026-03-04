// Permissões por setor e destinos permitidos
export const acl = {
  RH: {
    send: true,
    view_sent: true,
    view_received: false,
    evaluate: false,
    delete_if_pending: true,
    reset_password: true,
    generate_invite: true,
    notifications: true,
    destinations: [
      "TI", "Peças", "Funilaria", "Assistencia Técnica", "Financeiro", "Pós-Vendas",
      "Qualidade", "Vendas", "Diretoria", "Marketing", "Tráfego Avanti", "Segurança",
      "Veículos Seminovos", "Veículos Novos", "Tráfego Solaris", "Manutenção"
    ],
    hidden_sent_from: ["Peças"]
  },
  "Peças": {
    send: true,
    view_sent: true,
    view_received: true,
    evaluate: true,
    delete_if_pending: true,
    reset_password: true,
    generate_invite: true,
    notifications: true,
    destinations: ["TI", "Veículos Novos", "Veículos Seminovos", "Assistencia Técnica","Pós-Vendas", "Funilaria", "Diretoria"],
    hidden_sent_from: ["RH"]
  },
  // Usuários comuns
  TI: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Funilaria: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Assistencia Técnica": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Financeiro: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Pós-Vendas": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Qualidade: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Vendas: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Diretoria: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Marketing: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Assistencia Técnica": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Tráfego Avanti": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  Segurança: { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Veículos Seminovos": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Veículos Novos": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Tráfego Solaris": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] },
  "Manutenção": { send: false, view_sent: false, view_received: true, evaluate: true, delete_if_pending: false, reset_password: false, notifications: true, destinations: [] }
};
