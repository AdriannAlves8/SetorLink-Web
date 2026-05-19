import { Client, Databases, Storage, ID, Query, Account } from "appwrite";
import { statuses, sectorEmails, normalizeStatus, statusLabel, isPecasSector, sectors } from "../utils/constants.js";
import { ROLES, ALL_ROLES, ROLE_PERMISSIONS, ROLE_INFO, hasPermission, PERMISSIONS, getEffectivePermissions, resolveRole, normalizeRoleSlug } from "../utils/acl.js";

/* ================================
   CONFIGURAÇÕES
================================ */

const LS = {
  session: "setorlink.session"
};

const {
  VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT,
  VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_COLLECTION_PROPOSTAS,
  VITE_APPWRITE_COLLECTION_NOTIFICACOES,
  VITE_APPWRITE_COLLECTION_USUARIOS,
  VITE_APPWRITE_COLLECTION_NOTAS_FISCAIS,
  VITE_APPWRITE_BUCKET_ID,
  VITE_APPWRITE_COLLECTION_CONVITES,
  VITE_APPWRITE_COLLECTION_LOGS,
  VITE_CANONICAL_URL,
  VITE_FIREBASE_DL_DOMAIN,
  VITE_FIREBASE_DL_API_KEY
} = import.meta.env;

if (!VITE_APPWRITE_ENDPOINT) throw new Error("VITE_APPWRITE_ENDPOINT não definido");
if (!VITE_APPWRITE_PROJECT) throw new Error("VITE_APPWRITE_PROJECT não definido");
if (!VITE_APPWRITE_DATABASE_ID) throw new Error("VITE_APPWRITE_DATABASE_ID não definido");

const DB_ID = VITE_APPWRITE_DATABASE_ID;
const COL_PROPOSTAS = VITE_APPWRITE_COLLECTION_PROPOSTAS;
const COL_NOTIFICACOES = VITE_APPWRITE_COLLECTION_NOTIFICACOES;
const COL_USUARIOS = VITE_APPWRITE_COLLECTION_USUARIOS;
const COL_LOGS = VITE_APPWRITE_COLLECTION_LOGS || "logs";
const COL_SETORES = import.meta.env.VITE_APPWRITE_COLLECTION_SETORES || "setores";
const COL_PERMISSOES = import.meta.env.VITE_APPWRITE_COLLECTION_PERMISSOES || "permissoes";
const COL_ROLES = import.meta.env.VITE_APPWRITE_COLLECTION_ROLES || "roles";
const COL_ROLE_PERMISSOES = import.meta.env.VITE_APPWRITE_COLLECTION_ROLE_PERMISSOES || "role_permissoes";
const BUCKET_ID = VITE_APPWRITE_BUCKET_ID || null;
const COL_CONVITES = VITE_APPWRITE_COLLECTION_CONVITES || null;

/* ================================
   CLIENT
================================ */

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT);

const databases = new Databases(client);
const storage = new Storage(client);
const account = new Account(client);

/* ================================
   REALTIME
================================ */

export const CHANNELS = {
  PROPOSTAS: `databases.${DB_ID}.collections.${COL_PROPOSTAS}.documents`,
  NOTIFICACOES: `databases.${DB_ID}.collections.${COL_NOTIFICACOES}.documents`,
  LOGS: `databases.${DB_ID}.collections.${COL_LOGS}.documents`,
  USUARIOS: `databases.${DB_ID}.collections.${COL_USUARIOS}.documents`,
  SETORES: `databases.${DB_ID}.collections.${COL_SETORES}.documents`,
  PERMISSOES: `databases.${DB_ID}.collections.${COL_PERMISSOES}.documents`,
  ROLES: `databases.${DB_ID}.collections.${COL_ROLES}.documents`,
  ROLE_PERMISSOES: `databases.${DB_ID}.collections.${COL_ROLE_PERMISSOES}.documents`,
};

export function subscribe(channels, callback) {
  return client.subscribe(channels, callback);
}

/* ================================
   SESSION / ACCOUNT
================================ */

async function getAccount() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

