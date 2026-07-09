import { db } from "./firebase-init.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { todayStr, formatDateNice, escapeHtml } from "./utils.js";

const COL = "notes";
let isAdmin = false;
let currentTab = "all";
let latestRows = [];

export function initNotebook(role) {
  isAdmin = role === "admin";

  document.getElementById("addNoteBtn")?.addEventListener("click", openForAdd);
  document.getElementById("noteForm").addEventListener("submit", onSubmit);

  document.querySelectorAll('#modalNote .tag-select .tag-opt').forEach((opt) => {
    opt.addEventListener("click", () => {
      const isTask = opt.dataset.type === "task";
      document.getElementById("noteDueWrap").style.display = isTask ? "block" : "none";
    });
  });

  document.querySelectorAll('#view-notebook .tab-btn').forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('#view-notebook .tab-btn').forEach((b) => b.classList.toggle("active", b === btn));
      render();
    });
  });

  listen();
}

function openForAdd() {
  document.getElementById("noteModalTitle").textContent = "New note";
  document.getElementById("noteId").value = "";
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteBody").value = "";
  document.getElementById("noteDue").value = "";
  document.getElementById("noteDueWrap").style.display = "none";
  document.querySelectorAll('#modalNote .tag-select .tag-opt').forEach((o) => o.classList.toggle("selected", o.dataset.type === "note"));
  document.getElementById("modalNote").classList.add("open");
}

function openForEdit(item) {
  document.getElementById("noteModalTitle").textContent = "Edit " + item.type;
  document.getElementById("noteId").value = item.id;
  document.getElementById("noteTitle").value = item.title;
  document.getElementById("noteBody").value = item.body || "";
  document.getElementById("noteDue").value = item.dueDate || "";
  document.getElementById("noteDueWrap").style.display = item.type === "task" ? "block" : "none";
  document.querySelectorAll('#modalNote .tag-select .tag-opt').forEach((o) => o.classList.toggle("selected", o.dataset.type === item.type));
  document.getElementById("modalNote").classList.add("open");
}

async function onSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("noteId").value;
  const typeOpt = document.querySelector('#modalNote .tag-select .tag-opt.selected');
  const type = typeOpt ? typeOpt.dataset.type : "note";
  const payload = {
    type,
    title: document.getElementById("noteTitle").value.trim(),
    body: document.getElementById("noteBody").value.trim(),
    dueDate: type === "task" ? (document.getElementById("noteDue").value || null) : null,
  };
  try {
    if (id) {
      await updateDoc(doc(db, COL, id), payload);
    } else {
      await addDoc(collection(db, COL), { ...payload, completed: false, createdAt: serverTimestamp() });
    }
    document.getElementById("modalNote").classList.remove("open");
  } catch (err) {
    alert("Couldn't save: " + err.message);
  }
}

async function toggleDone(item) {
  try {
    await updateDoc(doc(db, COL, item.id), { completed: !item.completed });
  } catch (err) {
    alert("Couldn't update: " + err.message);
  }
}

async function onDelete(id) {
  if (!confirm("Delete this?")) return;
  try {
    await deleteDoc(doc(db, COL, id));
  } catch (err) {
    alert("Couldn't delete: " + err.message);
  }
}

let unsub = null;
function listen() {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  unsub = onSnapshot(q, (snap) => {
    latestRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    document.getElementById("noteGrid").innerHTML =
      `<div class="empty-state">Couldn't load notebook: ${escapeHtml(err.message)}</div>`;
  });
}

function render() {
  const grid = document.getElementById("noteGrid");
  let rows = latestRows;
  if (currentTab !== "all") rows = rows.filter((r) => r.type === currentTab);
  rows = [...rows].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  if (rows.length === 0) {
    grid.innerHTML = `<div class="empty-state">Nothing here yet. Tap "+ New" to add a note or task.</div>`;
    return;
  }

  const today = todayStr();
  grid.innerHTML = rows.map((item) => {
    const overdue = item.type === "task" && item.dueDate && item.dueDate < today && !item.completed;
    return `
    <div class="card note-card ${item.type} ${item.completed ? "done" : ""}">
      <div style="display:flex; gap:10px; align-items:flex-start;">
        ${item.type === "task" ? `<button class="checkbox-btn ${item.completed ? "checked" : ""} chk-btn" data-id="${item.id}">${item.completed ? "✓" : ""}</button>` : ""}
        <div style="flex:1;">
          <div class="note-title">${escapeHtml(item.title)}</div>
          ${item.body ? `<div class="note-body">${escapeHtml(item.body)}</div>` : ""}
        </div>
      </div>
      <div class="note-meta">
        <span class="note-due ${overdue ? "overdue" : ""}">${item.type === "task" && item.dueDate ? (overdue ? "Overdue · " : "Due ") + formatDateNice(item.dueDate) : (item.type === "note" ? "Note" : "No due date")}</span>
        <span class="admin-only" style="${isAdmin ? "" : "display:none;"}">
          <button class="icon-btn edit-btn" data-id="${item.id}">Edit</button>
          <button class="icon-btn del del-btn" data-id="${item.id}">Delete</button>
        </span>
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".chk-btn").forEach((btn) =>
    btn.addEventListener("click", () => toggleDone(latestRows.find((r) => r.id === btn.dataset.id)))
  );
  grid.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => openForEdit(latestRows.find((r) => r.id === btn.dataset.id)))
  );
  grid.querySelectorAll(".del-btn").forEach((btn) =>
    btn.addEventListener("click", () => onDelete(btn.dataset.id))
  );
}

