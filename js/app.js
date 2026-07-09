import { guardDashboard, logout } from "./auth.js";
import { initOverview } from "./overview.js";
import { initExpenses } from "./expenses.js";
import { initNotebook } from "./notebook.js";
import { initMembers } from "./members.js";
import { initOffice } from "./office.js";

const { user, role } = await guardDashboard();

// ---------- Sidebar identity ----------
document.getElementById("roleChip").textContent = role === "admin" ? "ADMIN" : "VIEWER";
document.getElementById("roleChip").classList.toggle("viewer", role !== "admin");
document.getElementById("userName").textContent = role === "admin" ? "Nazmus Sadat" : "Dashboard account";
document.getElementById("userPhone").textContent = user.email.split("@")[0];
document.getElementById("overviewName").textContent = role === "admin" ? ", Nazmus Sadat" : "";

if (role !== "admin") {
  document.body.classList.add("viewer-mode");
  document.querySelectorAll(".admin-only").forEach((el) => (el.style.display = "none"));
  document.getElementById("viewerBanner").style.display = "block";
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ---------- Navigation ----------
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

export function showView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === name));
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// ---------- Generic modal open/close ----------
export function openModal(id) {
  document.getElementById(id).classList.add("open");
}
export function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});
document.querySelectorAll(".modal-backdrop").forEach((bd) => {
  bd.addEventListener("click", (e) => {
    if (e.target === bd) bd.classList.remove("open");
  });
});

// ---------- Tag-select helper (used by several forms) ----------
document.querySelectorAll(".tag-select").forEach((group) => {
  group.addEventListener("click", (e) => {
    const opt = e.target.closest(".tag-opt");
    if (!opt || !group.contains(opt)) return;
    // single-select groups with data-type (note type / office type) act like radios
    if (opt.dataset.type !== undefined && group.querySelectorAll(".tag-opt").length <= 3) {
      group.querySelectorAll(".tag-opt").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
    } else {
      opt.classList.toggle("selected");
      // category pickers: keep single-select too
      group.querySelectorAll(".tag-opt").forEach((o) => {
        if (o !== opt) o.classList.remove("selected");
      });
    }
  });
});

// ---------- Init feature modules ----------
initOverview(role);
initExpenses(role);
initNotebook(role);
initMembers(role);
initOffice(role);

// Quick-add FAB jumps to the expense form from anywhere (admin only)
const fab = document.getElementById("quickAddFab");
if (fab) {
  fab.addEventListener("click", () => {
    showView("expenses");
    openModal("modalExpense");
  });
}