async function createEmailPasswordSessionCompat(email, password) {
  const fn = account.createEmailPasswordSession;
  if (typeof fn === "function") {
    try {
      // Try positional
      return await fn.call(account, email, password);
    } catch {
      // Try object form
      try {
        return await fn.call(account, { email, password });
      } catch {}
    }
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }
  throw new Error("Sessão por e-mail não suportada pela versão do SDK");
}
async function listSessionsCompat() {
  try {
    const res = await account.listSessions();
    const arr = res?.sessions || res?.documents || (Array.isArray(res) ? res : []);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function createEmailSessionWithSessionCap(email, password) {
  try {
    const sessions = await listSessionsCompat();
    if (sessions.length >= 3) {
      const oldest = [...sessions].sort((a, b) => new Date(a?.$createdAt || 0) - new Date(b?.$createdAt || 0))[0];
      if (oldest?.$id) {
        try { await account.deleteSession(oldest.$id); } catch {}
      }
    }
    try { await account.deleteSession("current"); } catch {}
  } catch {}
  return await createEmailPasswordSessionCompat(email, password);
}

const genSafeId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

async function createAccountCompat({ email, password, name, userId }) {
  const safeId = userId || genSafeId();
  
  // No SDK v13 (versão atual do projeto), o account.create usa parâmetros posicionais.
  // A assinatura é: create(userId, email, password, name)
  try {
    return await account.create(safeId, email, password, name || email);
  } catch (err) {
    // Se falhar, tenta o formato de objeto (SDK v14+)
    try {
      return await account.create({ userId: safeId, email, password, name });
    } catch (err2) {
      throw err; // Lança o erro original se ambos falharem
    }
  }
}

async function createVerificationCompat(redirect) {
  if (typeof account.createVerification === "function") {
    try {
      return await account.createVerification(redirect);
    } catch {
      return await account.createVerification({ url: redirect });
    }
  }
  throw new Error("Verificação por e-mail não suportada");
}

async function updateVerificationCompat(userId, secret) {
  if (typeof account.updateVerification === "function") {
    try {
      return await account.updateVerification(userId, secret);
    } catch {
      return await account.updateVerification({ userId, secret });
    }
  }
  throw new Error("Atualização de verificação não suportada");
}

async function createRecoveryCompat(email, redirect) {
  if (typeof account.createRecovery === "function") {
    try {
      return await account.createRecovery(email, redirect);
    } catch {
      return await account.createRecovery({ email, url: redirect });
    }
  }
  throw new Error("Recuperação por e-mail não suportada");
}

async function updateRecoveryCompat(userId, secret, password, confirmPassword) {
  if (typeof account.updateRecovery === "function") {
    try {
      return await account.updateRecovery(userId, secret, password, confirmPassword);
    } catch {
      return await account.updateRecovery({ userId, secret, password, passwordAgain: confirmPassword || password });
    }
  }
  throw new Error("Atualização de recuperação não suportada");
}

async function findUsuarioByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  try {
    const list = await databases.listDocuments(DB_ID, COL_USUARIOS, [
      Query.equal("email", e),
      Query.limit(1)
    ]);
    return list.total > 0 ? list.documents[0] : null;
  } catch {
    return null;
  }
}

async function linkUsuarioToAuth(doc, authUserId, email = "") {
  if (!doc || !authUserId) return doc;
  const patch = {};
  if (doc.uid !== authUserId) patch.uid = authUserId;
  if (email && doc.email !== email) patch.email = email;
  if (!Object.keys(patch).length) return doc;
  try {
    return await databases.updateDocument(DB_ID, COL_USUARIOS, doc.$id, patch);
  } catch (err) {
    console.warn("linkUsuarioToAuth:", err);
    return doc;
  }
}

async function getOrCreateUserExtras(userId, email = "") {
  try {
    return await databases.getDocument(DB_ID, COL_USUARIOS, userId);
  } catch {
    try {
      const byUid = await databases.listDocuments(DB_ID, COL_USUARIOS, [
        Query.equal("uid", userId),
        Query.limit(1)
      ]);
      if (byUid.total > 0) {
        return await linkUsuarioToAuth(byUid.documents[0], userId, email);
      }

      const byEmail = await findUsuarioByEmail(email);
      if (byEmail) {
        return await linkUsuarioToAuth(byEmail, userId, email);
      }

      const setor = sectorFromEmail(email) || "—";
      return await databases.createDocument(DB_ID, COL_USUARIOS, userId, {
        uid: userId,
        email: email || "",
        nome: email ? email.split("@")[0] : "Usuário",
        setor,
        role_id: ROLES.OPERADOR,
        setor_id: null,
        ativo: true,
        isAdmin: false
      });
    } catch (err) {
      console.warn("Erro ao obter/criar extras:", err);
      return null;
    }
  }
}

/**
 * Helper para validar permissões no backend (simulado via SDK).
 * Deve ser chamado no início de cada função sensível.
 */
async function assertPermission(permission) {
  const user = await getUser();
  if (!user) throw new Error("Não autenticado");
  
  // Fallback para o administrador mestre (redundância se o banco falhar ou não estiver configurado)
  if (user.email === "adriannalvesdev@gmail.com") return user;

  const hasPerm = hasPermission(user, permission);
  if (!hasPerm) {
    throw new Error(`Permissão negada: ${permission}`);
  }
  return user;
}

export async function getUser() {
  const acc = await getAccount();
  if (!acc) return null;
  const extras = await getOrCreateUserExtras(acc.$id, acc.email);
  
  if (extras?.deleted_at || extras?.isDeleted || extras?.ativo === false || extras?.status === "Inativo") {
    try { await account.deleteSession("current"); } catch {}
    return null;
  }

  const avatarRef = extras?.avatar || extras?.fotoStoragePath || null;
  let avatarUrl = null;
  if (avatarRef) {
    const s = String(avatarRef || "");
    avatarUrl = /^https?:\/\//i.test(s) ? s : (BUCKET_ID ? storage.getFileView(BUCKET_ID, s).href : s);
  }

  // Busca as permissões dinâmicas da Role (Única fonte de verdade)
  let permissions = [];

  if (extras?.role_id) {
    try {
      const rolePerms = await databases.listDocuments(DB_ID, COL_ROLE_PERMISSOES, [
        Query.equal("role_id", extras.role_id),
        Query.equal("permitido", true),
        Query.limit(100)
      ]);
      
      if (rolePerms.total > 0) {
        const permIds = rolePerms.documents.map(rp => rp.permissao_id);
        const perms = await databases.listDocuments(DB_ID, COL_PERMISSOES, [
          Query.equal("$id", permIds),
          Query.equal("ativo", true)
        ]);
        permissions = perms.documents.map(p => p.chave);
      }
    } catch (err) {
      console.warn("Erro ao carregar permissões dinâmicas:", err);
    }
  }

  const roleSlug = normalizeRoleSlug({
    role_id: extras?.role_id,
    role: extras?.role
  });
  const effectivePermissions = getEffectivePermissions({ role: roleSlug, role_id: roleSlug });

  return {
    uid: acc.$id,
    id: acc.$id, // Alias para consistência
    email: acc.email || extras?.email || "",
    sector: extras?.setor || extras?.sector || "",
    setor_id: extras?.setor_id || null,
    name: extras?.nome || extras?.name || acc.name || "",
    avatar: avatarUrl,
    role: roleSlug,
    role_id: roleSlug,
    permissions: effectivePermissions,
    isActive: extras?.ativo ?? (extras?.status !== "Inativo"),
    isAdmin: roleSlug === ROLES.SUPORTE,
    setor: extras?.setor || extras?.sector || "",
    senhaTemporaria: extras?.senhaTemporaria || ""
  };
}

export async function logout() {
  try {
    await account.deleteSession("current");
  } catch {}
}

/* ================================
   AUTH (Account API) com setor+senha
================================ */

function sectorToEmail(sector) {
  let email = sectorEmails[sector];
  if (Array.isArray(email)) {
    email = email.find((v) => v && String(v).trim());
  }
  if (email) return String(email).trim();
  const base = String(sector || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
  return `${base}@setorlink.local`;
}

function sectorFromEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  for (const [sec, em] of Object.entries(sectorEmails)) {
    if (Array.isArray(em)) {
      if (em.some((v) => String(v || "").trim().toLowerCase() === e)) return sec;
    } else {
      if (String(em || "").trim().toLowerCase() === e) return sec;
    }
  }
  return null;
}

export async function login(sector, password) {
  let mapped = sectorEmails[sector];
  if (Array.isArray(mapped)) mapped = mapped.find(v => v && String(v).trim());
  mapped = mapped ? String(mapped).trim() : null;
  const synthetic = String(sector || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, "") + "@setorlink.local";

  const tryLogin = async (em) => {
    await createEmailSessionWithSessionCap(em, password);
    return await getAccount();
  };

  let acc = null;
  if (mapped) {
    try { acc = await tryLogin(mapped); } catch {}
  }
  if (!acc) {
    try {
      acc = await tryLogin(synthetic);
    } catch {
      await createAccountCompat({ email: synthetic, password, name: sector });
      acc = await tryLogin(synthetic);
    }
  }
  if (!acc) throw new Error("Falha ao obter usuário");
  const domainAcc = String(acc.email || "").split("@")[1] || "";
  const isSynthetic = domainAcc === "setorlink.local";
  if (!isSynthetic && acc.emailVerification === false) {
    try { await account.deleteSession("current"); } catch {}
    throw new Error("EMAIL_NAO_VERIFICADO");
  }
  try {
    const extras = await getOrCreateUserExtras(acc.$id, acc.email);
    if (!extras?.setor || extras.setor !== sector) {
      await databases.updateDocument(DB_ID, COL_USUARIOS, extras?.$id || acc.$id, {
        setor: sector,
        nome: extras?.nome || sector,
        email: acc.email || extras?.email || "",
        isAdmin: sector === "RH",
        ultimoAcesso: new Date().toISOString()
      });
    } else {
      await databases.updateDocument(DB_ID, COL_USUARIOS, extras?.$id || acc.$id, {
        ultimoAcesso: new Date().toISOString()
      });
    }
  } catch {}
  const user = await getUser();
  return user;
}

export async function resendVerification(redirect) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let base = VITE_CANONICAL_URL || origin;
  
  const isLocalCanonical = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(String(VITE_CANONICAL_URL || ""));
  if (isLocalCanonical && origin && !/localhost|127\.0\.0\.1/.test(origin)) {
    base = origin;
  }
  
  const url = redirect || `${base}/verify`;
  await createVerificationCompat(url);
  return true;
}

export async function updateEmailVerification(userId, secret) {
  await updateVerificationCompat(userId, secret);
  return true;
}

export async function loginByEmail(email, password) {
  try {
    // Tenta o login normal primeiro
    await createEmailSessionWithSessionCap(email, password);
  } catch (err) {
    // Se falhar, verifica se é um usuário preparado pelo SUPORTE que ainda não foi "ativado" no Auth
    const list = await databases.listDocuments(DB_ID, COL_USUARIOS, [
      Query.equal("email", email),
      Query.limit(1)
    ]);

    const dbUser = list.documents[0];
    if (dbUser && dbUser.senhaTemporaria === password) {
      // Usuário existe no banco e a senha confere! Vamos criar a conta de Auth agora.
      try {
        await createAccountCompat({ 
          email: dbUser.email, 
          password: password, 
          name: dbUser.nome,
          userId: dbUser.$id || dbUser.uid
        });
        // Agora que a conta de Auth existe, tenta logar novamente
        await createEmailSessionWithSessionCap(email, password);
      } catch (createErr) {
        throw new Error("Falha ao ativar conta. Entre em contato com o Suporte.");
      }
    } else {
      // Se não for um usuário preparado ou a senha estiver errada, joga o erro original
      throw err;
    }
  }

  const acc = await getAccount();
  if (!acc) throw new Error("Falha ao obter usuário");
  const domain = String(acc.email || "").split("@")[1] || "";
  const isSynthetic = domain === "setorlink.local";
  
  if (!isSynthetic && acc.emailVerification === false) {
    try { await account.deleteSession("current"); } catch {}
    throw new Error("EMAIL_NAO_VERIFICADO");
  }

  // Sincroniza dados do banco e garante que o UID do Auth seja gravado no documento
  try {
    const extras = await getOrCreateUserExtras(acc.$id, acc.email);
    const sec = sectorFromEmail(acc.email);
    const payload = { uid: acc.$id };

    if (!extras?.email || extras.email !== acc.email) payload.email = acc.email;
    if (sec && extras?.setor !== sec) payload.setor = sec;

    if (acc.email === "adriannalvesdev@gmail.com") {
      payload.isAdmin = true;
      payload.role_id = ROLES.SUPORTE;
    }

    const currentSlug = normalizeRoleSlug(extras);
    if (currentSlug && extras?.role_id !== currentSlug) {
      payload.role_id = currentSlug;
    }

    payload.ultimoAcesso = new Date().toISOString();

    await databases.updateDocument(DB_ID, COL_USUARIOS, extras?.$id || acc.$id, payload);
  } catch (err) {
    console.warn("Erro na sincronização pós-login:", err);
  }

  return await getUser();
}

