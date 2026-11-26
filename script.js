const filters = document.querySelectorAll(".filter");
const cards = document.querySelectorAll(".place-card");
const emptyState = document.getElementById("emptyState");
const globalSearch = document.getElementById("globalSearch");

function applyFilters() {
  const active = document.querySelector(".filter.active")?.dataset.category || "all";
  const query = (globalSearch.value || "").trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const categoryMatch = active === "all" || card.dataset.category === active;
    const text = `${card.dataset.search} ${card.innerText}`.toLowerCase();
    const searchMatch = !query || text.includes(query);
    const show = categoryMatch && searchMatch;
    card.hidden = !show;
    if (show) visible++;
  });
  emptyState.hidden = visible !== 0;
}

filters.forEach(button => button.addEventListener("click", () => {
  filters.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  applyFilters();
}));

document.getElementById("searchButton").addEventListener("click", () => {
  document.getElementById("explore").scrollIntoView({behavior:"smooth"});
  applyFilters();
});
globalSearch.addEventListener("input", applyFilters);
globalSearch.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    document.getElementById("explore").scrollIntoView({behavior:"smooth"});
    applyFilters();
  }
});

document.querySelectorAll("[data-destination]").forEach(link => link.addEventListener("click", () => {
  document.getElementById("endLocation").value = link.dataset.destination;
}));

document.getElementById("routeButton").addEventListener("click", () => {
  const start = document.getElementById("startLocation").value.trim();
  const end = document.getElementById("endLocation").value.trim();
  const message = document.getElementById("routeMessage");
  if (!start || !end) {
    message.textContent = "Please enter both your starting point and destination to preview the route request.";
    return;
  }
  message.textContent = `Route request saved in this demo: ${start} → ${end}. Actual directions will be available after verified campus routes are added.`;
});

document.getElementById("languageToggle").addEventListener("click", () => {
  alert("Kiswahili interface is planned for the next development phase.");
});

document.getElementById("menuToggle").addEventListener("click", () => {
  const nav = document.querySelector(".desktop-nav");
  const open = nav.style.display === "flex";
  nav.style.display = open ? "none" : "flex";
  nav.style.position = "absolute";
  nav.style.top = "68px";
  nav.style.left = "0";
  nav.style.right = "0";
  nav.style.padding = "20px";
  nav.style.background = "#fff";
  nav.style.flexDirection = "column";
  nav.style.boxShadow = "0 12px 24px #102b4615";
});
