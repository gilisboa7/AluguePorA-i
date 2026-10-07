/* =====================================================================
   APLICAÇÃO — login, rotas e proteção de acesso
   Rotas:  #/login · #/admin/<página> · #/cliente/<página>
   A rota é protegida aqui e, no Supabase, o banco recusa qualquer
   escrita de quem não é admin (RLS).
   ===================================================================== */
(function () {
  "use strict";
  const { U, API, Store, toast, animateNumbers } = window.APA;
  const root = U.$("#app");
  let user = null;

  const ICON = {
    home: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    rocket: '<path d="M13 3c3.5 1 6 3.5 7 7l-6.5 6.5-7-7z"/><path d="M6.5 9.5 4 10l-1 3 3.5-.5M14.5 17.5 14 20l-3 1 .5-3.5M15.5 8.5h.01"/>',
    house: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/><path d="M12 17c-1.6-1.3-2.4-2.3-2.4-3.2 0-.8.6-1.3 1.2-1.3.5 0 1 .3 1.2.8.2-.5.7-.8 1.2-.8.6 0 1.2.5 1.2 1.3 0 .9-.8 1.9-2.4 3.2z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    chart: '<path d="M4 19h16M6 16l4-5 3 3 5-7"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ""}</svg>`;
  const LOGO = (w = 40, fill = "#85DAA3", heart = "#fff") => `<svg viewBox="100 70 520 470" width="${w}" aria-hidden="true"><g fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round"><polyline points="128,286 356,99 584,286" stroke-width="54"/><polyline points="535,262 535,507 400,507" stroke-width="47" stroke-linecap="butt"/></g><polygon points="290,262 145,382 435,382" fill="${fill}" stroke="${fill}" stroke-width="18" stroke-linejoin="round"/><path d="M176,380 H406 V531 H206 Q176,531 176,501 Z" fill="${fill}"/><g fill="none" stroke="${heart}" stroke-width="13" stroke-linecap="round"><path d="M287,429 C300,406 343,403 343,441 C343,472 305,497 260,530"/><path d="M287,429 C274,406 231,403 231,441 C231,472 269,497 314,530"/></g></svg>`;

  /* ---------- LOGIN ---------- */
  function loginView(err) {
    const demo = API.mode === "demo";
    root.innerHTML = `<main class="login">
      <div class="login-art" aria-hidden="true"><div class="waves"></div></div>
      <form class="login-card" id="loginForm" novalidate>
        <div class="login-logo">${LOGO(64)}<div><b>ALUGUE POR AÍ</b><span>Painel de resultados</span></div></div>
        <h1>Entrar</h1>
        <label>E-mail<input type="email" name="email" autocomplete="username" required></label>
        <label>Senha<span class="pw"><input type="password" name="senha" autocomplete="current-password" required><button type="button" class="pw-t" aria-label="Mostrar senha">Mostrar</button></span></label>
        <p class="err" role="alert">${err ? U.esc(err) : ""}</p>
        <button class="btn primary block" type="submit">Entrar</button>
        ${demo ? `<div class="demo-note"><b>Modo demonstração</b><span>Admin: giovanna@demo · Cliente: cliente@demo<br>Senha: demonstracao</span><small>Conecte o Supabase para ativar o login real.</small></div>` : ""}
      </form></main>`;
    const f = U.$("#loginForm");
    U.$(".pw-t", f).addEventListener("click", (e) => { const i = f.elements.senha; const show = i.type === "password"; i.type = show ? "text" : "password"; e.target.textContent = show ? "Ocultar" : "Mostrar"; e.target.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha"); });
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); const b = U.$("button[type=submit]", f); b.disabled = true; b.textContent = "Entrando…";
      try {
        if (!f.elements.email.value || !f.elements.senha.value) throw new Error("Preencha e-mail e senha.");
        user = await API.signIn(f.elements.email.value, f.elements.senha.value);
        await Store.loadAll(); location.hash = home(); render();
      } catch (er) { U.$(".err", f).textContent = er.message; f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); b.disabled = false; b.textContent = "Entrar"; }
    });
  }
  const home = () => (user && user.role === "admin" ? "#/admin/" : "#/cliente/");

  /* ---------- LAYOUT ---------- */
  function shell(area, views, page) {
    const base = area === "admin" ? "#/admin/" : "#/cliente/";
    const nav = Object.entries(views).map(([k, v]) => `<a href="${base}${k}" class="${k === page ? "on" : ""}" ${k === page ? 'aria-current="page"' : ""}>${ic(v.icon)}<span>${v.title}</span></a>`).join("");
    return `<div class="shell ${area}">
      <aside class="side"><a class="brand" href="${base}">${LOGO(38)}<div><b>ALUGUE POR AÍ</b><small>${area === "admin" ? "Área da profissional" : "Seu painel"}</small></div></a>
        <nav class="side-nav">${nav}</nav>
        <div class="side-foot"><div class="who"><span class="avatar">${U.esc((user.nome || "?")[0])}</span><div><b>${U.esc(user.nome || "")}</b><small>${user.role === "admin" ? "Admin" : "Somente leitura"}</small></div></div><button class="icon-btn" id="logout" title="Sair" aria-label="Sair">${ic("out")}</button></div></aside>
      <header class="topbar"><a class="brand" href="${base}">${LOGO(30)}<b>ALUGUE POR AÍ</b></a><button class="icon-btn" id="logout2" aria-label="Sair">${ic("out")}</button></header>
      <main class="main" id="main"></main>
      <nav class="bottom-nav">${nav}</nav>
      ${API.mode === "demo" ? `<div class="demo-flag">Demonstração</div>` : ""}
    </div>`;
  }

  /* ---------- ROTEADOR + PROTEÇÃO ---------- */
  function parse() { const h = location.hash.replace(/^#\/?/, ""); const [area, page = ""] = h.split("/"); return { area, page }; }
  function denied() {
    U.$("#main").innerHTML = `<div class="card denied"><h1>Acesso restrito</h1><p class="muted">Esta área é exclusiva da administração. Você foi levado de volta ao seu painel.</p><a class="btn primary" href="#/cliente/">Ir para o meu painel</a></div>`;
  }
  async function render() {
    if (!user) user = await API.currentUser().catch(() => null);
    const { area, page } = parse();
    if (!user) { if (area !== "login") history.replaceState(null, "", "#/login"); return loginView(); }
    if (!Store.data.imoveis) await Store.loadAll();
    if (area === "login" || !area) { location.replace(home()); return; }
    if (area === "admin" && user.role !== "admin") {
      root.innerHTML = shell("cliente", window.CLIENT_VIEWS, ""); bindShell(); denied();
      setTimeout(() => { if (parse().area === "admin") location.replace("#/cliente/"); }, 2500); return;
    }
    if (area !== "admin" && area !== "cliente") { location.replace(home()); return; }
    const views = area === "admin" ? window.ADMIN_VIEWS : window.CLIENT_VIEWS;
    const v = views[page] || views[""];
    if (!U.$(".shell." + area) || true) { root.innerHTML = shell(area, views, page in views ? page : ""); bindShell(); }
    const main = U.$("#main");
    try { main.innerHTML = `<div class="page">${v.render(user)}</div>`; }
    catch (e) { console.error(e); main.innerHTML = `<div class="card">Não foi possível carregar esta página.</div>`; }
    document.title = `${v.title} · Painel Alugue por Aí`;
    if (area === "admin") window.ADMIN_BIND(main);
    v.bind && v.bind(main);
    U.$$("[data-view]", main).forEach((el) => el.addEventListener("click", () => window.APA.viewPub(el.dataset.view)));
    U.$$("[data-house]", main).forEach((el) => el.addEventListener("click", () => window.APA.viewHouse(el.dataset.house)));
    U.$$("[role=button][tabindex]", main).forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } }));
    animateNumbers(main);
  }
  function bindShell() {
    ["#logout", "#logout2"].forEach((s) => { const b = U.$(s); b && b.addEventListener("click", async () => { await API.signOut(); user = null; Store.data = {}; location.hash = "#/login"; toast("Até logo!"); render(); }); });
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  window.APP = { render: () => { const y = scrollY; render().then(() => window.scrollTo(0, y)); } };
  render();
})();