/* ================================
   DOCUMENTOS
================================ */

function optStr(v) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Valor numérico opcional: vazio → null; número válido → float */
function optValor(v) {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (Number.isNaN(n)) return null;
  return n;
}

export async function createNotification({ titulo, mensagem, destinatarioSetor, propostaId, tipo }) {
  const now = new Date().toISOString();
  try {
    // No seu banco o atributo está como "propostald" (com L minúsculo no lugar do i)
    const existing = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [
      Query.equal("propostald", propostaId),
      Query.equal("destinatarioSetor", destinatarioSetor),
      Query.limit(1)
    ]);

    if (existing.total > 0 || existing.documents.length > 0) {
      const notifId = existing.documents[0].$id;
      return await databases.updateDocument(DB_ID, COL_NOTIFICACOES, notifId, {
        titulo,
        mensagem: mensagem || existing.documents[0].mensagem,
        tipo,
        data: now,
        lida: false
      });
    } else {
      return await databases.createDocument(DB_ID, COL_NOTIFICACOES, ID.unique(), {
        titulo,
        mensagem,
        destinatarioSetor,
        propostald: propostaId,
        tipo,
        data: now,
        lida: false
      });
    }
  } catch (err) {
    console.warn("Falha ao gerenciar notificação:", err);
    return null;
  }
}

export async function sendDocument({
  title,
  description,
  file,
  fileData,
  senderSector,
  targetSector: _targetIgnored,
  nomeProduto,
  codigoProduto,
  finalidade,
  recorrente = false,
  valor
}) {
  await assertPermission(PERMISSIONS.CREATE_ORDER);
  const now = new Date().toISOString();
  let pdfUri = null;

  if (file && BUCKET_ID) {
    const fileDoc = await storage.createFile(BUCKET_ID, ID.unique(), file);
    pdfUri = fileDoc.$id;
  } else {
    pdfUri = fileData || null;
  }

  const acc = await getAccount();
  const uidCriador = acc?.$id || "";

  const doc = await databases.createDocument(DB_ID, COL_PROPOSTAS, ID.unique(), {
    titulo: title,
    descricao: description,
    setor: senderSector,
    authorSetor: senderSector,
    setorDestino: "Peças",
    status: statuses.PENDENTE,
    data: now,
    pdfUri, 
    uidCriador,
    nomeProduto: optStr(nomeProduto),
    codigoProduto: optStr(codigoProduto),
    finalidade: optStr(finalidade),
    recorrente: Boolean(recorrente),
    valor: optValor(valor)
  });

  // Notificação inicial: "Pedido criado e enviado para Peças"
  await createNotification({
    titulo: "Pedido criado e enviado para Peças",
    mensagem: title,
    destinatarioSetor: "Peças",
    propostaId: doc.$id,
    tipo: statuses.PENDENTE
  });

  // Também notifica o criador para ele saber que foi enviado
  if (!isPecasSector(senderSector)) {
    await createNotification({
      titulo: "Seu pedido foi enviado para Peças",
      mensagem: title,
      destinatarioSetor: senderSector,
      propostaId: doc.$id,
      tipo: statuses.PENDENTE
    });
  }

  await logWorkflowForSectors({
    acao: "ORDER_SENT",
    entidade: "propostas",
    entidade_id: doc.$id,
    detalhes: `Pedido "${title}" enviado por ${senderSector} para Peças`,
    setores: [senderSector, "Peças"]
  });

  return [mapDoc(doc)];
}

export async function sendNotaFiscal({
  title,
  propostaId,
  propostaTitle,
  targetSector,
  file,
  senderSector
}) {
  await assertPermission(PERMISSIONS.CREATE_NOTA);
  const now = new Date().toISOString();
  let pdfUri = null;

  if (file && BUCKET_ID) {
    const fileDoc = await storage.createFile(BUCKET_ID, ID.unique(), file);
    pdfUri = fileDoc.$id;
  }

  const acc = await getAccount();
  const uidCriador = acc?.$id || "";

  // Usamos a mesma coleção de PROPOSTAS, mas diferenciamos pelo título ou um campo de descrição
  // Como a coleção não tem um campo 'tipo', vamos marcar no título que é uma NOTA FISCAL
  const desc = propostaTitle ? `Referente ao pedido: ${propostaTitle}` : (propostaId ? `Referente ao pedido: ${propostaId}` : "Nota Fiscal avulsa");

  const doc = await databases.createDocument(DB_ID, COL_PROPOSTAS, ID.unique(), {
    titulo: `[NOTA FISCAL] ${title}`,
    descricao: desc,
    setor: senderSector,
    authorSetor: senderSector,
    setorDestino: targetSector,
    status: statuses.PENDENTE,
    data: now,
    pdfUri,
    uidCriador
  });

  // Notificação para o setor de destino
  await createNotification({
    titulo: `Nova Nota Fiscal: ${title}`,
    mensagem: `Recebida de ${senderSector}`,
    destinatarioSetor: targetSector,
    propostaId: doc.$id,
    tipo: "NOTA_FISCAL"
  });

  await logWorkflowForSectors({
    acao: "NOTA_SENT",
    entidade: "propostas",
    entidade_id: doc.$id,
    detalhes: `Nota "${title}" enviada de ${senderSector} para ${targetSector}`,
    setores: [senderSector, targetSector, "Peças"]
  });

  return doc;
}

/** Aprovar Nota Fiscal */
export async function approveNota(id) {
  await assertPermission(PERMISSIONS.APPROVE_NOTA);
  const { sector } = await assertActor();
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (!eq(current.setorDestino, sector)) {
    throw new Error("Ação permitida apenas para o setor responsável");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.FINALIZADO
  });

  await createNotification({
    titulo: `Nota Fiscal aprovada por ${sector}`,
    mensagem: current.titulo.replace("[NOTA FISCAL] ", ""),
    destinatarioSetor: "Peças",
    propostaId: id,
    tipo: statuses.FINALIZADO
  });

  await logWorkflowForSectors({
    acao: "NOTA_APPROVED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Nota aprovada por ${sector}: ${current.titulo.replace("[NOTA FISCAL] ", "")}`,
    setores: [sector, current.authorSetor || current.setor, "Peças"]
  });

  return mapDoc(update);
}

export async function rejectNota(id, reason) {
  await assertPermission(PERMISSIONS.APPROVE_NOTA);
  const { sector } = await assertActor();
  const r = String(reason || "").trim();
  if (!r) throw new Error("Informe o motivo da rejeição");

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (!eq(current.setorDestino, sector)) {
    throw new Error("Ação permitida apenas para o setor responsável");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.RECUSADO,
    motivoRecusa: r
  });

  await createNotification({
    titulo: `Nota Fiscal rejeitada por ${sector}`,
    mensagem: current.titulo.replace("[NOTA FISCAL] ", ""),
    destinatarioSetor: "Peças",
    propostaId: id,
    tipo: statuses.RECUSADO
  });

  await logWorkflowForSectors({
    acao: "NOTA_REJECTED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Nota recusada por ${sector}. Motivo: ${r}`,
    setores: [sector, current.authorSetor || current.setor, "Peças"]
  });

  return mapDoc(update);
}

export async function getNotasFiscais(sector, type = "received") {
  const queries = [Query.limit(100), Query.startsWith("titulo", "[NOTA FISCAL]")];
  
  if (type === "received") {
    queries.push(Query.equal("setorDestino", sector));
  } else {
    queries.push(Query.equal("authorSetor", sector));
  }

  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, queries);
  return {
    items: res.documents.map(mapDoc),
    total: res.total
  };
}

