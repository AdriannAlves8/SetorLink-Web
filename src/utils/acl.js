/**
 * Perfis do sistema (3 tipos fixos)
 */
export const ROLES = {
  SUPORTE: "suporte",
  GESTOR: "gestor",
  OPERADOR: "operador"
};

export const ALL_ROLES = [ROLES.SUPORTE, ROLES.GESTOR, ROLES.OPERADOR];

/**
 * Chaves de permissão usadas no app e na API
 */
export const PERMISSIONS = {
  ADMIN_DASHBOARD: "admin.dashboard",
  MANAGE_USERS: "admin.users",
  MANAGE_SECTORS: "admin.sectors",
  MANAGE_PERMISSIONS: "admin.permissions",
  VIEW_LOGS: "admin.logs",

  CREATE_ORDER: "orders.create",
  VIEW_SENT: "orders.view_sent",
  VIEW_RECEIVED: "orders.view_received",
  /** Fila Pedidos para Atender (Peças ou encaminhados ao setor) — todos exceto Suporte */
  VIEW_ATTEND_QUEUE: "orders.view_attend_queue",
  EVALUATE_ORDER: "orders.evaluate",
  ATTEND_ORDER: "orders.attend",
  DELETE_PENDING: "orders.delete_pending",

  CREATE_NOTA: "notas.create",
  VIEW_NOTA_SENT: "notas.view_sent",
  VIEW_NOTA_RECEIVED: "notas.view_received",
  APPROVE_NOTA: "notas.approve",

  NOTIFICATIONS: "system.notifications",
  EXPORT_EXCEL: "system.export"
};

/** Permissões padrão por perfil (fonte de verdade no código) */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPORTE]: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SECTORS,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.NOTIFICATIONS
  ],
  [ROLES.GESTOR]: [
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.VIEW_SENT,
    PERMISSIONS.VIEW_RECEIVED,
    PERMISSIONS.VIEW_ATTEND_QUEUE,
    PERMISSIONS.EVALUATE_ORDER,
    PERMISSIONS.ATTEND_ORDER,
    PERMISSIONS.DELETE_PENDING,
    PERMISSIONS.CREATE_NOTA,
    PERMISSIONS.VIEW_NOTA_SENT,
    PERMISSIONS.VIEW_NOTA_RECEIVED,
    PERMISSIONS.APPROVE_NOTA,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.EXPORT_EXCEL
  ],
  [ROLES.OPERADOR]: [
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.VIEW_SENT,
    PERMISSIONS.VIEW_ATTEND_QUEUE,
    PERMISSIONS.EVALUATE_ORDER,
    PERMISSIONS.ATTEND_ORDER,
    PERMISSIONS.VIEW_NOTA_RECEIVED,
    PERMISSIONS.APPROVE_NOTA,
    PERMISSIONS.NOTIFICATIONS
  ]
};

/** Textos para UI (gerenciamento de usuários e permissões) */
export const ROLE_INFO = {
  [ROLES.SUPORTE]: {
    nome: "Suporte",
    descricao: "Administra o sistema: usuários, setores e configurações.",
    capacidades: [
      "Painel administrativo",
      "Gerenciar usuários e perfis",
      "Gerenciar setores",
      "Ver logs de auditoria",
      "Sincronizar permissões padrão"
    ]
  },
  [ROLES.GESTOR]: {
    nome: "Gestor",
    descricao: "Operação completa: fila de pedidos, notas fiscais e avaliações.",
    capacidades: [
      "Receber e atender pedidos (fila)",
      "Criar pedidos de compra",
      "Avaliar e finalizar pedidos",
      "Emitir notas fiscais",
      "Aprovar ou rejeitar notas fiscais",
      "Ver pedidos e notas enviados",
      "Exportar relatórios"
    ]
  },
  [ROLES.OPERADOR]: {
    nome: "Operador",
    descricao: "Cria pedidos, atende fila do setor e avalia notas recebidas.",
    capacidades: [
      "Criar pedidos de compra",
      "Pedidos para atender (após Peças encaminhar)",
      "Avaliar pedidos encaminhados ao setor",
      "Avaliar notas fiscais enviadas ao seu setor",
      "Ver pedidos enviados",
      "Não emite notas fiscais"
    ]
  }
};

const LEGACY_MAPPING = {
  gerenciar_usuarios: PERMISSIONS.MANAGE_USERS,
  "orders.evaluate_nota": PERMISSIONS.APPROVE_NOTA,
  "orders.create_nota": PERMISSIONS.CREATE_NOTA,
  send: PERMISSIONS.CREATE_ORDER,
  view_sent: PERMISSIONS.VIEW_SENT,
  view_received: PERMISSIONS.VIEW_RECEIVED,
  view_attend_queue: PERMISSIONS.VIEW_ATTEND_QUEUE,
  evaluate: PERMISSIONS.EVALUATE_ORDER,
  notifications: PERMISSIONS.NOTIFICATIONS
};

/** Mapeia nome legível do perfil → slug canônico */
const ROLE_NAME_TO_SLUG = {
  suporte: ROLES.SUPORTE,
  gestor: ROLES.GESTOR,
  operador: ROLES.OPERADOR
};

/**
 * Normaliza role_id vindo do banco (slug, nome ou $id de documento em `roles`).
 * @param {{ role_id?: string, role?: string, nome?: string } | string | null | undefined} input
 */
export function normalizeRoleSlug(input) {
  const roleId = typeof input === "object" && input !== null
    ? (input.role_id ?? input.role ?? "")
    : (input ?? "");
  const nome = typeof input === "object" && input !== null ? (input.nome ?? "") : "";

  const candidates = [roleId, nome].map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean);

  for (const c of candidates) {
    if (ALL_ROLES.includes(c)) return c;
    if (ROLE_NAME_TO_SLUG[c]) return ROLE_NAME_TO_SLUG[c];
  }

  for (const c of candidates) {
    if (c.includes("suporte")) return ROLES.SUPORTE;
    if (c.includes("gestor")) return ROLES.GESTOR;
    if (c.includes("operador")) return ROLES.OPERADOR;
  }

  return ROLES.OPERADOR;
}

export function resolveRole(user) {
  if (!user) return ROLES.OPERADOR;
  if (user.role && ALL_ROLES.includes(String(user.role).toLowerCase())) {
    return String(user.role).toLowerCase();
  }
  return normalizeRoleSlug(user);
}

/**
 * Permissões efetivas: sempre as definidas no código para cada perfil (3 tipos fixos).
 */
export function getEffectivePermissions(user) {
  if (!user) return [];
  const role = resolveRole(user);
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.OPERADOR];
  return perms?.length ? [...perms] : [...ROLE_PERMISSIONS[ROLES.OPERADOR]];
}

export function hasPermission(user, permission) {
  if (!user) return false;

  const perms = getEffectivePermissions(user);
  const requested = LEGACY_MAPPING[permission] || permission;

  if (perms.includes(requested) || perms.includes(permission)) return true;

  if (resolveRole(user) === ROLES.SUPORTE && String(requested).startsWith("admin.")) {
    return true;
  }

  return false;
}

export function can(user, permission) {
  return hasPermission(user, permission);
}
