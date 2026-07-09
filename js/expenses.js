import { db, EXPENSE_CATEGORIES } from "./firebase-init.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { money, monthKey, monthRange, monthLabel, shiftMonth, todayStr, formatDateNice, escapeHtml } from "./utils.js";

const COL = "expenses";
let currentMonth = monthKey();
let isAdmin = false;

export function initExpenses(role) {
  isAdmin = role === "admin";
  buildCategoryTags();
  document.getElementById("exPrev").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, -1); listen(); });
  document.getElementById("exNext").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, 1); listen(); });

  document.getElementById("addExpenseBtn")?.addEventListener("click", () => openForAdd());

  document.getElementById("expenseForm").addEventListener("submit", onSubmit);

  listen();
}

// Selection (single-pick) for these tags is handled centrally in app.js,
// which delegates clicks on any ".tag-select" wrapper — this just renders them.
function buildCategoryTags() {
  const wrap = document.getElementById("expCategoryTags");
  wrap.innerHTML = EXPENSE_CATEGORIES.map(
    (c) => `<div class="tag-opt" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</div>`
  ).join("");
}

function openForAdd() {
  document.getElementById("expenseModalTitle").textContent = "Add expense";
  document.getElementById("expId").value = "";
  document.getElementById("expDate").value = todayStr();
  document.getElementById("expAmount").value = "";
  document.getElementById("expNote").value = "";
  document.querySelectorAll("#expCategoryTags .tag-opt").forEach((o) => o.classList.remove("selected"));
  document.getElementById("modalExpense").classList.add("open");
}

function openForEdit(exp) {
  document.getElementById("expenseModalTitle").textContent = "Edit expense";
  document.getElementById("expId").value = exp.id;
  document.getElementById("expDate").value = exp.date;
  document.getElementById("expAmount").value = exp.amount;
  document.getElementById("expNote").value = exp.note || "";
  document.querySelectorAll("#expCategoryTags .tag-opt").forEach((o) =>
    o.classList.toggle("selected", o.dataset.cat === exp.category)
  );
  document.getElementById("modalExpense").classList.add("open");
}

async function onSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("expId").value;
  const selectedTag = document.querySelector("#expCategoryTags .tag-opt.selected");
  const payload = {
    date: document.getElementById("expDate").value,
    amount: Number(document.getElementById("expAmount").value) || 0,
    category: selectedTag ? selectedTag.dataset.cat : "Other",
    note: document.getElementById("expNote").value.trim(),
  };
  try {
    if (id) {
      await updateDoc(doc(db, COL, id), payload);
    } else {
      await addDoc(collection(db, COL), { ...payload, createdAt: serverTimestamp() });
    }
    document.getElementById("modalExpense").classList.remove("open");
  } catch (err) {
    alert("Couldn't save this expense: " + err.message);
  }
}

async function onDelete(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    await deleteDoc(doc(db, COL, id));
  } catch (err) {
    alert("Couldn't delete: " + err.message);
  }
}

let unsub = null;
function listen() {
  document.getElementById("exMonthLabel").textContent = monthLabel(currentMonth);
  const { start, end } = monthRange(currentMonth);
  const q = query(
    collection(db, COL),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "desc")
  );
  if (unsub) unsub();
  unsub = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render(rows);
  }, (err) => {
    document.getElementById("expenseRows").innerHTML =
      `<tr><td colspan="5" class="empty-state">Couldn't load expenses: ${escapeHtml(err.message)}</td></tr>`;
  });
}

function render(rows) {
  const tbody = document.getElementById("expenseRows");
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  document.getElementById("exTotal").textContent = money(total);
  document.getElementById("exCount").textContent = rows.length;

  const byCat = {};
  rows.forEach((r) => (byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0)));
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("exTopCat").textContent = top ? top[0] : "—";

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No expenses logged for this month yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td>${formatDateNice(r.date)}</td>
      <td><span class="chip">${escapeHtml(r.category)}</span></td>
      <td>${escapeHtml(r.note) || "—"}</td>
      <td class="amount num">${money(r.amount)}</td>
      <td class="row-actions admin-only" ${isAdmin ? "" : 'style="display:none;"'}>
        <button class="icon-btn edit-btn" data-id="${r.id}">Edit</button>
        <button class="icon-btn del del-btn" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => openForEdit(rows.find((r) => r.id === btn.dataset.id)))
  );
  tbody.querySelectorAll(".del-btn").forEach((btn) =>
    btn.addEventListener("click", () => onDelete(btn.dataset.id))
  );
}