function normalizeText(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function eq(a, b) {
  return normalizeText(a) === normalizeText(b);
}

/** 
 * Fila centralizada para Peças: 
 * - Filtra para NÃO mostrar Notas Fiscais, apenas PEDIDOS
 */
export async function getPecasQueue({ page = 1, pageSize = 10, allStatuses = true } = {}) {
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.limit(2000)
  ]);
  const filtered = res.documents
    .map(mapDoc)
    .filter((d) => {
      const isNota = d.title.startsWith("[NOTA FISCAL]");
      if (isNota) return false;

      if (allStatuses) return true;

      const st = normalizeStatus(d.status);
      // Peças vê o que é novo (CRIADO), o que assumiu (EM_ATENDIMENTO) ou o que o setor aprovou (APROVADO).
      return st === statuses.PENDENTE || st === statuses.EM_ATENDIMENTO || st === statuses.APROVADO || st === statuses.RECUSADO;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  return { items: filtered.slice(start, start + pageSize), total };
}

/** 
 * Fila para o Setor Responsável:
 * - Filtra para NÃO mostrar Notas Fiscais, apenas PEDIDOS
 */
export async function getReceived(sector, { page = 1, pageSize = 10, allStatuses = true } = {}) {
  const user = await getUser();
  if (!user) throw new Error("Não autenticado");

  const canAttend =
    hasPermission(user, PERMISSIONS.VIEW_ATTEND_QUEUE) ||
    hasPermission(user, PERMISSIONS.VIEW_RECEIVED);
  if (!canAttend) {
    throw new Error("Permissão negada: orders.view_attend_queue");
  }

  // Fila central do setor Peças (todos os pedidos)
  if (
    isPecasSector(sector) &&
    (hasPermission(user, PERMISSIONS.VIEW_RECEIVED) || hasPermission(user, PERMISSIONS.VIEW_ATTEND_QUEUE))
  ) {
    return getPecasQueue({ page, pageSize, allStatuses });
  }

  // Demais setores: pedidos encaminhados por Peças para este setor
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.equal("setorDestino", sector),
    Query.limit(2000)
  ]);

  const filtered = res.documents
    .map(mapDoc)
    .filter((d) => {
      const isNota = d.title.startsWith("[NOTA FISCAL]");
      if (isNota) return false;

      if (allStatuses) return true;

      return true; // Para outros setores, já retornamos todos por padrão ou filtramos conforme necessário
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  return { items: filtered.slice(start, start + pageSize), total };
}

/**
 * Filtra para NÃO mostrar Notas Fiscais nos pedidos enviados
 */
export async function getSent(userId, userSector, { page = 1, pageSize = 10 } = {}) {
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.limit(2000)
  ]);
  const filtered = res.documents
    .map(mapDoc)
    .filter((d) => {
      const isNota = d.title.startsWith("[NOTA FISCAL]");
      if (isNota) return false;

      if (d.uidCriador) return d.uidCriador === userId;
      return eq(d.senderSector, userSector);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  return { items: filtered.slice(start, start + pageSize), total };
}

export function subscribeToProposals(handler) {
  return subscribe(CHANNELS.PROPOSTAS, handler);
}

export function subscribeToNotifications(handler) {
  return subscribe(CHANNELS.NOTIFICACOES, handler);
}

export function subscribeToDocument(id, handler) {
  const channel = `databases.${VITE_APPWRITE_DATABASE_ID}.collections.${VITE_APPWRITE_COLLECTION_PROPOSTAS}.documents.${id}`;
  return subscribe(channel, handler);
}

async function assertActor() {
  const acc = await getAccount();
  if (!acc) throw new Error("Sessão inválida");
  const extras = await getOrCreateUserExtras(acc.$id);
  const sec = extras?.setor || sectorFromEmail(acc.email) || "";
  return { acc, extras, sector: sec };
}

/** Peças encaminha para outro setor */
export async function forwardOrder(id, targetSector) {
  await assertPermission(PERMISSIONS.VIEW_RECEIVED);

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);
  if (st !== statuses.PENDENTE && st !== statuses.EM_ATENDIMENTO) {
    throw new Error("Este pedido não pode ser encaminhado neste estado");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.ENCAMINHADO,
    setorDestino: targetSector
  });

  // Notificações
  await createNotification({
    titulo: `Pedido encaminhado para ${targetSector}`,
    mensagem: current.titulo,
    destinatarioSetor: targetSector,
    propostaId: id,
    tipo: statuses.ENCAMINHADO
  });

  await createNotification({
    titulo: `Seu pedido foi encaminhado para ${targetSector}`,
    mensagem: current.titulo,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.ENCAMINHADO
  });

  await logWorkflowForSectors({
    acao: "ORDER_FORWARDED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Peças encaminhou "${current.titulo}" para ${targetSector}`,
    setores: ["Peças", targetSector, current.authorSetor || current.setor]
  });

  return mapDoc(update);
}

/** Setor responsável aprova o pedido */
export async function approveBySector(id) {
  await assertPermission(PERMISSIONS.EVALUATE_ORDER);
  const { sector } = await assertActor();
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (normalizeStatus(current.status) !== statuses.ENCAMINHADO) {
    throw new Error("Apenas pedidos encaminhados podem ser aprovados");
  }

  if (!eq(current.setorDestino, sector)) {
    throw new Error("Ação permitida apenas para o setor responsável");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.APROVADO,
    setorDestino: "Peças"
  });

  // Notificações
  await createNotification({
    titulo: `Pedido aprovado por ${sector}`,
    mensagem: current.titulo,
    destinatarioSetor: "Peças",
    propostaId: id,
    tipo: statuses.APROVADO
  });

  await createNotification({
    titulo: `Seu pedido foi aprovado por ${sector}`,
    mensagem: current.titulo,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.APROVADO
  });

  await logWorkflowForSectors({
    acao: "ORDER_APPROVED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `${sector} aprovou "${current.titulo}" — retorno para Peças`,
    setores: [sector, "Peças", current.authorSetor || current.setor]
  });

  return mapDoc(update);
}

/** Peças ou Setor responsável rejeitam o pedido */
export async function rejectOrder(id, reason) {
  await assertPermission(PERMISSIONS.EVALUATE_ORDER);
  const { sector } = await assertActor();
  const r = String(reason || "").trim();
  if (!r) throw new Error("Informe o motivo da rejeição");

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);

  if (st !== statuses.PENDENTE && st !== statuses.ENCAMINHADO && st !== statuses.APROVADO) {
    throw new Error("Este pedido não pode ser recusado neste estado");
  }

  const actor = await getUser();
  const canManageQueue = hasPermission(actor, PERMISSIONS.VIEW_RECEIVED);
  const isTarget = eq(current.setorDestino, sector);

  if (!canManageQueue && !isTarget) {
    throw new Error("Você não tem permissão para rejeitar este pedido");
  }

  const patch = {
    status: statuses.RECUSADO,
    motivoRecusa: r
  };

  if (!canManageQueue) {
    patch.setorDestino = "Peças";
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, patch);

  // Notificações
  await createNotification({
    titulo: "Pedido recusado por Peças",
    mensagem: `Motivo: ${r}`,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.RECUSADO
  });

  if (!canManageQueue) {
    await createNotification({
      titulo: `Pedido rejeitado por ${sector}`,
      mensagem: current.titulo,
      destinatarioSetor: "Peças",
      propostaId: id,
      tipo: statuses.RECUSADO
    });
  }

  const rejectSetores = canManageQueue
    ? ["Peças", current.authorSetor || current.setor]
    : [sector, "Peças", current.authorSetor || current.setor];

  await logWorkflowForSectors({
    acao: "ORDER_REJECTED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Pedido recusado${canManageQueue ? " por Peças" : ` por ${sector}`}. Motivo: ${r}`,
    setores: rejectSetores
  });

  return mapDoc(update);
}

