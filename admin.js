/* =====================================================================
   ÁREA DA PROFISSIONAL (ADMIN) — criar, editar e excluir
   ===================================================================== */
(function () {
  "use strict";
  const { U, API, Store, Charts, toast, form, M } = window.APA;
  const n = U.num, esc = U.esc;

  /* ---------- esquemas de formulário ---------- */
  const imovelOpts = () => [["", "— Nenhum —"], ...Store.data.imoveis.map((i) => [i.id, i.nome])];
  const S = {
    periodos: () => [
      { title: "Período", fields: [{ k: "inicio", label: "Início", type: "date", req: true }, { k: "fim", label: "Fim", type: "date", req: true }] },
      { title: "Seguidores", fields: [{ k: "seguidores_inicio", label: "No início do período", type: "number" }, { k: "seguidores_fim", label: "No fim do período", type: "number" }, { k: "novos_seguidores", label: "Novos seguidores", type: "number", help: "Se ficar vazio, calculamos pela diferença." }] },
      { title: "Alcance e interações", fields: ["alcance", "impressoes", "contas_engajadas", "curtidas", "comentarios", "compartilhamentos", "salvamentos", "visitas_perfil", "cliques"].map((k) => ({ k, label: { alcance: "Alcance", impressoes: "Impressões", contas_engajadas: "Contas engajadas", curtidas: "Curtidas", comentarios: "Comentários", compartilhamentos: "Compartilhamentos", salvamentos: "Salvamentos", visitas_perfil: "Visitas ao perfil", cliques: "Cliques (link/botões)" }[k], type: "number" })).concat([{ k: "taxa_engajamento", label: "Taxa de engajamento (%)", type: "number", step: "0.01", help: "Opcional. Se vazio, calculamos: interações ÷ alcance." }]) },
      { fields: [{ k: "observacoes", label: "Observações", type: "textarea", full: true }] },
    ],
    semanas: () => [{ fields: [{ k: "numero", label: "Número da semana", type: "number" }, { k: "status", label: "Status", type: "select", opts: ["Planejamento", "Em andamento", "Concluída"] }, { k: "inicio", label: "Data inicial", type: "date", req: true }, { k: "fim", label: "Data final", type: "date", req: true }, { k: "observacoes", label: "Observações", type: "textarea", full: true }] }],
    publicacoes: () => [
      { title: "Conteúdo", fields: [{ k: "semana_id", label: "Semana", type: "select", opts: Store.data.semanas.slice().sort((a, b) => (a.inicio < b.inicio ? -1 : 1)).map((s) => [s.id, `Semana ${String(s.numero || "").padStart(2, "0")} · ${U.range(s.inicio, s.fim)}`]), req: true }, { k: "status", label: "Status", type: "select", opts: Object.keys(M.STATUS) }, { k: "data", label: "Data", type: "date" }, { k: "horario", label: "Horário", type: "time" }, { k: "tipo", label: "Tipo", type: "select", opts: M.TIPOS }, { k: "imovel_id", label: "Imóvel relacionado", type: "select", opts: imovelOpts() }, { k: "titulo", label: "Título", req: true, full: true }, { k: "tema", label: "Tema" }, { k: "link", label: "Link", type: "url", ph: "https://instagram.com/p/…" }, { k: "imagem", label: "Imagem / capa", type: "image", full: true }, { k: "legenda", label: "Legenda", type: "textarea", rows: 4, full: true }, { k: "observacoes", label: "Observações", type: "textarea", full: true }] },
      { title: "Resultados (depois de publicado)", fields: [["alcance", "Alcance"], ["impressoes", "Impressões"], ["curtidas", "Curtidas"], ["comentarios", "Comentários"], ["compartilhamentos", "Compartilhamentos"], ["salvamentos", "Salvamentos"], ["visitas_perfil", "Visitas ao perfil"], ["cliques", "Cliques"], ["novos_seguidores", "Novos seguidores gerados"]].map(([k, label]) => ({ k, label, type: "number" })).concat([{ k: "obs_resultados", label: "Observações sobre o resultado", type: "textarea", full: true }]) },
    ],
    campanhas: () => [
      { title: "Campanha", fields: [{ k: "nome", label: "Nome da campanha", req: true, full: true }, { k: "etapa", label: "Etapa do funil", type: "select", opts: ["Descoberta", "Consideração", "Reserva"] }, { k: "objetivo", label: "Objetivo", type: "select", opts: ["Alcance", "Visualizações", "Visitas ao site", "Cliques", "Conversas", "Remarketing", "Reservas"] }, { k: "inicio", label: "Início", type: "date", req: true }, { k: "fim", label: "Fim", type: "date" }, { k: "imovel_id", label: "Imóvel", type: "select", opts: imovelOpts() }, { k: "plataforma", label: "Plataforma", type: "select", opts: ["Meta", "Instagram", "Facebook"] }, { k: "investimento", label: "Investimento (R$)", type: "number", step: "0.01" }] },
      { title: "Resultados", sub: "CTR, CPC e CPM são calculados automaticamente.", fields: [["alcance", "Alcance"], ["impressoes", "Impressões"], ["cliques", "Cliques"], ["conversas", "Conversas iniciadas"], ["cliques_airbnb", "Cliques no Airbnb"], ["cliques_whatsapp", "Cliques no WhatsApp"], ["reservas", "Reservas (se souber)"]].map(([k, label]) => ({ k, label, type: "number" })).concat([{ k: "observacoes", label: "Observações", type: "textarea", full: true }]) },
    ],
    imoveis: () => [
      { title: "Imóvel", fields: [{ k: "nome", label: "Nome", req: true }, { k: "cidade", label: "Cidade" }, { k: "capacidade", label: "Capacidade", ph: "15 pessoas" }, { k: "status", label: "Status", type: "select", opts: ["Ativo", "Pausado"] }, { k: "descricao", label: "Descrição", type: "textarea", full: true }, { k: "foto", label: "Foto principal", type: "image", full: true }, { k: "galeria", label: "Galeria (um link de imagem por linha)", type: "textarea", full: true }, { k: "caracteristicas", label: "Características (uma por linha)", type: "textarea", rows: 4, full: true }] },
      { title: "Links", fields: [{ k: "airbnb", label: "Link do Airbnb", type: "url" }, { k: "site", label: "Link no site", type: "url" }, { k: "whatsapp", label: "WhatsApp", ph: "5511…" }] },
      { title: "Desempenho", fields: [["visualizacoes", "Visualizações"], ["cliques_site", "Cliques no site"], ["cliques_airbnb", "Cliques no Airbnb"], ["cliques_whatsapp", "Cliques no WhatsApp"], ["reservas", "Reservas"]].map(([k, label]) => ({ k, label, type: "number" })) },
    ],
    insights: () => [{ fields: [{ k: "titulo", label: "Título", req: true, full: true }, { k: "descricao", label: "Descrição", type: "textarea", rows: 4, full: true }, { k: "inicio", label: "Período — início", type: "date" }, { k: "fim", label: "Período — fim", type: "date" }, { k: "categoria", label: "Categoria", type: "select", opts: ["Conteúdo", "Instagram", "Tráfego", "Imóveis", "Estratégia"] }, { k: "destaque", label: "Destaque", type: "bool", hint: "Mostrar em destaque" }, { k: "publicado", label: "Visível para a cliente", type: "bool", hint: "Publicar para a cliente" }] }],
  };
  const TITLES = { periodos: "período do Instagram", semanas: "semana", publicacoes: "publicação", campanhas: "campanha", imoveis: "imóvel", insights: "insight" };
  const MSG = { semanas: "Semana", publicacoes: "Publicação", campanhas: "Campanha", imoveis: "Imóvel", insights: "Insight", periodos: "Dados" };

  function edit(t, row, defaults = {}) {
    const isNew = !row;
    form({
      title: (isNew ? "Novo " : "Editar ") + TITLES[t], groups: S[t](), values: row || defaults,
      onSave: async (v) => { if (isNew) await API.insert(t, v); else await API.update(t, row.id, v); await Store.loadAll(); toast(isNew ? `${MSG[t]} ${t === "semanas" || t === "publicacoes" || t === "campanhas" ? "criada" : "criado"}` : "Dados atualizados"); window.APP.render(); },
      onDelete: isNew ? null : async () => { await API.remove(t, row.id); await Store.loadAll(); toast("Item excluído"); window.APP.render(); },
    });
  }
  window.APA.edit = edit;

  /* ---------- peças visuais ---------- */
  const kpi = (label, value, delta, sub, icon) => `<div class="kpi card"><div class="kpi-top"><span>${label}</span>${icon || ""}</div><div class="kpi-v">${value}</div><div class="kpi-d">${delta !== undefined && delta !== null ? `<em class="${delta >= 0 ? "up" : "down"}">${U.sign(delta)}</em>` : ""}<small>${sub || "vs. 30 dias anteriores"}</small></div></div>`;
  const head = (t, s, actions = "") => `<header class="page-h"><div><h1>${t}</h1>${s ? `<p class="muted">${s}</p>` : ""}</div><div class="page-act">${actions}</div></header>`;
  const btnNew = (t, label) => `<button class="btn primary" data-new="${t}">+ ${label}</button>`;
  const imName = (id) => (Store.data.imoveis.find((i) => i.id === id) || {}).nome || "";
  const stBadge = (s) => `<span class="badge ${M.STATUS[s] || ""}">${esc(s || "")}</span>`;
  window.APA.ui = { kpi, head, stBadge, imName };

  function bindCommon(root) {
    U.$$("[data-new]", root).forEach((b) => b.addEventListener("click", () => edit(b.dataset.new, null, JSON.parse(b.dataset.def || "{}"))));
    U.$$("[data-edit]", root).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); const [t, id] = b.dataset.edit.split(":"); edit(t, Store.data[t].find((r) => r.id === id)); }));
  }

  /* ---------- VISÃO GERAL ---------- */
  function overview() {
    const D = Store.data, { a, b, fPrev } = M.compare(D.periodos);
    const cA = M.campMTD(D.campanhas, 0), cB = M.campMTD(D.campanhas, -1);
    const pubs = D.publicacoes, best = M.best(pubs), wk = M.currentWeek(D.semanas);
    const wkPubs = wk ? pubs.filter((p) => p.semana_id === wk.id) : [];
    const ps = M.window(D.periodos, 182);
    return head("Visão geral", "Tudo o que está acontecendo com a Alugue por Aí, em um lugar só.") + `
    <section class="kpis">
      ${kpi("Seguidores atuais", U.count(a.seguidores), U.pct(a.seguidores, fPrev))}
      ${kpi("Novos seguidores", "+" + U.count(a.novos), U.pct(a.novos, b.novos))}
      ${kpi("Alcance", U.count(a.alcance), U.pct(a.alcance, b.alcance))}
      ${kpi("Engajamento", U.count(a.eng, 1, "", "%"), U.pct(a.eng, b.eng))}
      ${kpi("Visitas ao perfil", U.count(a.visitas), U.pct(a.visitas, b.visitas))}
      ${kpi("Cliques", U.count(a.cliques), U.pct(a.cliques, b.cliques))}
      ${kpi("Investimento em tráfego", U.money(cA.investimento), null, "Este mês")}
      ${kpi("Cliques no Airbnb", U.count(cA.cliques_airbnb), U.pct(cA.cliques_airbnb, cB.cliques_airbnb), "vs. mesmo período do mês anterior")}
      ${kpi("Conversas no WhatsApp", U.count(cA.conversas), U.pct(cA.conversas, cB.conversas), "vs. mesmo período do mês anterior")}
    </section>
    <section class="grid-2">
      <div class="card"><h3>Evolução de seguidores</h3>${Charts.line(ps.map((p) => U.dShort(p.fim)), [{ name: "Seguidores", values: ps.map((p) => n(p.seguidores_fim)), color: "#2AA89A" }], { label: "Seguidores" })}</div>
      <div class="card"><h3>Alcance por semana</h3>${Charts.line(ps.map((p) => U.dShort(p.fim)), [{ name: "Alcance", values: ps.map((p) => n(p.alcance)), color: "#13786F" }], { label: "Alcance" })}</div>
    </section>
    <section class="grid-2">
      <div class="card"><h3>Semana atual</h3>${wk ? `<p class="muted">Semana ${String(wk.numero || "").padStart(2, "0")} · ${U.range(wk.inicio, wk.fim)}</p><ul class="mini-list">${wkPubs.sort((x, y) => (x.data < y.data ? -1 : 1)).map((p) => `<li><span>${U.weekday(p.data)} ${U.dShort(p.data)} · <b>${esc(p.titulo)}</b> <small>${esc(p.tipo)}</small></span>${stBadge(p.status)}</li>`).join("") || "<li class='muted'>Nenhuma publicação ainda.</li>"}</ul><a class="link" href="#/admin/conteudo">Abrir planejamento →</a>` : `<p class="muted">Crie a primeira semana em Conteúdo.</p>`}</div>
      <div class="card">${best ? `<h3>Melhor conteúdo recente</h3><div class="best">${best.imagem ? `<img src="${esc(best.imagem)}" alt="">` : ""}<div><b>${esc(best.titulo)}</b><p class="muted">${esc(best.tipo)} · ${U.dShort(best.data)}</p><p>${U.fmt(best.alcance)} de alcance · ${U.fmt(n(best.compartilhamentos) + n(best.salvamentos))} compartilhamentos e salvamentos</p></div></div>` : "<h3>Melhor conteúdo</h3><p class='muted'>Cadastre resultados das publicações.</p>"}</div>
    </section>
    ${funnel(D.campanhas, M.mtd(0))}`;
  }

  function funnel(cs, win, title) {
    win = win || M.mtd(0);
    return `<section class="card"><h3>Funil de tráfego · ${U.esc(title || "este mês")}</h3><div class="funnel">${M.ETAPAS.map((e, i) => {
      const g = M.campWindow(cs.filter((c) => c.etapa === e.id), win[0], win[1]);
      const main = i === 0 ? [U.fmt(g.alcance), "pessoas alcançadas"] : i === 1 ? [U.fmt(g.cliques), "cliques para o site"] : [U.fmt(g.cliques_airbnb + g.conversas), "cliques no Airbnb + conversas"];
      return `<div class="stage" style="--c:${e.cor};--i:${i}"><div class="stage-n">${i + 1}</div><div><b>${e.id}</b><small>${e.desc}</small></div><div class="stage-v"><strong>${main[0]}</strong><small>${main[1]}</small></div><div class="stage-inv">${U.money(g.investimento)}</div></div>`;
    }).join("")}</div></section>`;
  }
  window.APA.funnel = funnel;

  /* ---------- SOCIAL MEDIA ---------- */
  let range = { days: 90, from: "", to: "" };
  function social() {
    const ps = M.window(Store.data.periodos, range.days, range.from, range.to), g = M.agg(ps);
    const lab = ps.map((p) => U.dShort(p.fim));
    const chips = [[7, "7 dias"], [30, "30 dias"], [90, "3 meses"], [182, "6 meses"], [0, "Personalizado"]].map(([d, l]) => `<button class="chip ${range.days === d && (d || range.from || range.to) ? "on" : ""} ${d === 0 && (range.from || range.to) ? "on" : ""}" data-range="${d}">${l}</button>`).join("");
    const rows = M.sortP(Store.data.periodos).reverse();
    return head("Social Media", "Dados do Instagram cadastrados por período.", btnNew("periodos", "Adicionar período")) + `
    <div class="chips">${chips}<span class="custom ${range.days === 0 ? "show" : ""}"><input type="date" id="rf" value="${range.from}"><span>até</span><input type="date" id="rt" value="${range.to}"><button class="btn sm" id="rApply">Aplicar</button></span></div>
    ${ps.length ? `<section class="kpis small">
      ${kpi("Seguidores", U.count(g.seguidores), null, "no fim do período")}${kpi("Novos seguidores", "+" + U.count(g.novos), null, "no período")}${kpi("Alcance", U.count(g.alcance), null, "soma")}${kpi("Engajamento médio", U.count(g.eng, 1, "", "%"), null, "média")}${kpi("Visitas ao perfil", U.count(g.visitas), null, "soma")}${kpi("Cliques", U.count(g.cliques), null, "soma")}
    </section>
    <section class="grid-2">
      <div class="card"><h3>Evolução de seguidores</h3>${Charts.line(lab, [{ name: "Seguidores", values: ps.map((p) => n(p.seguidores_fim)), color: "#2AA89A" }])}</div>
      <div class="card"><h3>Alcance</h3>${Charts.line(lab, [{ name: "Alcance", values: ps.map((p) => n(p.alcance)), color: "#13786F" }, { name: "Visitas ao perfil", values: ps.map((p) => n(p.visitas_perfil)), color: "#85DAA3" }])}</div>
      <div class="card"><h3>Taxa de engajamento</h3>${Charts.line(lab, [{ name: "Engajamento", values: ps.map(M.engRate), color: "#2AA89A" }], { pct: true })}</div>
      <div class="card"><h3>Interações no período</h3>${Charts.bars([{ label: "Curtidas", value: M.sum(ps, "curtidas") }, { label: "Salvamentos", value: M.sum(ps, "salvamentos"), color: "var(--mata)" }, { label: "Compartilhamentos", value: M.sum(ps, "compartilhamentos"), color: "var(--menta)" }, { label: "Comentários", value: M.sum(ps, "comentarios"), color: "var(--areia-d)" }])}</div>
    </section>` : `<div class="card empty">Nenhum dado nesse período.</div>`}
    <section class="card"><h3>Períodos cadastrados</h3><div class="rows">${rows.map((p) => `<button class="row" data-edit="periodos:${p.id}"><span><b>${U.range(p.inicio, p.fim)}</b><small>${U.fmt(p.seguidores_fim)} seguidores · +${U.fmt(M.newF(p))}</small></span><span class="row-m"><small>Alcance</small>${U.fmt(p.alcance)}</span><span class="row-m"><small>Engaj.</small>${U.fmt(M.engRate(p), 1)}%</span><span class="row-go">Editar</span></button>`).join("") || "<p class='muted'>Nenhum período ainda.</p>"}</div></section>`;
  }
  function bindSocial(root) {
    U.$$("[data-range]", root).forEach((b) => b.addEventListener("click", () => { range = { days: +b.dataset.range, from: "", to: "" }; window.APP.render(); }));
    const ap = U.$("#rApply", root); ap && ap.addEventListener("click", () => { range = { days: 0, from: U.$("#rf").value, to: U.$("#rt").value }; window.APP.render(); });
  }

  /* ---------- CONTEÚDO (semanas) ---------- */
  let openWeek = null;
  function conteudo() {
    const sems = Store.data.semanas.slice().sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
    const cur = M.currentWeek(Store.data.semanas);
    if (!openWeek && cur) openWeek = cur.id;
    const last = sems[0]; const nextIni = last ? U.iso(U.addDays(U.d(last.fim), 1)) : U.iso(U.addDays(U.today(), -((U.today().getDay() + 6) % 7)));
    const def = { numero: (Math.max(0, ...sems.map((s) => n(s.numero))) || 0) + 1, inicio: nextIni, fim: U.iso(U.addDays(U.d(nextIni), 6)), status: "Planejamento" };
    return head("Conteúdo", "Planejamento por semanas independentes. Datas podem mudar sem bagunçar o resto.", `<button class="btn primary" data-new="semanas" data-def='${JSON.stringify(def)}'>+ Nova semana</button>`) +
      `<div class="weeks">${sems.map((w) => weekCard(w, cur)).join("") || "<div class='card empty'>Crie a primeira semana.</div>"}</div>`;
  }
  function weekCard(w, cur) {
    const pubs = Store.data.publicacoes.filter((p) => p.semana_id === w.id).sort((a, b) => ((a.data || "") + (a.horario || "") < (b.data || "") + (b.horario || "") ? -1 : 1));
    const open = openWeek === w.id;
    const counts = Object.keys(M.STATUS).map((s) => [s, pubs.filter((p) => p.status === s).length]).filter((x) => x[1]);
    return `<article class="week card ${open ? "open" : ""} ${cur && cur.id === w.id ? "current" : ""}">
      <header class="week-h" data-toggle="${w.id}"><div><span class="eyebrow">Semana ${String(w.numero || "").padStart(2, "0")}${cur && cur.id === w.id ? " · atual" : ""}</span><h3>${U.range(w.inicio, w.fim)}</h3></div>
      <div class="week-meta">${counts.map(([s, c]) => `<span class="dot ${M.STATUS[s]}" title="${s}">${c}</span>`).join("")}<span class="muted">${pubs.length} conteúdo${pubs.length === 1 ? "" : "s"}</span><svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div></header>
      ${open ? `<div class="week-body"><div class="pubs">${pubs.map((p) => pubCard(p, true)).join("")}
        <button class="pub add" data-new="publicacoes" data-def='${JSON.stringify({ semana_id: w.id, data: w.inicio, status: "Em produção", tipo: "Reels" })}'><span>+</span>Adicionar publicação</button></div>
        <div class="week-foot"><span class="badge">${esc(w.status || "")}</span><button class="btn ghost sm" data-edit="semanas:${w.id}">Editar semana</button></div></div>` : ""}
    </article>`;
  }
  function pubCard(p, admin) {
    const vs = M.vsType(p, Store.data.publicacoes);
    return `<button class="pub" ${admin ? `data-edit="publicacoes:${p.id}"` : `data-view="${p.id}"`}>
      <div class="pub-img" style="${p.imagem ? `background-image:url('${esc(p.imagem)}')` : ""}"><span class="tipo">${esc(p.tipo || "")}</span></div>
      <div class="pub-b"><small>${U.weekday(p.data)} ${U.dShort(p.data)}${p.horario ? " · " + esc(p.horario) : ""}</small><b>${esc(p.titulo)}</b>
      ${imName(p.imovel_id) ? `<small class="muted">${esc(imName(p.imovel_id))}</small>` : ""}${stBadge(p.status)}
      ${M.hasResults(p) ? `<div class="pub-r"><span>${U.ic("olho")}${U.fmt(p.alcance)}</span><span>${U.ic("coracao")}${U.fmt(p.curtidas)}</span>${vs !== null ? `<em class="${vs >= 0 ? "up" : "down"}">${U.sign(vs, 0)} vs. ${esc(p.tipo)}</em>` : ""}</div>` : ""}</div></button>`;
  }
  window.APA.pubCard = pubCard;
  function bindConteudo(root) { U.$$("[data-toggle]", root).forEach((h) => h.addEventListener("click", () => { openWeek = openWeek === h.dataset.toggle ? null : h.dataset.toggle; window.APP.render(); })); }

  /* ---------- TRÁFEGO ---------- */
  function trafego() {
    const cs = Store.data.campanhas.slice().sort((a, b) => ((a.inicio || "") < (b.inicio || "") ? 1 : -1));
    const all = M.campAgg(cs), mA = M.campMTD(cs, 0);
    const months = [-5, -4, -3, -2, -1, 0].map((o) => { const [a, b] = o === 0 ? M.mtd(0) : M.monthBounds(o); return { l: U.MESES_L[U.d(a).getMonth()].slice(0, 3), g: M.campWindow(cs, a, b) }; });
    return head("Tráfego Pago", "Campanhas organizadas nas três etapas da estratégia.", btnNew("campanhas", "Nova campanha")) + `
    <section class="kpis small">${kpi("Investido este mês", U.money(mA.investimento), null, "campanhas ativas no mês")}${kpi("Alcance", U.count(mA.alcance), null, "este mês")}${kpi("Cliques", U.count(mA.cliques), null, "este mês")}${kpi("CTR", U.fmt(mA.ctr, 2) + "%", null, "cliques ÷ impressões")}${kpi("CPC", U.money(mA.cpc), null, "custo por clique")}${kpi("CPM", U.money(mA.cpm), null, "custo por mil impressões")}</section>
    ${funnel(cs)}
    <section class="grid-2">
      <div class="card"><h3>Investimento x cliques por mês</h3>${Charts.line(months.map((m) => m.l), [{ name: "Cliques", values: months.map((m) => m.g.cliques), color: "#2AA89A" }, { name: "Conversas + Airbnb", values: months.map((m) => m.g.conversas + m.g.cliques_airbnb), color: "#13786F" }], { zero: true })}</div>
      <div class="card"><h3>Resultado acumulado</h3>${Charts.bars([{ label: "Cliques no Airbnb", value: all.cliques_airbnb }, { label: "Conversas iniciadas", value: all.conversas, color: "var(--mata)" }, { label: "Cliques no WhatsApp", value: all.cliques_whatsapp, color: "var(--menta)" }, { label: "Reservas informadas", value: all.reservas, color: "var(--areia-d)" }])}</div>
    </section>
    <section class="card"><h3>Campanhas</h3><div class="rows">${cs.map((c) => { const k = M.camp(c); return `<button class="row" data-edit="campanhas:${c.id}"><span><b>${esc(c.nome)}</b><small>${esc(c.etapa || "")} · ${esc(c.objetivo || "")} · ${U.dShort(c.inicio)}${c.fim ? " a " + U.dShort(c.fim) : ""}${imName(c.imovel_id) ? " · " + esc(imName(c.imovel_id)) : ""}</small></span><span class="row-m"><small>Invest.</small>${U.money(c.investimento)}</span><span class="row-m"><small>Cliques</small>${U.fmt(c.cliques)}</span><span class="row-m"><small>CTR</small>${U.fmt(k.ctr, 2)}%</span><span class="row-m"><small>CPC</small>${U.money(k.cpc)}</span><span class="row-go">Editar</span></button>`; }).join("") || "<p class='muted'>Nenhuma campanha ainda.</p>"}</div></section>`;
  }

  /* ---------- IMÓVEIS ---------- */
  function imoveis() {
    const ims = Store.data.imoveis.slice().sort((a, b) => M.interest(b) - M.interest(a));
    return head("Imóveis", "Ordenados pelo interesse que estão despertando.", btnNew("imoveis", "Novo imóvel")) +
      `<section class="card"><h3>Quais casas despertam mais interesse</h3>${Charts.bars(ims.map((i) => ({ label: i.nome, value: n(i.cliques_airbnb) + n(i.cliques_whatsapp) })))}<p class="muted small">Cliques no Airbnb + cliques no WhatsApp.</p></section>
      <div class="houses">${ims.map((i) => houseCard(i, true)).join("")}</div>`;
  }
  function houseCard(i, admin) {
    const pubs = Store.data.publicacoes.filter((p) => p.imovel_id === i.id), cs = Store.data.campanhas.filter((c) => c.imovel_id === i.id);
    return `<article class="house card">
      <div class="house-img" style="${i.foto ? `background-image:url('${esc(i.foto)}')` : ""}">${i.status !== "Ativo" ? `<span class="badge st-pause">${esc(i.status)}</span>` : ""}</div>
      <div class="house-b"><small class="muted">${esc(i.cidade || "")}${i.capacidade ? " · " + esc(i.capacidade) : ""}</small><h3>${esc(i.nome)}</h3>
      <div class="stats"><span><b>${U.fmt(i.visualizacoes)}</b><small>visualizações</small></span><span><b>${U.fmt(i.cliques_site)}</b><small>cliques no site</small></span><span><b>${U.fmt(i.cliques_airbnb)}</b><small>no Airbnb</small></span><span><b>${U.fmt(i.cliques_whatsapp)}</b><small>no WhatsApp</small></span>${n(i.reservas) ? `<span><b>${U.fmt(i.reservas)}</b><small>reservas</small></span>` : ""}</div>
      <p class="muted small">${pubs.length} publicaç${pubs.length === 1 ? "ão" : "ões"} · ${cs.length} campanha${cs.length === 1 ? "" : "s"}</p>
      <div class="house-act">${admin ? `<button class="btn ghost sm" data-edit="imoveis:${i.id}">Editar</button>` : `<button class="btn ghost sm" data-house="${i.id}">Ver detalhes</button>`}${i.airbnb ? `<a class="btn sm" href="${esc(i.airbnb)}" target="_blank" rel="noopener">Airbnb ↗</a>` : ""}</div></div></article>`;
  }
  window.APA.houseCard = houseCard;

  /* ---------- INSIGHTS ---------- */
  function insights() {
    const list = Store.data.insights.slice().sort((a, b) => ((b.fim || "") > (a.fim || "") ? 1 : -1));
    return head("Insights", "Análises estratégicas. Só aparecem para a cliente os marcados como publicados.", btnNew("insights", "Novo insight")) +
      `<div class="insights">${list.map((i) => insightCard(i, true)).join("") || "<div class='card empty'>Nenhum insight ainda.</div>"}</div>`;
  }
  function insightCard(i, admin) {
    return `<article class="insight card ${i.destaque ? "hl" : ""}" ${admin ? `data-edit="insights:${i.id}" role="button" tabindex="0"` : ""}>
      <div class="ins-top"><span class="badge cat">${esc(i.categoria || "")}</span>${i.destaque ? `<span class="star">${U.ic("estrela")}Destaque</span>` : ""}${admin && !i.publicado ? `<span class="badge st-pause">Rascunho</span>` : ""}</div>
      <h3>${esc(i.titulo)}</h3><p>${esc(i.descricao || "")}</p>${i.inicio ? `<small class="muted">${U.range(i.inicio, i.fim || i.inicio)}</small>` : ""}</article>`;
  }
  window.APA.insightCard = insightCard;

  /* ---------- CONFIGURAÇÕES ---------- */
  function config() {
    const demo = API.mode === "demo";
    return head("Configurações", "") + `
    <section class="card"><h3>Conexão</h3>${demo ? `<p><span class="badge st-wait">Modo demonstração</span></p><p class="muted">Os dados ficam salvos só neste navegador. Para usar com a cliente, conecte o Supabase seguindo o LEIA-ME do projeto: login real, dados na nuvem e permissões aplicadas no banco.</p>` : `<p><span class="badge st-pub">Conectado ao Supabase</span></p><p class="muted">Login real e permissões aplicadas pelo banco de dados.</p>`}</section>
    <section class="card"><h3>Usuários</h3><p class="muted">${demo ? "Na demonstração existem dois usuários: giovanna@demo (admin) e cliente@demo (somente leitura)." : "Crie e remova usuários no painel do Supabase em Authentication → Users. Todo usuário novo entra como cliente (somente leitura). Para tornar alguém admin, use o comando SQL do LEIA-ME."}</p></section>
    <section class="card"><h3>Backup</h3><p class="muted">Baixe uma cópia de todos os dados em JSON.</p><button class="btn ghost" id="exp">Baixar backup</button></section>
    ${demo ? `<section class="card"><h3>Dados de demonstração</h3><p class="muted">Volta todos os dados para o exemplo inicial.</p><button class="btn danger ghost" id="rst">Restaurar dados de exemplo</button></section>` : ""}`;
  }
  function bindConfig(root) {
    const e = U.$("#exp", root); e && e.addEventListener("click", () => { const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "painel-alugue-por-ai-backup.json"; a.click(); toast("Backup gerado"); });
    const r = U.$("#rst", root); r && r.addEventListener("click", () => window.APA.confirmBox("Restaurar dados de exemplo?", "Tudo o que foi cadastrado na demonstração será substituído.", async () => { await API.reset(); await Store.loadAll(); toast("Dados restaurados"); window.APP.render(); }));
  }

  window.ADMIN_VIEWS = {
    "": { title: "Visão geral", icon: "home", render: overview },
    social: { title: "Social Media", icon: "phone", render: social, bind: bindSocial },
    conteudo: { title: "Conteúdo", icon: "cal", render: conteudo, bind: bindConteudo },
    trafego: { title: "Tráfego Pago", icon: "rocket", render: trafego },
    imoveis: { title: "Imóveis", icon: "house", render: imoveis },
    insights: { title: "Insights", icon: "bulb", render: insights },
    config: { title: "Configurações", icon: "gear", render: config, bind: bindConfig },
  };
  window.ADMIN_BIND = bindCommon;
})();
