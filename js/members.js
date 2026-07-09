import { db } from "./firebase-init.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { money, todayStr, monthRange, monthKey, formatDateNice, escapeHtml, initials } from "./utils.js";

const MEMBERS_COL = "members";
const TXN_COL = "memberTransactions";
let isAdmin = false;
let members = [];
let allTxns = [];
let activeMemberId = null;
let unsubDetail = null;

export function initMembers(role) {
  isAdmin = role === "admin";

  document.getElementById("addMemberBtn")?.addEventListener("click", () => {
    document.getElementById("memName").value = "";
    document.getElementById("memRelation").value = "";
    document.getElementById("memPhone").value = "";
    document.getElementById("modalMember").classList.add("open");
  });

  document.getElementById("memberForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, MEMBERS_COL), {
        name: document.getElementById("memName").value.trim(),
        relation: document.getElementById("memRelation").value.trim(),
        phone: document.getElementById("memPhone").value.trim(),
        createdAt: serverTimestamp(),
      });
      document.getElementById("modalMember").classList.remove("open");
    } catch (err) {
      alert("Couldn't add member: " + err.message);
    }
  });

  document.getElementById("backToMembers").addEventListener("click", () => {
    if (unsubDetail) unsubDetail();
    switchView("members");
  });

  document.getElementById("addTxnBtn")?.addEventListener("click", () => {
    document.getElementById("txnDate").value = todayStr();
    document.getElementById("txnAmount").value = "";
    document.getElementById("txnNote").value = "";
    document.getElementById("modalTxn").classList.add("open");
  });

  document.getElementById("txnForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeMemberId) return;
    try {
      await addDoc(collection(db, TXN_COL), {
        memberId: activeMemberId,
        date: document.getElementById("txnDate").value,
        amount: Number(document.getElementById("txnAmount").value) || 0,
        note: document.getElementById("txnNote").value.trim(),
        createdAt: serverTimestamp(),
      });
      document.getElementById("modalTxn").classList.remove("open");
    } catch (err) {
      alert("Couldn't save: " + err.message);
    }
  });

  onSnapshot(collection(db, MEMBERS_COL), (snap) => {
    members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGrid();
  });

  onSnapshot(collection(db, TXN_COL), (snap) => {
    allTxns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGrid();
    if (activeMemberId) renderDetailStats();
  });
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === name));
}

function totalFor(memberId) {
  return allTxns.filter((t) => t.memberId === memberId).reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

function renderGrid() {
  const grid = document.getElementById("memberGrid");
  if (members.length === 0) {
    grid.innerHTML = `<div class="empty-state">No members added yet.</div>`;
    return;
  }
  grid.innerHTML = members.map((m) => `
    <div class="card member-card" data-id="${m.id}">
      <div class="member-top">
        <div class="avatar">${escapeHtml(initials(m.name))}</div>
        <div>
          <div class="member-name">${escapeHtml(m.name)}</div>
          <div class="member-relation">${escapeHtml(m.relation) || "Member"}</div>
        </div>
      </div>
      <div class="member-total">
        <span class="label">Total given</span>
        ${money(totalFor(m.id))}
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".member-card").forEach((card) => {
    card.addEventListener("click", () => openDetail(card.dataset.id));
  });
}

function openDetail(memberId) {
  const m = members.find((x) => x.id === memberId);
  if (!m) return;
  activeMemberId = memberId;
  document.getElementById("mdName").textContent = m.name;
  document.getElementById("mdRelation").textContent = m.relation || "Member";
  if (!isAdmin) document.getElementById("addTxnBtn").style.display = "none";

  if (unsubDetail) unsubDetail();
  // Sorted client-side (rather than an orderBy in the query) so this doesn't
  // need a Firestore composite index to work out of the box.
  const q = query(collection(db, TXN_COL), where("memberId", "==", memberId));
  unsubDetail = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.date < b.date ? 1 : -1));
    renderDetailRows(rows);
  });

  switchView("member-detail");
}

function renderDetailStats() {
  const total = totalFor(activeMemberId);
  const { start, end } = monthRange(monthKey());
  const month = allTxns
    .filter((t) => t.memberId === activeMemberId && t.date >= start && t.date <= end)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  document.getElementById("mdTotal").textContent = money(total);
  document.getElementById("mdMonth").textContent = money(month);
}

async function deleteTxn(id) {
  if (!confirm("Delete this entry?")) return;
  try {
    await deleteDoc(doc(db, TXN_COL, id));
  } catch (err) {
    alert("Couldn't delete: " + err.message);
  }
}

function renderDetailRows(rows) {
  document.getElementById("mdCount").textContent = rows.length;
  renderDetailStats();

  const tbody = document.getElementById("txnRows");
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No entries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((t) => `
    <tr>
      <td>${formatDateNice(t.date)}</td>
      <td>${escapeHtml(t.note) || "—"}</td>
      <td class="amount num">${money(t.amount)}</td>
      <td class="row-actions admin-only" ${isAdmin ? "" : 'style="display:none;"'}>
        <button class="icon-btn del del-btn" data-id="${t.id}">Delete</button>
      </td>
    </tr>
  `).join("");
  tbody.querySelectorAll(".del-btn").forEach((btn) => btn.addEventListener("click", () => deleteTxn(btn.dataset.id)));
}