/** Peças finaliza a compra */
export async function finalizeOrder(id) {
  await assertPermission(PERMISSIONS.VIEW_RECEIVED);
  const { acc } = await assertActor();

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);

  // Pode finalizar se estiver APROVADO, RECUSADO, EM_ATENDIMENTO ou PENDENTE
  if (st !== statuses.APROVADO && st !== statuses.RECUSADO && st !== statuses.EM_ATENDIMENTO && st !== statuses.PENDENTE) {
    throw new Error("Este pedido não pode ser finalizado neste status");
  }

  const now = new Date().toISOString();
  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.FINALIZADO,
    dataFinalizado: now,
    assumidoPor: acc.$id,
    dataAssumido: current.dataAssumido || now
  });

  // Notificações para o autor
  await createNotification({
    titulo: `Pedido finalizado - Status: ${statusLabel(current.status)}`,
    mensagem: `O setor de Peças concluiu o processamento do seu pedido: "${current.titulo}"`,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.FINALIZADO
  });

  await logWorkflowForSectors({
    acao: "ORDER_FINALIZED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Peças finalizou "${current.titulo}"`,
    setores: ["Peças", current.authorSetor || current.setor, current.setorDestino].filter(Boolean)
  });

  return mapDoc(update);
}

/** PENDENTE ou APROVADO → EM_ATENDIMENTO. */
export async function assumeOrder(id) {
  await assertPermission(PERMISSIONS.ATTEND_ORDER);
  const { acc } = await assertActor();

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);
  
  if (st !== statuses.PENDENTE && st !== statuses.APROVADO && st !== statuses.RECUSADO) {
    throw new Error("Somente pedidos pendentes, aprovados ou recusados pelo setor podem ser assumidos");
  }

  const now = new Date().toISOString();
  const patch = {
    status: statuses.EM_ATENDIMENTO,
    assumidoPor: acc.$id,
    dataAssumido: now
  };
  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, patch);
  
  await createNotification({
    titulo: "Pedido em atendimento por Peças",
    mensagem: `O setor de Peças iniciou o atendimento do seu pedido: "${current.titulo}"`,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.EM_ATENDIMENTO
  });

  await logWorkflowForSectors({
    acao: "ORDER_ASSUMED",
    entidade: "propostas",
    entidade_id: id,
    detalhes: `Peças assumiu atendimento de "${current.titulo}"`,
    setores: ["Peças", current.authorSetor || current.setor]
  });

  return mapDoc(update);
}

export async function deleteDocumentIfPending(id) {
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (normalizeStatus(current.status) !== statuses.PENDENTE) {
    throw new Error("Apenas pedidos pendentes podem ser excluídos");
  }

  const acc = await getAccount();
  if (!acc) throw new Error("Sessão inválida");
  const uid = current.uidCriador;
  if (uid && uid !== acc.$id) {
    throw new Error("Apenas o autor do pedido pode excluir");
  }
  if (!uid) {
    const extras = await getOrCreateUserExtras(acc.$id);
    const userSector = extras?.setor || "";
    const docAuthor = current.authorSetor || current.setor || "";
    if (userSector !== docAuthor) {
      throw new Error("Apenas o autor do pedido pode excluir");
    }
  }

  await databases.deleteDocument(DB_ID, COL_PROPOSTAS, id);
  return true;
}

export async function getDocumentById(id) {
  const d = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const mapped = mapDoc(d);
  const acc = await getAccount();
  if (!acc) throw new Error("Sessão inválida");
  const extras = await getOrCreateUserExtras(acc.$id);
  const userSector = extras?.setor || sectorFromEmail(acc.email) || "";
  const isPecas = isPecasSector(userSector);
  const isCreator = mapped.uidCriador
    ? mapped.uidCriador === acc.$id
    : eq(mapped.senderSector, userSector);
  const isTarget = eq(mapped.targetSector, userSector);

  if (!isPecas && !isCreator && !isTarget) {
    throw new Error("Acesso negado");
  }
  return mapped;
}

/* ================================
   ADMIN / SUPORTE
================================ */

export async function adminListUsers() {
  await assertPermission(PERMISSIONS.MANAGE_USERS);
  const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [
    Query.limit(100),
    Query.orderDesc("$createdAt")
  ]);
  return res.documents.map(d => ({
    id: d.$id,
    uid: d.uid,
    email: d.email,
    name: d.nome,
    nome: d.nome, // redundância para compatibilidade
    role_id: d.role_id || null,
    setor_id: d.setor_id || null,
    setor: d.setor || d.sector || "",
    sector: d.setor || d.sector || "", // redundância
    ativo: d.ativo ?? true,
    deleted_at: d.deleted_at || null
  }));
}

export async function adminUpdateUser(docId, payload) {
  await assertPermission(PERMISSIONS.MANAGE_USERS);
  
  const me = await getUser();
  if (me.uid === payload.uid && payload.role_id && payload.role_id !== ROLES.SUPORTE) {
    throw new Error("Você não pode remover seu próprio acesso administrativo");
  }

  // Prepara os dados garantindo que campos obrigatórios não sejam undefined
  const roleSlug = normalizeRoleSlug(payload.role_id || payload.role);
  const data = {
    nome: payload.name || payload.nome || "",
    email: payload.email || "", 
    setor: payload.sector || payload.setor || "", 
    ativo: payload.ativo ?? true,
    isAdmin: roleSlug === ROLES.SUPORTE || payload.isAdmin === true,
    role_id: roleSlug
  };

  // Adiciona campos dinâmicos apenas se existirem valores
  if (payload.setor_id) data.setor_id = payload.setor_id;

  if (payload.password) {
    data.senhaTemporaria = payload.password;
  }

  const res = await databases.updateDocument(DB_ID, COL_USUARIOS, docId, data);

  await createLog({
    acao: "UPDATE_USER",
    entidade: "usuarios",
    entidade_id: docId,
    detalhes: `Usuário ${payload.name || payload.uid} atualizado`
  });
  return res;
}

export async function adminCreateUser(payload) {
  await assertPermission(PERMISSIONS.MANAGE_USERS);
  
  const newId = ID.unique();
  
  try {
    await createAccountCompat({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      userId: newId
    });
  } catch (err) {
    if (err.code === 409) {
      throw new Error("Este e-mail já está cadastrado no sistema (Auth).");
    }
    throw err;
  }
  
  const roleSlug = normalizeRoleSlug(payload.role_id || payload.role);
  const sector = String(payload.sector || payload.setor || "").trim();
  if (!sector) {
    throw new Error("Selecione o setor do usuário.");
  }

  const data = {
    uid: newId, 
    email: payload.email,
    nome: payload.name || payload.nome || "",
    setor: sector,
    ativo: true,
    isAdmin: roleSlug === ROLES.SUPORTE,
    senhaTemporaria: payload.password,
    role_id: roleSlug,
    setor_id: payload.setor_id || null
  };

  const res = await databases.createDocument(DB_ID, COL_USUARIOS, newId, data);

  await createLog({
    acao: "CREATE_USER",
    entidade: "usuarios",
    entidade_id: newId,
    detalhes: `Usuário ${payload.name} (${payload.email}) criado`
  });
  return res;
}

export async function adminDeleteUser(docId, uid) {
  await assertPermission(PERMISSIONS.MANAGE_USERS);
  
  const me = await getUser();
  if (me.uid === uid) {
    throw new Error("Você não pode excluir sua própria conta administrativa");
  }

  await databases.updateDocument(DB_ID, COL_USUARIOS, docId, {
    ativo: false,
    deleted_at: new Date().toISOString()
  });

  await createLog({
    acao: "DELETE_USER",
    entidade: "usuarios",
    entidade_id: docId,
    detalhes: `Usuário ID ${uid} desativado`
  });
  return true;
}

const LOG_ACTION_LABELS = {
  CREATE_USER: "Usuário criado",
  UPDATE_USER: "Usuário atualizado",
  DELETE_USER: "Usuário desativado",
  CREATE_SECTOR: "Setor criado",
  UPDATE_SECTOR: "Setor atualizado",
  DELETE_SECTOR: "Setor desativado",
  SYNC_ROLE_DEFAULTS: "Perfis sincronizados",
  UPDATE_ROLE_PERMISSIONS: "Permissões atualizadas",
  CLEAR_LOGS: "Histórico limpo",
  ORDER_SENT: "Pedido enviado",
  ORDER_FORWARDED: "Pedido encaminhado",
  ORDER_APPROVED: "Pedido aprovado",
  ORDER_REJECTED: "Pedido recusado",
  ORDER_FINALIZED: "Pedido finalizado",
  ORDER_ASSUMED: "Pedido em atendimento",
  NOTA_SENT: "Nota fiscal enviada",
  NOTA_APPROVED: "Nota fiscal aprovada",
  NOTA_REJECTED: "Nota fiscal recusada"
};

