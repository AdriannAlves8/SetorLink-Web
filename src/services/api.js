import { statuses } from "../utils/constants.js";

const LS = {
  session: "setorlink.session",
  documents: "setorlink.documents",
  notifications: "setorlink.notifications",
  users: "setorlink.users"
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSession() {
  return read(LS.session, null);
}
export async function login(sector, password) {
  await delay(300);
  const users = read(LS.users, {});
  const pass = users[sector]?.password ?? "123456";
  if (password !== pass) throw new Error("Senha inválida");
  const user = { sector, name: users[sector]?.name ?? sector, avatar: users[sector]?.avatar ?? null, mustChangePassword: pass === "123456" };
  write(LS.session, user);
  return user;
}
export function logout() {
  localStorage.removeItem(LS.session);
}

export async function sendDocument({ title, description, fileData, senderSector, targetSector }) {
  await delay(300);
  const docs = read(LS.documents, []);
  const id = cryptoRandomId();
  const now = new Date().toISOString();
  const doc = { id, title, description, senderSector, targetSector, fileData, date: now, status: statuses.PENDENTE };
  docs.push(doc);
  write(LS.documents, docs);
  return doc;
}

export async function getReceived(sector) {
  await delay(200);
  const docs = read(LS.documents, []);
  return docs.filter(d => d.targetSector === sector);
}
export async function getSent(sector, hiddenFrom = []) {
  await delay(200);
  const docs = read(LS.documents, []);
  const base = docs.filter(d => d.senderSector === sector);
  return base.filter(d => !hiddenFrom.includes(d.targetSector));
}
export async function getDocumentById(id) {
  await delay(200);
  const docs = read(LS.documents, []);
  return docs.find(d => d.id === id) ?? null;
}
export async function evaluateDocument(id, status, reviewerSector, reason) {
  await delay(200);
  const docs = read(LS.documents, []);
  const idx = docs.findIndex(d => d.id === id);
  if (idx === -1) throw new Error("Documento não encontrado");
  // Regra: impedir reavaliação. Apenas documentos PENDENTES podem ser atualizados.
  if (docs[idx].status !== statuses.PENDENTE) {
    throw new Error("Este documento já foi avaliado e não pode ser modificado.");
  }
  if (status === statuses.REPROVADO) {
    const r = (reason || "").trim();
    if (!r) throw new Error("Informe o motivo da reprovação.");
    docs[idx].reason = r;
  } else {
    delete docs[idx].reason;
  }
  docs[idx].status = status;
  docs[idx].reviewerSector = reviewerSector;
  docs[idx].evaluatedAt = new Date().toISOString();
  write(LS.documents, docs);
  const notif = {
    id: cryptoRandomId(),
    documentId: id,
    to: docs[idx].senderSector,
    newStatus: status,
    reviewerSector,
    documentTitle: docs[idx].title,
    date: docs[idx].evaluatedAt,
    reason: docs[idx].reason || null
  };
  const ns = read(LS.notifications, []);
  ns.push(notif);
  write(LS.notifications, ns);
  return docs[idx];
}
export async function deleteDocumentIfPending(id) {
  await delay(200);
  const docs = read(LS.documents, []);
  const idx = docs.findIndex(d => d.id === id);
  if (idx === -1) return false;
  if (docs[idx].status !== statuses.PENDENTE) throw new Error("Apenas documentos Pendentes podem ser excluídos");
  docs.splice(idx, 1);
  write(LS.documents, docs);
  return true;
}

export async function getNotifications(sector) {
  await delay(150);
  const ns = read(LS.notifications, []);
  return ns.filter(n => n.to === sector);
}
export async function getStats(sector) {
  await delay(100);
  const docs = read(LS.documents, []);
  const received = docs.filter(d => d.targetSector === sector);
  const pending = received.filter(d => d.status === statuses.PENDENTE).length;
  const approved = received.filter(d => d.status === statuses.APROVADO).length;
  const rejected = received.filter(d => d.status === statuses.REPROVADO).length;
  return { pending, approved, rejected };
}
export async function deleteNotification(id) {
  await delay(100);
  const ns = read(LS.notifications, []);
  const idx = ns.findIndex(n => n.id === id);
  if (idx === -1) return false;
  ns.splice(idx, 1);
  write(LS.notifications, ns);
  return true;
}
export async function clearNotifications(sector) {
  await delay(100);
  const ns = read(LS.notifications, []);
  const left = ns.filter(n => n.to !== sector);
  write(LS.notifications, left);
  return true;
}

export async function updateProfile({ sector, name, avatar }) {
  await delay(200);
  const users = read(LS.users, {});
  users[sector] = { ...(users[sector] || {}), name, avatar, password: users[sector]?.password ?? "123456" };
  write(LS.users, users);
  const session = read(LS.session, null);
  if (session && session.sector === sector) {
    write(LS.session, { ...session, name, avatar });
  }
  return users[sector];
}

export async function updatePassword({ sector, newPassword }) {
  await delay(200);
  const users = read(LS.users, {});
  // Atualiza a senha do setor no mock store
  users[sector] = { ...(users[sector] || {}), password: newPassword };
  write(LS.users, users);
  const session = read(LS.session, null);
  if (session && session.sector === sector) {
    write(LS.session, { ...session, mustChangePassword: newPassword === "123456" });
  }
  return true;
}

export async function resetPassword(targetSector) {
  await delay(200);
  const users = read(LS.users, {});
  users[targetSector] = { ...(users[targetSector] || {}), password: "123456" };
  write(LS.users, users);
  return true;
}

// utilidades
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
function cryptoRandomId() {
  try {
    return [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}
