import { Client, Databases, Storage, ID, Query, Account } from "appwrite";
import { statuses, sectorEmails, normalizeStatus } from "../utils/constants.js";

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

async function createAccountCompat({ email, password, name }) {
  if (typeof account.create === "function") {
    try {
      return await account.create({ userId: ID.unique(), email, password, name });
    } catch {
      try {
        return await account.create(ID.unique(), email, password, name);
      } catch {
        return await account.create(email, password, name);
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

async function getOrCreateUserExtras(userId) {
  try {
    const doc = await databases.getDocument(DB_ID, COL_USUARIOS, userId);
    return doc;
  } catch {
    try {
      const created = await databases.createDocument(DB_ID, COL_USUARIOS, userId, {
        uid: userId,
        setor: "",
        nome: "",
        isAdmin: false
      });
      return created;
    } catch {
      return null;
    }
  }
}

export async function getUser() {
  const acc = await getAccount();
  if (!acc) return null;
  const extras = await getOrCreateUserExtras(acc.$id);
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
  if (!acc) throw new Error("Falha ao obter usuário");
  const domainAcc = String(acc.email || "").split("@")[1] || "";
  const isSynthetic = domainAcc === "setorlink.local";
  if (!isSynthetic && acc.emailVerification === false) {
    try { await account.deleteSession("current"); } catch {}
    throw new Error("EMAIL_NAO_VERIFICADO");
  }
  try {
    const extras = await getOrCreateUserExtras(acc.$id);
    if (!extras?.setor || extras.setor !== sector) {
      await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, {
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
  let base = VITE_CANONICAL_URL || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalCanonical = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(String(VITE_CANONICAL_URL || ""));
  if (isLocalCanonical && origin && origin !== VITE_CANONICAL_URL) {
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
    const extras = await getOrCreateUserExtras(acc.$id);
    const sec = sectorFromEmail(acc.email);
    const payload = {};
    if (!extras?.email || extras.email !== acc.email) payload.email = acc.email;
    if (sec && extras?.setor !== sec) payload.setor = sec;
    if (sec && !extras?.nome) payload.nome = sec;
    if (sec === "RH") payload.isAdmin = true;
    if (Object.keys(payload).length > 0) {
      await databases.updateDocument(DB_ID, COL_USUARIOS, acc.$id, payload);
    }
  } catch {}
  return await getUser();
}

/* ================================
   DOCUMENTOS
================================ */

export async function sendDocument({
  title,
  description,
  file,
  fileData,
  senderSector,
  targetSector
}) {
  const now = new Date().toISOString();
  const targets = Array.isArray(targetSector) ? targetSector : [targetSector];
  let pdfUri = null;

  if (file && BUCKET_ID) {
    const fileDoc = await storage.createFile(BUCKET_ID, ID.unique(), file);
    pdfUri = fileDoc.$id;
  } else {
    pdfUri = fileData || null;
  }

  const created = [];
  const acc = await getAccount();
  const uidCriador = acc?.$id || "";

  for (const target of targets) {
    const doc = await databases.createDocument(DB_ID, COL_PROPOSTAS, ID.unique(), {
      titulo: title,
      descricao: description,
      setor: senderSector,
      authorSetor: senderSector,
      setorDestino: target,
      status: statuses.PENDENTE,
      data: now,
      pdfUri,
      uidCriador
    });

    await databases.createDocument(DB_ID, COL_NOTIFICACOES, ID.unique(), {
      titulo: `Novo documento do setor ${senderSector}`,
      mensagem: title,
      destinatarioSetor: target,
      propostaId: doc.$id,
      tipo: "Novo",
      data: now,
      lida: false
    });

    created.push(mapDoc(doc));
  }

  return created;
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

export async function getReceived(sector, { page = 1, pageSize = 10 } = {}) {
  console.log("[api.getReceived] filtros", { setorDestino: sector, page, pageSize });
  const primary = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.equal("setorDestino", sector),
    Query.limit(pageSize),
    Query.offset(Math.max(0, (page - 1) * pageSize))
  ]);
  const primaryDocs = primary.documents.map(mapDoc);
  console.log("[api.getReceived] primary docs", primaryDocs.map(d => ({ id: d.id, setorDestino: d.targetSector, setor: d.senderSector, status: d.status })));
  if (primaryDocs.length > 0) {
    return {
      items: primaryDocs,
      total: typeof primary.total === "number" ? primary.total : primary.documents.length
    };
  }
  const fallbackAll = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.limit(1000)
  ]);
  const allMapped = fallbackAll.documents.map(mapDoc);
  const filtered = allMapped.filter(d => {
    const dest = d.targetSector || "";
    const alt1 = d.setorDestino || "";
    const alt2 = d.destino || "";
    return eq(dest, sector) || eq(alt1, sector) || eq(alt2, sector);
  });
  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const items = filtered.slice(start, start + pageSize);
  console.log("[api.getReceived] fallback docs", items.map(d => ({ id: d.id, setorDestino: d.targetSector, status: d.status })));
  return { items, total };
}

export async function getSent(sector, hidden = [], { page = 1, pageSize = 10 } = {}) {
  console.log("[api.getSent] filtros", { authorSetor: sector, hidden, page, pageSize });
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.equal("authorSetor", sector),
    Query.limit(1000)
  ]);
  let all = res.documents.map(mapDoc);
  if (all.length === 0) {
    const fb = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
      Query.limit(1000)
    ]);
    all = fb.documents.map(mapDoc).filter(d => {
      const author = d.senderSector || "";
      const alt1 = d.authorSetor || "";
      const alt2 = d.setor || "";
      return eq(author, sector) || eq(alt1, sector) || eq(alt2, sector);
    });
  }
  all = all.filter(d => {
    return Array.isArray(hidden) && hidden.length > 0 ? !hidden.includes(d.targetSector) : true;
  });
  const total = all.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const items = all.slice(start, start + pageSize);
  console.log("[api.getSent] docs", items.map(d => ({ id: d.id, destino: d.targetSector, status: d.status })));
  return { items, total };
}