function logTimestamp(doc) {
  const raw = doc.created_at || doc.$createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString("pt-BR");
}

async function buildUserNameMap() {
  const map = {};
  try {
    const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [Query.limit(5000)]);
    for (const u of res.documents) {
      const label = u.nome || u.name || u.email || u.uid;
      if (u.uid) map[u.uid] = label;
      if (u.$id) map[u.$id] = label;
    }
  } catch (err) {
    console.warn("buildUserNameMap:", err);
  }
  return map;
}

function mapLogDocument(d, userMap = {}) {
  const uid = d.usuario_id || d.usuarioId || "";
  return {
    id: d.$id,
    action: d.acao,
    actionLabel: LOG_ACTION_LABELS[d.acao] || d.acao || "—",
    details: d.detalhes || "—",
    entity: d.entidade || "",
    entityId: d.entidade_id || "",
    sector: d.setor || "",
    userId: uid,
    user: userMap[uid] || uid || "Sistema",
    time: logTimestamp(d)
  };
}

async function fetchLogDocuments(limit = 100) {
  if (!COL_LOGS) return [];

  const tryList = async (queries) => {
    const res = await databases.listDocuments(DB_ID, COL_LOGS, queries);
    return res.documents;
  };

  try {
    return await tryList([Query.limit(limit), Query.orderDesc("created_at")]);
  } catch {
    try {
      return await tryList([Query.limit(limit), Query.orderDesc("$createdAt")]);
    } catch {
      const docs = await tryList([Query.limit(limit)]);
      return docs.sort((a, b) => {
        const ta = new Date(a.created_at || a.$createdAt || 0).getTime();
        const tb = new Date(b.created_at || b.$createdAt || 0).getTime();
        return tb - ta;
      });
    }
  }
}

export async function createLog({ acao, entidade, entidade_id, detalhes, setor }) {
  if (!COL_LOGS) return;
  const me = await getUser();
  if (!me) return;

  const payload = {
    usuario_id: me.uid,
    acao: String(acao || "").trim(),
    entidade: entidade || "",
    entidade_id: String(entidade_id || ""),
    detalhes: detalhes || "",
    created_at: new Date().toISOString()
  };

  if (setor) payload.setor = String(setor).trim();

  try {
    await databases.createDocument(DB_ID, COL_LOGS, ID.unique(), payload);
  } catch (err) {
    try {
      const { created_at, setor: _s, ...fallback } = payload;
      await databases.createDocument(DB_ID, COL_LOGS, ID.unique(), fallback);
    } catch (err2) {
      console.warn("Falha ao gravar log de auditoria:", err2.message || err.message);
    }
  }
}

/** Registra o mesmo evento no histórico de cada setor participante */
export async function logWorkflowForSectors({ acao, entidade, entidade_id, detalhes, setores }) {
  if (!COL_LOGS) return;
  const me = await getUser();
  if (!me) return;

  const unique = [
    ...new Set(
      (setores || [])
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    )
  ];

  if (!unique.length) {
    unique.push(me.sector || me.setor || "");
  }

  await Promise.all(
    unique.map((setor) =>
      createLog({ acao, entidade, entidade_id, detalhes, setor })
    )
  );
}

export async function getAdminStats() {
  await assertPermission(PERMISSIONS.ADMIN_DASHBOARD);
  
  const [users, orders, sectorsRes] = await Promise.all([
    databases.listDocuments(DB_ID, COL_USUARIOS, [Query.limit(5000)]),
    databases.listDocuments(DB_ID, COL_PROPOSTAS, [Query.limit(1)]),
    adminListSectors()
  ]);
  
  // Define "online" como usuários que acessaram o sistema nos últimos 5 minutos
  const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const activeUsersCount = users.documents.filter(u => {
    const ultimoAcesso = u.ultimoAcesso || u.lastLogin;
    return ultimoAcesso && ultimoAcesso >= cincoMinutosAtras;
  }).length;

  return {
    totalUsers: users.total,
    totalOrders: orders.total,
    activeUsers: activeUsersCount,
    sectorsCount: sectorsRes.length
  };
}

export async function listAuditLogs({ limit = 100 } = {}) {
  await assertPermission(PERMISSIONS.VIEW_LOGS);
  if (!COL_LOGS) return [];

  const docs = await fetchLogDocuments(limit);
  const userMap = await buildUserNameMap();
  return docs.map((d) => mapLogDocument(d, userMap));
}

export async function getRecentAuditLogs(limit = 10) {
  await assertPermission(PERMISSIONS.ADMIN_DASHBOARD);
  const all = await listAuditLogs({ limit });
  return all.slice(0, limit);
}

export async function adminClearAuditLogs() {
  await assertPermission(PERMISSIONS.VIEW_LOGS);
  if (!COL_LOGS) return true;

  let deleted = 0;
  try {
    for (;;) {
      const res = await databases.listDocuments(DB_ID, COL_LOGS, [Query.limit(100)]);
      if (!res.documents.length) break;
      await Promise.all(
        res.documents.map((d) => databases.deleteDocument(DB_ID, COL_LOGS, d.$id))
      );
      deleted += res.documents.length;
      if (res.documents.length < 100) break;
    }

    await createLog({
      acao: "CLEAR_LOGS",
      entidade: "logs",
      entidade_id: "all",
      detalhes: `Histórico limpo (${deleted} registros removidos)`
    });
    return true;
  } catch (err) {
    console.error("Erro ao limpar logs:", err);
    throw err;
  }
}

/* ================================
   SETORES
================================ */

