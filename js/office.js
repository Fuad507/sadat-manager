import { db, OFFICE_CATEGORIES } from "./firebase-init.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { money, monthKey, monthRange, monthLabel, shiftMonth, todayStr, formatDateNice, escapeHtml } from "./utils.js";

const COL = "officeEntries";
let currentMonth = monthKey();
let isAdmin = false;
let latestRows = [];

export function initOffice(role) {
  isAdmin = role === "admin";
  buildCategoryTags();

  document.getElementById("ofPrev").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, -1); listen(); });
  document.getElementById("ofNext").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, 1); listen(); });

  document.getElementById("addOfficeBtn")?.addEventListener("click", openForAdd);
  document.getElementById("officeForm").addEventListener("submit", onSubmit);

  listen();
}

// Selection (single-pick) for these tags is handled centrally in app.js,
// which delegates clicks on any ".tag-select" wrapper — this just renders them.
function buildCategoryTags() {
  const wrap = document.getElementById("ofCategoryTags");
  wrap.innerHTML = OFFICE_CATEGORIES.map(
    (c) => `<div class="tag-opt" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</div>`
  ).join("");
}

function openForAdd() {
  document.getElementById("ofDate").value = todayStr();
  document.getElementById("ofAmount").value = "";
  document.getElementById("ofNote").value = "";
  document.querySelectorAll("#ofCategoryTags .tag-opt").forEach((o) => o.classList.remove("selected"));
  document.querySelectorAll('#officeForm .tag-select .tag-opt').forEach((o) => o.classList.toggle("selected", o.dataset.type === "expense"));
  document.getElementById("modalOffice").classList.add("open");
}

async function onSubmit(e) {
  e.preventDefault();
  const typeOpt = document.querySelector('#officeForm .tag-select .tag-opt.selected[data-type]');
  const catOpt = document.querySelector("#ofCategoryTags .tag-opt.selected");
  const payload = {
    type: typeOpt ? typeOpt.dataset.type : "expense",
    date: document.getElementById("ofDate").value,
    amount: Number(document.getElementById("ofAmount").value) || 0,
    category: catOpt ? catOpt.dataset.cat : "Other",
    note: document.getElementById("ofNote").value.trim(),
  };
  try {
    await addDoc(collection(db, COL), { ...payload, createdAt: serverTimestamp() });
    document.getElementById("modalOffice").classList.remove("open");
  } catch (err) {
    alert("Couldn't save: " + err.message);
  }
}

async function onDelete(id) {
  if (!confirm("Delete this entry?")) return;
  try {
    await deleteDoc(doc(db, COL, id));
  } catch (err) {
    alert("Couldn't delete: " + err.message);
  }
}

let unsub = null;
function listen() {
  document.getElementById("ofMonthLabel").textContent = monthLabel(currentMonth);
  const { start, end } = monthRange(currentMonth);
  const q = query(collection(db, COL), where("date", ">=", start), where("date", "<=", end), orderBy("date", "desc"));
  if (unsub) unsub();
  unsub = onSnapshot(q, (snap) => {
    latestRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    document.getElementById("officeRows").innerHTML =
      `<tr><td colspan="6" class="empty-state">Couldn't load: ${escapeHtml(err.message)}</td></tr>`;
  });
}

function render() {
  const income = latestRows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0);
  const expense = latestRows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0);
  const balance = income - expense;

  document.getElementById("ofIncome").textContent = money(income);
  document.getElementById("ofExpense").textContent = money(expense);
  document.getElementById("ofBalance").textContent = money(balance);
  document.getElementById("ofBalanceCard").classList.toggle("bad", balance < 0);

  const tbody = document.getElementById("officeRows");
  if (latestRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No entries for this month yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = latestRows.map((r) => `
    <tr>
      <td>${formatDateNice(r.date)}</td>
      <td><span class="chip ${r.type}">${r.type === "income" ? "Income" : "Expense"}</span></td>
      <td><span class="chip office">${escapeHtml(r.category)}</span></td>
      <td>${escapeHtml(r.note) || "—"}</td>
      <td class="amount num">${money(r.amount)}</td>
      <td class="row-actions admin-only" ${isAdmin ? "" : 'style="display:none;"'}>
        <button class="icon-btn del del-btn" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join("");
  tbody.querySelectorAll(".del-btn").forEach((btn) => btn.addEventListener("click", () => onDelete(btn.dataset.id)));
}