export function subscribeToProposals(handler) {
  const channel = `databases.${DB_ID}.collections.${COL_PROPOSTAS}.documents`;
  const unsub = client.subscribe(channel, (res) => {
    try { handler(res); } catch {}
  });
  return () => { try { unsub(); } catch {} };
}

export async function evaluateDocument(id, status, reviewerSector, reason) {
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (normalizeStatus(current.status) !== statuses.PENDENTE) {
    throw new Error("Documento já avaliado");
  }
  const author = current.authorSetor || current.setor || "";
  const destino = current.setorDestino || current.destino || current.targetSector || "";
  if (reviewerSector === "RH") {
    throw new Error("RH não pode avaliar documentos");
  }
  if (reviewerSector === "Peças") {
    if (destino !== "Peças") throw new Error("Peças só pode avaliar documentos destinados a Peças");
    if (author === "Peças") throw new Error("Peças não pode avaliar documento que ele mesmo enviou");
  } else {
    if (destino !== reviewerSector) throw new Error("Setor só pode avaliar documentos destinados ao próprio setor");
  }

  const update = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, {
    status,
    motivoRecusa: status === statuses.REPROVADO ? reason : null
  });

  await databases.createDocument(DB_ID, COL_NOTIFICACOES, ID.unique(), {
    titulo: `${status} pelo setor ${reviewerSector}`,
    mensagem: current.titulo,
    destinatarioSetor: current.setor,
    propostaId: id,
    tipo: status,
    data: new Date().toISOString(),
    lida: false
  });

  return mapDoc(update);
}

export async function deleteDocumentIfPending(id) {
  const current = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);

  if (normalizeStatus(current.status) !== statuses.PENDENTE) {
    throw new Error("Apenas documentos pendentes podem ser excluídos");
  }

  const acc = await getAccount();
  const extras = await getOrCreateUserExtras(acc.$id);
  const userSector = extras?.setor || "";
  const docAuthor = current.authorSetor || current.setor || "";

  if (userSector !== docAuthor) {
    throw new Error("Um setor não pode excluir documentos enviados por outro setor");
  }
  if (userSector === "RH" && docAuthor === "Peças") {
    throw new Error("RH não tem permissão para excluir documentos de Peças");
  }
  if (userSector === "Peças" && docAuthor === "RH") {
    throw new Error("Peças não tem permissão para excluir documentos do RH");
  }
  if (userSector !== "RH" && userSector !== "Peças") {
    throw new Error("Setores comuns não possuem permissão de exclusão");
  }

  await databases.deleteDocument(DB_ID, COL_PROPOSTAS, id);
  return true;
}

export async function getDocumentById(id) {
  const d = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  return mapDoc(d);
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
          const m = s.match(/pelo setor\s+(.+)$/i);
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

export async function getStats(sector, { source = "received" } = {}) {
  try {
    const base = source === "received" ? Query.equal("setorDestino", sector) : Query.equal("authorSetor", sector);
    const p = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [base, Query.equal("status", statuses.PENDENTE)]);
    const a = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [base, Query.equal("status", statuses.APROVADO)]);
    const r = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [base, Query.equal("status", statuses.REPROVADO)]);
    const tp = typeof p.total === "number" ? p.total : p.documents.length;
    const ta = typeof a.total === "number" ? a.total : a.documents.length;
    const tr = typeof r.total === "number" ? r.total : r.documents.length;
    return { pending: tp, approved: ta, rejected: tr };
  } catch {
    return { pending: 0, approved: 0, rejected: 0 };
  }
}

/* ================================
   MAP
================================ */

function mapDoc(d) {
  return {
    id: d.$id,
    title: d.titulo,
    description: d.descricao || "",
    senderSector: d.authorSetor,
    targetSector: d.setorDestino,
    fileData: d.pdfUri || null,
    date: d.data,
    status: d.status,
    reason: d.motivoRecusa || null
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
  let base = VITE_CANONICAL_URL || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalCanonical = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(String(VITE_CANONICAL_URL || ""));
  if (isLocalCanonical && origin && origin !== VITE_CANONICAL_URL) {
    base = origin;
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
  if (isLocalCanonical && origin && origin !== VITE_CANONICAL_URL) {
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