export async function adminListSectors({ includeInactive = false } = {}) {
  try {
    const queries = [Query.limit(100)];
    if (!includeInactive) {
      queries.unshift(Query.equal("ativo", true));
    }
    const res = await databases.listDocuments(DB_ID, COL_SETORES, queries);
    return res.documents
      .map((d) => ({
        id: d.$id,
        nome: d.nome,
        email: d.email || "",
        ativo: d.ativo !== false
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } catch (err) {
    if (err?.code !== 401) {
      console.warn("Erro ao listar setores:", err);
    }
    return [];
  }
}

/** Setores ativos para encaminhamento (Peças e demais operadores autenticados) */
export async function listSectorsForForward() {
  const user = await getUser();
  if (!user) throw new Error("Não autenticado");
  return adminListSectors({ includeInactive: false });
}

export async function adminCreateSector(payload) {
  await assertPermission(PERMISSIONS.MANAGE_SECTORS);
  const me = await getUser();
  
  if (!payload.email) {
    throw new Error("O campo e-mail é obrigatório para notificações do setor.");
  }

  const res = await databases.createDocument(DB_ID, COL_SETORES, ID.unique(), {
    nome: payload.nome,
    email: payload.email, // Obrigatório no seu banco
    ativo: true
  });

  await createLog({
    acao: "CREATE_SECTOR",
    entidade: "setores",
    entidade_id: res.$id,
    detalhes: `Setor ${payload.nome} criado com e-mail ${payload.email || 'N/A'}`
  });

  return res;
}

export async function adminUpdateSector(id, payload) {
  await assertPermission(PERMISSIONS.MANAGE_SECTORS);
  
  const res = await databases.updateDocument(DB_ID, COL_SETORES, id, {
    nome: payload.nome,
    email: payload.email || "", // Novo campo de e-mail de notificação
    ativo: payload.ativo
  });

  await createLog({
    acao: "UPDATE_SECTOR",
    entidade: "setores",
    entidade_id: id,
    detalhes: `Setor ${payload.nome} atualizado`
  });

  return res;
}

export async function adminDeleteSector(id, nome) {
  await assertPermission(PERMISSIONS.MANAGE_SECTORS);
  
  await databases.updateDocument(DB_ID, COL_SETORES, id, {
    ativo: false,
    deleted_at: new Date().toISOString()
  });

  await createLog({
    acao: "DELETE_SECTOR",
    entidade: "setores",
    entidade_id: id,
    detalhes: `Setor ${nome} desativado`
  });
  return true;
}

/* ================================
   ROLES E PERMISSÕES
================================ */

export async function adminListRoles() {
  await assertPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  try {
    const res = await databases.listDocuments(DB_ID, COL_ROLES, [
      Query.equal("ativo", true),
      Query.limit(100)
    ]);
    const fromDb = res.documents
      .map((d) => {
        const slug = normalizeRoleSlug({ role_id: d.$id, nome: d.nome || d.name });
        return {
          id: ALL_ROLES.includes(d.$id) ? d.$id : slug,
          nome: d.nome || d.name || ROLE_INFO[slug]?.nome || slug,
          ativo: d.ativo
        };
      })
      .filter((r) => ALL_ROLES.includes(r.id));
    if (fromDb.length > 0) return fromDb;
  } catch (err) {
    console.warn("adminListRoles:", err);
  }
  return ALL_ROLES.map((id) => ({
    id,
    nome: ROLE_INFO[id]?.nome || id,
    ativo: true
  }));
}

export async function adminListPermissions() {
  await assertPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  const res = await databases.listDocuments(DB_ID, COL_PERMISSOES, [
    Query.equal("ativo", true),
    Query.limit(500)
  ]);
  return res.documents;
}

export async function adminListRolePermissions(roleId) {
  await assertPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  const res = await databases.listDocuments(DB_ID, COL_ROLE_PERMISSOES, [
    Query.equal("role_id", roleId),
    Query.limit(500)
  ]);
  return res.documents;
}

/** Grava no banco as permissões padrão dos 3 perfis (Suporte, Gestor, Operador). */
export async function adminSyncRoleDefaults() {
  await assertPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  for (const roleId of ALL_ROLES) {
    const keys = ROLE_PERMISSIONS[roleId] || [];
    await adminUpdateRolePermissions(roleId, keys);
  }
  await createLog({
    acao: "SYNC_ROLE_DEFAULTS",
    entidade: "roles",
    entidade_id: "all",
    detalhes: "Permissões padrão dos perfis sincronizadas"
  });
  return true;
}

export async function adminUpdateRolePermissions(roleId, permissions) {
  await assertPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  const me = await getUser();

  // 1. Busca a lista completa de permissões do banco para poder converter "chave" em "permissao_id"
  const allPerms = await adminListPermissions();
  const permsMap = new Map(allPerms.map(p => [p.chave, p.id || p.$id]));

  // 2. Busca permissões atuais da role
  const current = await adminListRolePermissions(roleId);
  const currentMap = new Map(current.map(p => [p.permissao_id, p.$id]));

  // 3. Processa as novas permissões
  // Se 'permissions' for um array de chaves (como o PermissionManager envia), convertemos para IDs
  const targetPermIds = permissions.map(p => typeof p === 'string' ? permsMap.get(p) : p.permissao_id).filter(Boolean);

  const promises = targetPermIds.map(async (permId) => {
    if (currentMap.has(permId)) {
      // Atualiza se já existe
      const docId = currentMap.get(permId);
      currentMap.delete(permId); // Remove do mapa para saber o que deletar depois
      return databases.updateDocument(DB_ID, COL_ROLE_PERMISSOES, docId, {
        permitido: true
      });
    } else {
      // Cria novo se não existe
      return databases.createDocument(DB_ID, COL_ROLE_PERMISSOES, ID.unique(), {
        role_id: roleId,
        permissao_id: permId,
        permitido: true
      });
    }
  });

  // Remove as que não estão mais no array (se currentMap ainda tiver itens, são permissões removidas)
  for (const [permId, docId] of currentMap.entries()) {
    promises.push(databases.updateDocument(DB_ID, COL_ROLE_PERMISSOES, docId, {
      permitido: false
    }));
  }

  await Promise.all(promises);

  await createLog({
    acao: "UPDATE_ROLE_PERMISSIONS",
    entidade: "roles",
    entidade_id: roleId,
    detalhes: `Permissões da role ${roleId} atualizadas`
  });

  return true;
}

/* ================================
   NOTIFICAÇÕES
================================ */

export async function getNotifications(sector) {
  const res = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [
    Query.equal("destinatarioSetor", sector)
  ]);
  const base = res.documents.map(n => ({
    id: n.$id,
    documentId: n.propostald, // Corrigido de propostaId para propostald
    title: n.titulo,
    documentTitle: n.mensagem,
    date: n.data,
    status: n.tipo,
    newStatus: n.tipo
  }));
  const updated = await Promise.all(
    base.map(async (n) => {
      try {
        const d = await databases.getDocument(DB_ID, COL_PROPOSTAS, n.documentId);
        const cur = normalizeStatus(d.status);
        const parseReviewer = (t) => {
          const s = String(t || "");
          // Tenta pegar quem executou a ação (depois de "por" ou "para")
          const m = s.match(/(?:por|para)\s+(.+)$/i);
          return m ? m[1].trim() : null;
        };
        return {
          ...n,
          newStatus: cur,
          documentTitle: d.titulo || n.documentTitle,
          senderSector: d.authorSetor || d.setor || "",
          targetSector: d.setorDestino || "",
          reason: d.motivoRecusa || null,
          reviewerSector: parseReviewer(n.title)
        };
      } catch {
        return n;
      }
    })
  );
  return updated;
}

export async function clearNotifications(sector) {
  const res = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [
    Query.equal("destinatarioSetor", sector)
  ]);

  await Promise.all(
    res.documents.map(n =>
      databases.deleteDocument(DB_ID, COL_NOTIFICACOES, n.$id)
    )
  );

  return true;
}

export async function deleteNotification(id) {
  await databases.deleteDocument(DB_ID, COL_NOTIFICACOES, id);
  return true;
}

/* ================================
   PERFIL
================================ */

export async function updateProfile({ sector, name, avatar }) {
  const acc = await getAccount();
  if (!acc) throw new Error("Sessão inválida");
  try {
    if (name) await account.updateName(name);
  } catch {}
  let updatedExtras = null;
  let avatarRef = null;
  try {
    const currentExtras = await getOrCreateUserExtras(acc.$id);
    if (avatar && typeof avatar !== "string" && BUCKET_ID) {
      const fileDoc = await storage.createFile(BUCKET_ID, ID.unique(), avatar);
      avatarRef = fileDoc.$id;
    } else if (typeof avatar === "string") {
      avatarRef = avatar;
    } else {
      avatarRef = currentExtras?.avatar || currentExtras?.fotoStoragePath || currentExtras?.caminhoDeArmazenamentoDeFotos || null;
    }
    const payload1 = { nome: name ?? currentExtras?.nome ?? "", avatar: avatarRef ?? null };
    const payload2 = { nome: name ?? currentExtras?.nome ?? "", fotoStoragePath: avatarRef ?? null };
    const payload3 = { nome: name ?? currentExtras?.nome ?? "", caminhoDeArmazenamentoDeFotos: avatarRef ?? null };
    try { updatedExtras = await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, payload1); }
    catch (e1) {
      try { updatedExtras = await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, payload2); }
      catch (e2) {
        updatedExtras = await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, payload3);
      }
    }
  } catch {
    updatedExtras = null;
  }
  const ref = avatarRef || updatedExtras?.avatar || updatedExtras?.fotoStoragePath || updatedExtras?.caminhoDeArmazenamentoDeFotos || null;
  const url = ref ? (/^https?:\/\//i.test(String(ref)) ? String(ref) : (BUCKET_ID ? storage.getFileView(BUCKET_ID, String(ref)).href : String(ref))) : null;
  return { name: name || acc.name || updatedExtras?.nome || "", avatar: url };
}

export async function updatePassword({ currentPassword, newPassword }) {
  const np = String(newPassword || "").trim();
  if (np === "12345678") {
    throw new Error("SENHA_FRACA");
  }
  await account.updatePassword(np, currentPassword);
  return true;
}

export async function requestPasswordRecovery(email) {
  const em = String(email || "").trim();
  if (!em) throw new Error("Informe o e-mail");
  const redirect = (VITE_CANONICAL_URL || window.location.origin) + "/recuperar";
  await createRecoveryCompat(em, redirect);
  return true;
}

export async function updatePasswordRecovery({ userId, secret, newPassword, confirmPassword }) {
  const np = String(newPassword || "").trim();
  const cp = String(confirmPassword || "").trim();
  if (!userId || !secret) throw new Error("Link de recuperação inválido ou expirado");
  if (!np || np.length < 6) throw new Error("Senha muito curta");
  if (np === "12345678") throw new Error("SENHA_FRACA");
  if (np !== cp) throw new Error("Senhas não conferem");
  await updateRecoveryCompat(userId, secret, np, cp);
  return true;
}

