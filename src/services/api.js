import { Client, Databases, Storage, ID, Query } from "appwrite";
import { statuses } from "../utils/constants.js";

const LS = {
  session: "setorlink.session"
};

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = import.meta.env.VITE_APPWRITE_PROJECT;
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL_PROPOSTAS = import.meta.env.VITE_APPWRITE_COLLECTION_PROPOSTAS;
const COL_NOTIFICACOES = import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICACOES;
const COL_USUARIOS = import.meta.env.VITE_APPWRITE_COLLECTION_USUARIOS;

const client = new Client();
if (APPWRITE_ENDPOINT) client.setEndpoint(APPWRITE_ENDPOINT);
if (APPWRITE_PROJECT) client.setProject(APPWRITE_PROJECT);
const databases = new Databases(client);
const storage = new Storage(client);
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID || null;

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(LS.session)) ?? null;
  } catch {
    return null;
  }
}
function writeSession(value) {
  localStorage.setItem(LS.session, JSON.stringify(value));
}

export function getSession() {
  return readSession();
}

export async function login(sector, password) {
  const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [Query.equal("setor", sector)]);
  let u = res.documents[0];
  if (!u) {
    u = await databases.createDocument(DB_ID, COL_USUARIOS, ID.unique(), {
      uid: ID.unique(),
      setor: sector,
      nome: sector,
      senhaHash: "123456"
      , isAdmin: false
    });
  }
  const pass = u.senhaHash;
  if (password !== pass) throw new Error("Senha inválida");
  const user = { uid: u.uid, sector: u.setor, name: u.nome || sector, avatar: u.caminhoDeArmazenamentoDeFotos || null, mustChangePassword: pass === "123456" };
  writeSession(user);
  return user;
}

export function logout() {
  localStorage.removeItem(LS.session);
}

export async function sendDocument({ title, description, file, fileData, senderSector, targetSector }) {
  const now = new Date().toISOString();
  const targets = Array.isArray(targetSector) ? targetSector : [targetSector];
  const created = [];
  let pdfUri = null;
  if (file && BUCKET_ID) {
    const rawId = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.replace(/[^a-z0-9_]/gi, "");
    const fileId = rawId.slice(0, 24);
    await storage.createFile(BUCKET_ID, ID.custom(fileId), file);
    const viewUrl = storage.getFileView(BUCKET_ID, fileId);
    const dlUrl = storage.getFileDownload(BUCKET_ID, fileId);
    pdfUri = (viewUrl && viewUrl.href) ? viewUrl.href : (dlUrl && dlUrl.href ? dlUrl.href : "");
  } else {
    const uri = String(fileData || "");
    if (uri.length > 2048) {
      throw new Error("Arquivo muito grande para campo pdfUri. Configure VITE_APPWRITE_BUCKET_ID para usar Storage.");
    }
    pdfUri = uri;
  }
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
      uidCriador: readSession()?.uid || ""
    });
    await databases.createDocument(DB_ID, COL_NOTIFICACOES, ID.unique(), {
      titulo: `Novo documento do setor ${senderSector}`,
      mensagem: doc.titulo,
      destinatarioSetor: target,
      destinatarioUid: "",
      propostaId: doc.$id,
      tipo: "Novo",
      data: now,
      lida: false
    });
    created.push({
      id: doc.$id,
      title: doc.titulo,
      description: doc.descricao,
      senderSector: doc.authorSetor || doc.setor,
      targetSector: doc.setorDestino,
      fileData: doc.pdfUri,
      date: doc.data,
      status: doc.status
    });
  }
  try { localStorage.setItem("setorlink.notifications", String(Date.now())); } catch {}
  return created;
}

export async function getReceived(sector, opts = {}) {
  const page = Number(opts.page || 1);
  const pageSize = Number(opts.pageSize || 10);
  const offset = (page - 1) * pageSize;
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.equal("setorDestino", sector),
    Query.limit(pageSize),
    Query.offset(offset)
  ]);
  return {
    items: res.documents.map(mapDoc),
    total: typeof res.total === "number" ? res.total : res.documents.length,
    page,
    pageSize
  };
}

export async function getSent(sector, hiddenFrom = [], opts = {}) {
  const page = Number(opts.page || 1);
  const pageSize = Number(opts.pageSize || 10);
  const offset = (page - 1) * pageSize;
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [
    Query.equal("authorSetor", sector),
    Query.limit(pageSize),
    Query.offset(offset)
  ]);
  const items = res.documents.map(mapDoc).filter(d => !hiddenFrom.includes(d.targetSector));
  return {
    items,
    total: typeof res.total === "number" ? res.total : items.length,
    page,
    pageSize
  };
}

export async function getDocumentById(id) {
  try {
    const d = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
    return mapDoc(d);
  } catch {
    return null;
  }
}

