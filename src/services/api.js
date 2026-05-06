import { Client, Databases, Storage, ID, Query, Account } from "appwrite";
import { statuses, sectorEmails, normalizeStatus, statusLabel, isPecasSector } from "../utils/constants.js";

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
  PROPOSTAS: `databases.${VITE_APPWRITE_DATABASE_ID}.collections.${VITE_APPWRITE_COLLECTION_PROPOSTAS}.documents`,
  NOTIFICACOES: `databases.${VITE_APPWRITE_DATABASE_ID}.collections.${VITE_APPWRITE_COLLECTION_NOTIFICACOES}.documents`,
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

async function createAccountCompat({ email, password, name }) {
  const safeId = genSafeId();
  if (typeof account.create === "function") {
    try {
      // Tenta o formato de objeto (SDK v14+)
      return await account.create({ userId: safeId, email, password, name });
    } catch (e1) {
      try {
        // Tenta o formato posicional com ID manual (Compatibilidade)
        return await account.create(safeId, email, password, name);
      } catch (e2) {
        try {
          // Tenta o formato posicional legado
          return await account.create(email, password, name);
        } catch (e3) {
          throw e1; // Se tudo falhar, joga o primeiro erro (geralmente o mais relevante)
        }
      }
    }
  }
  throw new Error("Criação de conta não suportada pela versão do SDK");
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

async function getOrCreateUserExtras(userId, email = "") {
  try {
    // Primeiro tenta pelo ID do documento (caso sejam iguais)
    return await databases.getDocument(DB_ID, COL_USUARIOS, userId);
  } catch {
    try {
      // Se falhar, busca na coleção onde o campo 'uid' seja igual ao ID do Auth
      const list = await databases.listDocuments(DB_ID, COL_USUARIOS, [
        Query.equal("uid", userId),
        Query.limit(1)
      ]);
      if (list.total > 0) return list.documents[0];

      // Se não encontrar nada, cria um novo usando o userId como ID do documento
      return await databases.createDocument(DB_ID, COL_USUARIOS, userId, {
        uid: userId,
        email: email || "",
        setor: "",
        nome: "",
        isAdmin: false
      });
    } catch (err) {
      console.warn("Erro ao obter/criar extras:", err);
      return null;
    }
  }
}

export async function getUser() {
  const acc = await getAccount();
  if (!acc) return null;
  const extras = await getOrCreateUserExtras(acc.$id, acc.email);
  const avatarRef = extras?.avatar || extras?.fotoStoragePath || extras?.caminhoDeArmazenamentoDeFotos || null;
  let avatarUrl = null;
  if (avatarRef) {
    const s = String(avatarRef || "");
    avatarUrl = /^https?:\/\//i.test(s) ? s : (BUCKET_ID ? storage.getFileView(BUCKET_ID, s).href : s);
  }
  const sectorByEmail = sectorFromEmail(acc.email);
  return {
    uid: acc.$id,
    email: acc.email || extras?.email || "",
    sector: extras?.setor || sectorByEmail || "",
    name: extras?.nome || acc.name || "",
    empresa: extras?.empresa || "",
    avatar: avatarUrl
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
        isAdmin: sector === "RH"
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
  await createEmailSessionWithSessionCap(email, password);
  const acc = await getAccount();
  if (!acc) throw new Error("Falha ao obter usuário");
  const domain = String(acc.email || "").split("@")[1] || "";
  const isSynthetic = domain === "setorlink.local";
  if (!isSynthetic && acc.emailVerification === false) {
    try { await account.deleteSession("current"); } catch {}
    throw new Error("EMAIL_NAO_VERIFICADO");
  }
  // Garante doc de usuário e que email esteja gravado
  try {
    const extras = await getOrCreateUserExtras(acc.$id, acc.email);
    const sec = sectorFromEmail(acc.email);
    const payload = {};
    if (!extras?.email || extras.email !== acc.email) payload.email = acc.email;
    if (sec && extras?.setor !== sec) payload.setor = sec;
    if (sec && !extras?.nome) payload.nome = sec;
    if (sec === "RH") payload.isAdmin = true;
    if (Object.keys(payload).length > 0) {
      await databases.updateDocument(DB_ID, COL_USUARIOS, extras?.$id || acc.$id, payload);
    }
  } catch {}
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
    // Busca se já existe uma notificação para ESTA proposta e para ESTE destinatário.
    // Assim, cada envolvido tem sua própria linha que se atualiza.
    const existing = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [
      Query.equal("propostaId", propostaId),
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
        propostaId,
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

  return doc;
}

/** Aprovar Nota Fiscal */
export async function approveNota(id) {
  const { sector } = await assertActor();
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (!isPecasSector(sector) && !eq(current.setorDestino, sector)) {
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

  return mapDoc(update);
}

export async function rejectNota(id, reason) {
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
  if (isPecasSector(sector)) return getPecasQueue({ page, pageSize, allStatuses });

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
  const { sector } = await assertActor();
  if (!isPecasSector(sector)) throw new Error("Ação permitida apenas para o setor Peças");

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

  return mapDoc(update);
}

/** Setor responsável aprova o pedido */
export async function approveBySector(id) {
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

  return mapDoc(update);
}

/** Peças ou Setor responsável rejeitam o pedido */
export async function rejectOrder(id, reason) {
  const { sector } = await assertActor();
  const r = String(reason || "").trim();
  if (!r) throw new Error("Informe o motivo da rejeição");

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);

  if (st !== statuses.PENDENTE && st !== statuses.ENCAMINHADO && st !== statuses.APROVADO) {
    throw new Error("Este pedido não pode ser recusado neste estado");
  }

  // Verifica se quem está rejeitando tem permissão
  const isPecas = isPecasSector(sector);
  const isTarget = eq(current.setorDestino, sector);

  if (!isPecas && !isTarget) {
    throw new Error("Você não tem permissão para rejeitar este pedido");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status: statuses.RECUSADO,
    motivoRecusa: r
  });

  // Notificações
  await createNotification({
    titulo: "Pedido recusado por Peças",
    mensagem: `Motivo: ${r}`,
    destinatarioSetor: current.authorSetor || current.setor,
    propostaId: id,
    tipo: statuses.RECUSADO
  });

  // Se foi o setor quem rejeitou, avisa Peças também
  if (!isPecas) {
    await createNotification({
      titulo: `Pedido rejeitado por ${sector}`,
      mensagem: current.titulo,
      destinatarioSetor: "Peças",
      propostaId: id,
      tipo: statuses.RECUSADO
    });
  }

  return mapDoc(update);
}

/** Peças finaliza a compra */
export async function finalizeOrder(id) {
  const { acc, sector } = await assertActor();
  if (!isPecasSector(sector)) throw new Error("Ação permitida apenas para o setor Peças");

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

  return mapDoc(update);
}

/** PENDENTE ou APROVADO → EM_ATENDIMENTO. */
export async function assumeOrder(id) {
  const { acc, sector } = await assertActor();
  if (!isPecasSector(sector)) throw new Error("Ação permitida apenas para o setor Peças");

  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  const st = normalizeStatus(current.status);
  
  if (st !== statuses.PENDENTE && st !== statuses.APROVADO) {
    throw new Error("Somente pedidos pendentes ou aprovados pelo setor podem ser assumidos");
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
   NOTIFICAÇÕES
================================ */

export async function getNotifications(sector) {
  const res = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [
    Query.equal("destinatarioSetor", sector)
  ]);
  const base = res.documents.map(n => ({
    id: n.$id,
    documentId: n.propostaId,
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
    senderSector: d.authorSetor || d.setor,
    targetSector: d.setorDestino,
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

export async function resetPassword() {
  throw new Error("Reset de senha deve ser realizado via backend Admin do Appwrite");
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
