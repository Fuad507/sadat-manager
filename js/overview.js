import { db } from "./firebase-init.js";
import {
  collection, onSnapshot, query, where, orderBy, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { money, monthKey, monthRange, monthLabel, shiftMonth, todayStr } from "./utils.js";

let currentMonth = monthKey();
let isAdmin = false;
let chart = null;
let budgets = { personalMonthlyLimit: 0, officeMonthlyLimit: 0 };

let expenseRows = [];
let officeRows = [];
let memberRows = [];

export function initOverview(role) {
  isAdmin = role === "admin";

  document.getElementById("ovPrev").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, -1); listenMonth(); });
  document.getElementById("ovNext").addEventListener("click", () => { currentMonth = shiftMonth(currentMonth, 1); listenMonth(); });

  document.getElementById("editBudgetsBtn")?.addEventListener("click", () => {
    document.getElementById("budgetPersonal").value = budgets.personalMonthlyLimit || "";
    document.getElementById("budgetOffice").value = budgets.officeMonthlyLimit || "";
    document.getElementById("modalBudget").classList.add("open");
  });

  document.getElementById("budgetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "budget"), {
        personalMonthlyLimit: Number(document.getElementById("budgetPersonal").value) || 0,
        officeMonthlyLimit: Number(document.getElementById("budgetOffice").value) || 0,
      });
      document.getElementById("modalBudget").classList.remove("open");
    } catch (err) {
      alert("Couldn't save budgets: " + err.message);
    }
  });

  onSnapshot(doc(db, "settings", "budget"), (snap) => {
    if (snap.exists()) budgets = snap.data();
    render();
  });

  // Open task count isn't month-scoped
  onSnapshot(collection(db, "notes"), (snap) => {
    const openTasks = snap.docs.filter((d) => {
      const v = d.data();
      return v.type === "task" && !v.completed;
    }).length;
    document.getElementById("statTasks").querySelector(".value").textContent = openTasks;
  });

  listenMonth();
}

let unsubExp = null, unsubOff = null, unsubMem = null;
function listenMonth() {
  document.getElementById("ovMonthLabel").textContent = monthLabel(currentMonth);
  const { start, end } = monthRange(currentMonth);

  if (unsubExp) unsubExp();
  if (unsubOff) unsubOff();
  if (unsubMem) unsubMem();

  unsubExp = onSnapshot(
    query(collection(db, "expenses"), where("date", ">=", start), where("date", "<=", end)),
    (snap) => { expenseRows = snap.docs.map((d) => d.data()); render(); }
  );
  unsubOff = onSnapshot(
    query(collection(db, "officeEntries"), where("date", ">=", start), where("date", "<=", end)),
    (snap) => { officeRows = snap.docs.map((d) => d.data()); render(); }
  );
  unsubMem = onSnapshot(
    query(collection(db, "memberTransactions"), where("date", ">=", start), where("date", "<=", end)),
    (snap) => { memberRows = snap.docs.map((d) => d.data()); render(); }
  );
}

function render() {
  const personalTotal = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const officeIncome = officeRows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0);
  const officeExpense = officeRows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0);
  const officeBalance = officeIncome - officeExpense;
  const membersTotal = memberRows.reduce((s, r) => s + Number(r.amount || 0), 0);

  document.getElementById("statPersonal").querySelector(".value").textContent = money(personalTotal);
  document.getElementById("statOffice").querySelector(".value").textContent = money(officeBalance);
  document.getElementById("statOffice").classList.toggle("bad", officeBalance < 0);
  document.getElementById("statMembers").querySelector(".value").textContent = money(membersTotal);

  renderPulseStrip();
  renderChart();
  renderBudgets(personalTotal, officeExpense);
}

function renderPulseStrip() {
  const strip = document.getElementById("pulseStrip");
  const { lastDay } = monthRange(currentMonth);
  const byDay = {};
  expenseRows.forEach((r) => {
    const day = Number(r.date.split("-")[2]);
    byDay[day] = (byDay[day] || 0) + Number(r.amount || 0);
  });
  const max = Math.max(1, ...Object.values(byDay));
  const today = todayStr();

  let html = "";
  for (let d = 1; d <= lastDay; d++) {
    const amt = byDay[d] || 0;
    const h = amt ? Math.max(18, Math.round((amt / max) * 100)) : 8;
    const dateStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === today;
    html += `<div class="pulse-seg ${amt ? "has-spend" : ""} ${isToday ? "today" : ""}" style="height:${h}%;" data-tip="${d}: ${amt ? money(amt) : "No spend"}"></div>`;
  }
  strip.innerHTML = html;
}

function renderChart() {
  const byCat = {};
  expenseRows.forEach((r) => (byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0)));
  const labels = Object.keys(byCat);
  const values = Object.values(byCat);

  const ctx = document.getElementById("categoryChart");
  if (!ctx || typeof Chart === "undefined") return;

  if (chart) chart.destroy();
  if (labels.length === 0) return;

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: "#6FA981",
        borderRadius: 6,
        maxBarThickness: 34,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#E1EAE3" } },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderBudgets(personalTotal, officeExpense) {
  const list = document.getElementById("budgetList");
  const rows = [
    { name: "Personal expenses", spent: personalTotal, limit: budgets.personalMonthlyLimit },
    { name: "Office expenses", spent: officeExpense, limit: budgets.officeMonthlyLimit },
  ];

  list.innerHTML = rows.map((r) => {
    if (!r.limit) {
      return `<div class="budget-row"><div class="top"><span class="name">${r.name}</span><span>${money(r.spent)} spent</span></div><div class="bar-track"><div class="bar-fill" style="width:0%"></div></div></div>`;
    }
    const pct = Math.min(150, Math.round((r.spent / r.limit) * 100));
    const cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
    return `
      <div class="budget-row">
        <div class="top"><span class="name">${r.name}</span><span>${money(r.spent)} / ${money(r.limit)}</span></div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.min(100, pct)}%"></div></div>
      </div>`;
  }).join("");
}