export async function evaluateDocument(id, status, reviewerSector, reason) {
  const cur = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  if (cur.status !== statuses.PENDENTE) {
    throw new Error("Este documento já foi avaliado e não pode ser modificado.");
  }
  const r = status === statuses.REPROVADO ? String(reason || "").trim() : null;
  if (status === statuses.REPROVADO && !r) {
    throw new Error("Informe o motivo da reprovação.");
  }
  const ensureData = cur.data || cur.$createdAt || new Date().toISOString();
  const upd = await databases.updateDocument(DB_ID, COL_PROPOSTAS, id, { status, motivoRecusa: r || null, data: ensureData });
  await databases.createDocument(DB_ID, COL_NOTIFICACOES, ID.unique(), {
    titulo: status === statuses.APROVADO ? `Aprovado pelo setor ${reviewerSector}` : `Reprovado pelo setor ${reviewerSector}`,
    mensagem: cur.titulo,
    destinatarioSetor: cur.setor,
    destinatarioUid: cur.uidCriador || "",
    propostaId: id,
    tipo: status,
    data: new Date().toISOString(),
    lida: false
  });
  try {
    localStorage.setItem("setorlink.documents", String(Date.now()));
    localStorage.setItem("setorlink.notifications", String(Date.now()));
  } catch {}
  return mapDoc(upd);
}

export async function deleteDocumentIfPending(id) {
  const cur = await databases.getDocument(DB_ID, COL_PROPOSTAS, id);
  if (cur.status !== statuses.PENDENTE) throw new Error("Apenas documentos Pendentes podem ser excluídos");
  await databases.deleteDocument(DB_ID, COL_PROPOSTAS, id);
  return true;
}

export async function getNotifications(sector) {
  const res = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [Query.equal("destinatarioSetor", sector)]);
  return res.documents.map(d => {
    const match = String(d.titulo || "").match(/setor\s(.+)$/);
    const reviewerSector = match ? match[1] : null;
    return {
      id: d.$id,
      documentId: d.propostaId,
      to: d.destinatarioSetor,
      newStatus: d.tipo,
      reviewerSector,
      title: d.titulo,
      documentTitle: d.mensagem,
      date: d.data,
      reason: null
    };
  });
}

export async function getStats(sector, opts = {}) {
  const source = opts.source === "sent" ? "sent" : "received";
  const query = source === "sent" ? Query.equal("authorSetor", sector) : Query.equal("setorDestino", sector);
  const res = await databases.listDocuments(DB_ID, COL_PROPOSTAS, [query]);
  const docs = res.documents.map(mapDoc);
  const pending = docs.filter(d => d.status === statuses.PENDENTE).length;
  const approved = docs.filter(d => d.status === statuses.APROVADO).length;
  const rejected = docs.filter(d => d.status === statuses.REPROVADO).length;
  return { pending, approved, rejected };
}

export async function deleteNotification(id) {
  await databases.deleteDocument(DB_ID, COL_NOTIFICACOES, id);
  return true;
}

export async function clearNotifications(sector) {
  const res = await databases.listDocuments(DB_ID, COL_NOTIFICACOES, [Query.equal("destinatarioSetor", sector)]);
  await Promise.all(res.documents.map(d => databases.deleteDocument(DB_ID, COL_NOTIFICACOES, d.$id)));
  return true;
}

export async function updateProfile({ sector, name, avatar }) {
  const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [Query.equal("setor", sector)]);
  const found = res.documents[0];
  if (!found) throw new Error("Usuário não encontrado");
  const u = await databases.updateDocument(DB_ID, COL_USUARIOS, found.$id, { nome: name });
  const session = readSession();
  if (session && session.sector === sector) {
    writeSession({ ...session, name: u.nome, avatar: avatar || null });
  }
  return { sector: u.setor, name: u.nome, avatar: avatar || null };
}

export async function updatePassword({ sector, newPassword }) {
  const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [Query.equal("setor", sector)]);
  const u = res.documents[0];
  if (!u) throw new Error("Usuário não encontrado");
  await databases.updateDocument(DB_ID, COL_USUARIOS, u.$id, { senhaHash: newPassword });
  const session = readSession();
  if (session && session.sector === sector) {
    writeSession({ ...session, mustChangePassword: newPassword === "123456" });
  }
  return true;
}

export async function resetPassword(targetSector) {
  const res = await databases.listDocuments(DB_ID, COL_USUARIOS, [Query.equal("setor", targetSector)]);
  const u = res.documents[0];
  if (!u) throw new Error("Usuário não encontrado");
  await databases.updateDocument(DB_ID, COL_USUARIOS, u.$id, { senhaHash: "123456" });
  return true;
}

function mapDoc(d) {
  return {
    id: d.$id,
    title: d.titulo,
    description: d.descricao || "",
    senderSector: d.authorSetor || d.setor,
    targetSector: d.setorDestino,
    fileData: d.pdfUri || null,
    date: d.data,
    status: d.status,
    reviewerSector: null,
    evaluatedAt: null,
    reason: d.motivoRecusa || null
  };
}