/**
 * @param {{ userId: string, sector: string }} ctx
 * @param {{ scope?: "mine" | "all" }} opts — `all` apenas para visão global Peças
 */
export async function getStats(ctx, { scope = "mine" } = {}) {
  const userId = ctx?.userId;
  const sector = ctx?.sector || "";
  try {
    const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
      Query.limit(5000)
    ]);
    const docs = res.documents.map(mapDoc);
    let pending = 0;
    let emAtendimento = 0;
    let finalizado = 0;
    let rejeitado = 0;
    for (const d of docs) {
      const n = normalizeStatus(d.status);
      const isOwner = d.uidCriador === userId || eq(d.senderSector, sector);
      const isPecas = isPecasSector(sector);
      const isTarget = eq(d.targetSector, sector);

      // Regra de Visibilidade para as Estatísticas:
      // O documento só conta se:
      // 1. O usuário for Peças (se scope for 'all').
      // 2. O usuário for o Criador.
      // 3. O usuário for o Destino.
      const canSeeAll = scope === "all" && isPecas;
      if (!canSeeAll && !isOwner && !isTarget) continue;

      if (n === statuses.PENDENTE) pending++;
      else if (n === statuses.ENCAMINHADO || n === statuses.APROVADO || n === statuses.EM_ATENDIMENTO) emAtendimento++;
      else if (n === statuses.FINALIZADO) finalizado++;
      else if (n === statuses.RECUSADO) rejeitado++;
    }
    return { pending, emAtendimento, finalizado, rejeitado };
  } catch (err) {
    console.error("Erro ao obter estatísticas:", err);
    return { pending: 0, emAtendimento: 0, finalizado: 0, rejeitado: 0 };
  }
}

/* ================================
   MAP
================================ */

function mapDoc(d) {
  const rawValor = d.valor;
  let valorNum = null;
  if (rawValor != null && rawValor !== "") {
    const n = typeof rawValor === "number" ? rawValor : parseFloat(String(rawValor).replace(",", "."));
    valorNum = Number.isNaN(n) ? null : n;
  }
  return {
    id: d.$id,
    title: d.titulo,
    description: d.descricao || "",
    senderSector: d.setor || d.authorSetor || d.author_setor || d.autorSetor || "Setor não identificado",
    targetSector: d.setorDestino || d.setor_destino || "Peças",
    fileData: d.pdfUri || null,
    date: d.data,
    status: d.status,
    reason: d.motivoRecusa || null,
    uidCriador: d.uidCriador || "",
    assumidoPor: d.assumidoPor ?? d.assumido_por ?? null,
    dataAssumido: d.dataAssumido ?? d.data_assumido ?? null,
    dataFinalizado: d.dataFinalizado ?? d.data_finalizado ?? null,
    nomeProduto: d.nomeProduto ?? d.nome_produto ?? null,
    codigoProduto: d.codigoProduto ?? d.codigo_produto ?? null,
    finalidade: d.finalidade ?? null,
    recorrente: Boolean(d.recorrente),
    valor: valorNum
  };
}

export function getFileViewUrl(fileRef) {
  const ref = String(fileRef || "").trim();
  if (!ref) throw new Error("Nenhum PDF anexado");
  if (/^https?:\/\//i.test(ref)) return ref;
  if (!BUCKET_ID) throw new Error("Bucket não configurado");
  return storage.getFileView(BUCKET_ID, ref).href;
}

export async function resetPassword(email) {
  const em = String(email || "").trim();
  if (!em) throw new Error("Informe o e-mail");
  
  // O Appwrite permite criar um token de recuperação de senha que é enviado por e-mail.
  // O link redirecionará o usuário para a página de definição de nova senha no frontend.
  const redirectUrl = (VITE_CANONICAL_URL || window.location.origin) + "/definir-senha";
  
  try {
    await account.createRecovery(em, redirectUrl);
    return true;
  } catch (err) {
    console.error("Erro ao solicitar recuperação de senha:", err);
    throw new Error("Não foi possível enviar o e-mail de recuperação. Verifique o e-mail informado.");
  }
}

/* ================================
   CONVITES
================================ */

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function createInvite({ email, empresa, setor, dias = 7 }) {
  if (!COL_CONVITES) throw new Error("Coleção de convites não configurada");
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const gen = (len = 6) => Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  let token = gen(6);
  // Garante unicidade do token com algumas tentativas
  for (let i = 0; i < 5; i++) {
    const exists = await databases.listDocuments(DB_ID, COL_CONVITES, [Query.equal("token", token), Query.limit(1)]);
    if (!exists.documents.length) break;
    token = gen(6);
  }
  const nowMs = Date.now();
  const expiraMs = nowMs + Math.max(1, Number(dias) || 7) * 24 * 60 * 60 * 1000;
  const doc = await databases.createDocument(DB_ID, COL_CONVITES, ID.unique(), {
    token,
    email,
    empresa,
    setor,
    usado: false,
    criadoEm: nowMs,
    expiraEm: expiraMs
  });
  return { token };
}

export async function validateInvite(token) {
  if (!COL_CONVITES) throw new Error("Coleção de convites não configurada");
  const res = await databases.listDocuments(DB_ID, COL_CONVITES, [Query.equal("token", token), Query.limit(1)]);
  if (!res.documents.length) throw new Error("Convite não encontrado");
  const inv = res.documents[0];
  if (inv.usado) throw new Error("Convite já utilizado");
  const expInt = typeof inv.expiraEm === "string" ? parseInt(inv.expiraEm, 10) : inv.expiraEm;
  if (expInt && Number(expInt) < Date.now()) throw new Error("Convite expirado");
  return { id: inv.$id, token: inv.token, email: inv.email, empresa: inv.empresa, setor: inv.setor, expiraEm: inv.expiraEm };
}

async function sha256Hex(s) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function acceptInvite({ token, email, password, name }) {
  const inv = await validateInvite(token);
  await createAccountCompat({ email, password, name: name || email });
  await createEmailPasswordSessionCompat(email, password);
  const acc = await getAccount();
  if (!acc) throw new Error("Falha ao iniciar sessão");
  try {
    await databases.createDocument(DB_ID, COL_USUARIOS, acc.$id, {
      uid: acc.$id,
      email,
      nome: name || "",
      setor: inv.setor,
      isAdmin: inv.setor === "RH"
    });
  } catch {}
  
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let base = VITE_CANONICAL_URL || origin;
  
  // Se VITE_CANONICAL_URL for localhost mas estiver rodando em outro lugar (ou vice-versa), prefere o origin
  const isLocalCanonical = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(String(VITE_CANONICAL_URL || ""));
  if (isLocalCanonical && origin && !/localhost|127\.0\.0\.1/.test(origin)) {
    base = origin;
  }
  
  if (!base) {
    throw new Error("Não foi possível determinar a URL base para verificação de e-mail. Configure VITE_CANONICAL_URL.");
  }

  await createVerificationCompat(`${base}/verify`);
  await markInviteUsed(inv.id);
  return true;
}

export async function markInviteUsed(inviteId) {
  if (!COL_CONVITES) throw new Error("Coleção de convites não configurada");
  await databases.updateDocument(DB_ID, COL_CONVITES, inviteId, { usado: true });
  return true;
}

export function buildInviteLink(token) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let base = VITE_CANONICAL_URL || origin;
  
  const isLocalCanonical = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(String(VITE_CANONICAL_URL || ""));
  if (isLocalCanonical && origin && !/localhost|127\.0\.0\.1/.test(origin)) {
    base = origin;
  }
  
  return `${base}/invite?token=${encodeURIComponent(token)}`;
}

export async function createDynamicShortLink(link) {
  if (!VITE_FIREBASE_DL_API_KEY || !VITE_FIREBASE_DL_DOMAIN) return null;
  const body = {
    dynamicLinkInfo: {
      domainUriPrefix: VITE_FIREBASE_DL_DOMAIN,
      link
    }
  };
  const res = await fetch(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${VITE_FIREBASE_DL_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.shortLink || null;
}

export async function setUserPushToken(token) {
  const acc = await getAccount();
  if (!acc) return false;
  try {
    await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, { pushToken: token });
  } catch {}
  return true;
}
