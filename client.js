/* =====================================================================
   ÁREA DA CLIENTE — somente leitura, linguagem simples
   Filtro de datas: Últimos 30 dias · 6 meses · Dia · Semana · Mês · Escolher dias
   ===================================================================== */
(function () {
  "use strict";
  const { U, Store, Charts, M, modal } = window.APA;
  const n = U.num, esc = U.esc;
  const ui = () => window.APA.ui;
  const pad = (x) => String(x).padStart(2, "0");
  const li = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // data local, sem fuso
  const TODAY = () => li(U.today());
  const nDays = (a, b) => Math.round((U.d(b) - U.d(a)) / 864e5) + 1;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const WD_L = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const phrase = (p, up, down, same) => (p === null ? "" : Math.abs(p) < 1 ? same : p > 0 ? up.replace("{p}", U.fmt(Math.abs(p), 0)) : down.replace("{p}", U.fmt(Math.abs(p), 0)));

  /* ---------- Instagram dentro de uma janela de datas ----------
     Os períodos do Instagram são semanais. Quando a janela pega só parte
     de uma semana, entra a parte proporcional aos dias. */
  function pWin(ps, a, b) {
    const keys = ["alcance", "impressoes", "contas_engajadas", "curtidas", "comentarios", "compartilhamentos", "salvamentos", "visitas_perfil", "cliques"];
    const o = Object.fromEntries(keys.map((k) => [k, 0]));
    const list = M.sortP(ps).filter((p) => p.inicio && p.fim && p.inicio <= b && p.fim >= a);
    let novos = 0, parcial = false; const engs = [];
    list.forEach((p) => {
      const ini = p.inicio > a ? p.inicio : a, fim = p.fim < b ? p.fim : b;
      const f = nDays(ini, fim) / Math.max(1, nDays(p.inicio, p.fim));
      if (f < 0.999) parcial = true;
      keys.forEach((k) => (o[k] += n(p[k]) * f));
      novos += M.newF(p) * f;
      const e = M.engRate(p); if (e) engs.push(e);
    });
    keys.forEach((k) => (o[k] = Math.round(o[k])));
    let seguidores = 0;
    if (list.length) {
      const L = list[list.length - 1], end = L.fim < b ? L.fim : b;
      seguidores = Math.round(n(L.seguidores_inicio) + M.newF(L) * (nDays(L.inicio, end) / Math.max(1, nDays(L.inicio, L.fim))));
    }
    return Object.assign(o, {
      novos: Math.round(novos), seguidores, parcial, list, count: list.length,
      interacoes: o.curtidas + o.comentarios + o.compartilhamentos + o.salvamentos,
      eng: engs.length ? engs.reduce((x, y) => x + y, 0) / engs.length : 0,
    });
  }

  /* ---------- FILTRO DE DATAS ---------- */
  const F = (() => {
    let st = { mode: "30", a: "", b: "" };
    try { const s = JSON.parse(sessionStorage.getItem("apa-filtro") || "null"); if (s && s.mode) st = s; } catch (e) {}
    let open = false, pm = null, view = null, pick = null;
    const save = () => { try { sessionStorage.setItem("apa-filtro", JSON.stringify(st)); } catch (e) {} };
    const PRESETS = { "30": 30, "182": 182 };
    const MODES = [["30", "30 dias"], ["182", "6 meses"], ["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["dias", "Escolher dias"]];

    function win() {
      const t = U.today();
      if (PRESETS[st.mode]) return [li(U.addDays(t, -(PRESETS[st.mode] - 1))), li(t)];
      const b = st.b > TODAY() ? TODAY() : st.b;
      return [st.a, b];
    }
    function prev() {
      const [a, b] = win();
      if (st.mode === "mes") {
        const da = U.d(a), db = U.d(b);
        const pa = new Date(da.getFullYear(), da.getMonth() - 1, 1);
        const last = new Date(da.getFullYear(), da.getMonth(), 0).getDate();
        return [li(pa), li(new Date(pa.getFullYear(), pa.getMonth(), Math.min(db.getDate(), last)))];
      }
      const len = nDays(a, b);
      return [li(U.addDays(U.d(a), -len)), li(U.addDays(U.d(a), -1))];
    }
    const yr = (s) => { const y = U.d(s).getFullYear(); return y !== U.today().getFullYear() ? ` de ${y}` : ""; };
    const dia = (s) => { const d = U.d(s); return `${d.getDate()} de ${U.MESES_L[d.getMonth()]}`; };
    const monthEnd = (s) => { const d = U.d(s); return li(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
    function label() {
      const [a, b] = win();
      if (st.mode === "30") return "Últimos 30 dias";
      if (st.mode === "182") return "Últimos 6 meses";
      if (st.mode === "mes") { const d = U.d(a); return `${cap(U.MESES_L[d.getMonth()])} de ${d.getFullYear()}${b < monthEnd(a) ? ` · até dia ${U.d(b).getDate()}` : ""}`; }
      if (a === b) return `${cap(WD_L[U.d(a).getDay()])}, ${dia(a)}${yr(a)}`;
      return `${U.range(a, b)}${yr(b)}`;
    }
    function prevWord() {
      const [a, b] = win();
      if (st.mode === "30") return "aos 30 dias anteriores";
      if (st.mode === "182") return "aos 6 meses anteriores";
      if (st.mode === "dia") return "ao dia anterior";
      if (st.mode === "semana" && nDays(a, b) === 7) return "à semana anterior";
      if (st.mode === "mes") return b < monthEnd(a) ? "ao mesmo período do mês anterior" : "ao mês anterior";
      const k = nDays(a, b); return k === 1 ? "ao dia anterior" : `aos ${k} dias anteriores`;
    }
    function shortLabels() {
      const [pa, pb] = prev();
      if (st.mode === "mes") return ["Selecionado", cap(U.MESES_L[U.d(pa).getMonth()])];
      if (st.mode === "dia") return ["Dia escolhido", "Dia anterior"];
      if (st.mode === "semana") return ["Semana escolhida", "Semana anterior"];
      return ["Selecionado", "Anterior"];
    }

    /* calendário */
    const pubDays = () => new Set((Store.data.publicacoes || []).filter((p) => p.status === "Publicado").map((p) => p.data));
    function grid() {
      const [a, b] = st.mode === pm ? win() : ["", ""];
      const first = new Date(view.y, view.m, 1), lastDay = new Date(view.y, view.m + 1, 0);
      let d = U.addDays(first, -first.getDay()); const rows = []; const pd = pubDays(); const t = TODAY();
      while (d <= lastDay) {
        const cells = [];
        for (let i = 0; i < 7; i++) {
          const s = li(d), fut = s > t, out = d.getMonth() !== view.m;
          const inSel = a && s >= a && s <= (st.b || b), edge = s === a || s === (st.b || b);
          const cls = ["cal-d", out ? "out" : "", fut ? "fut" : "", inSel ? "sel" : "", edge ? "edge" : "", pick === s ? "pick" : "", s === t ? "hoje" : ""].join(" ");
          cells.push(`<button type="button" class="${cls}" data-day="${s}" ${fut ? "disabled" : ""} aria-label="${dia(s)}">${d.getDate()}${pd.has(s) ? "<i></i>" : ""}</button>`);
          d = U.addDays(d, 1);
        }
        rows.push(`<div class="cal-w">${cells.join("")}</div>`);
      }
      const canNext = li(new Date(view.y, view.m + 1, 1)) <= TODAY();
      const hint = pm === "dia" ? "Toque no dia que quer ver." : pm === "semana" ? "Toque em qualquer dia para ver a semana inteira (domingo a sábado)." : pick ? "Agora toque no último dia." : "Toque no primeiro dia e depois no último.";
      return `<div class="cal ${pm === "semana" ? "wk" : ""}">
        <div class="cal-h"><button type="button" class="cal-nav" data-nav="-1" aria-label="Mês anterior">‹</button><b>${cap(U.MESES_L[view.m])} de ${view.y}</b><button type="button" class="cal-nav" data-nav="1" aria-label="Próximo mês" ${canNext ? "" : "disabled"}>›</button></div>
        <div class="cal-wd">${["D", "S", "T", "Q", "Q", "S", "S"].map((x) => `<span>${x}</span>`).join("")}</div>
        ${rows.join("")}
        <p class="cal-hint">${hint}</p></div>`;
    }
    function months() {
      const t = U.today(); const [a] = st.mode === "mes" ? win() : [""];
      return `<div class="cal">
        <div class="cal-h"><button type="button" class="cal-nav" data-nav="-12" aria-label="Ano anterior">‹</button><b>${view.y}</b><button type="button" class="cal-nav" data-nav="12" aria-label="Próximo ano" ${view.y < t.getFullYear() ? "" : "disabled"}>›</button></div>
        <div class="cal-m">${U.MESES_L.map((m, i) => { const s = li(new Date(view.y, i, 1)); const fut = s > TODAY(); return `<button type="button" class="cal-mo ${a === s ? "sel" : ""}" data-month="${s}" ${fut ? "disabled" : ""}>${cap(m.slice(0, 3))}</button>`; }).join("")}</div>
        <p class="cal-hint">Toque no mês que quer ver.</p></div>`;
    }
    function inner() {
      const cur = open ? pm : st.mode;
      return `<div class="chips cf-chips">${MODES.map(([k, l]) => `<button type="button" class="chip ${cur === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("")}</div>
        <p class="cf-now">${U.ic("calendario")}<span>Mostrando: <b>${esc(label())}</b></span></p>
        ${open ? `<div class="cf-panel">${pm === "mes" ? months() : grid()}<button type="button" class="link cf-x" data-close>Fechar</button></div>` : ""}`;
    }
    const html = () => `<section class="card cf" id="cf">${inner()}</section>`;
    function apply(mode, a, b) { st = { mode, a, b }; open = false; pick = null; save(); window.APP.render(); }
    function bind(root) {
      const el = U.$("#cf", root); if (!el) return;
      const refresh = () => { el.innerHTML = inner(); };
      el.addEventListener("click", (e) => {
        const t = e.target.closest("button"); if (!t || t.disabled) return;
        if (t.dataset.mode) {
          const m = t.dataset.mode;
          if (PRESETS[m]) return apply(m, "", "");
          pm = m; open = true; pick = null;
          const ref = U.d(st.a && !PRESETS[st.mode] ? st.a : TODAY());
          view = { y: ref.getFullYear(), m: ref.getMonth() };
          return refresh();
        }
        if (t.dataset.nav) {
          const k = +t.dataset.nav;
          if (Math.abs(k) === 12) view.y += k / 12;
          else { const d = new Date(view.y, view.m + k, 1); view = { y: d.getFullYear(), m: d.getMonth() }; }
          return refresh();
        }
        if (t.hasAttribute("data-close")) { open = false; pick = null; return refresh(); }
        if (t.dataset.month) return apply("mes", t.dataset.month, monthEnd(t.dataset.month));
        if (t.dataset.day) {
          const s = t.dataset.day;
          if (pm === "dia") return apply("dia", s, s);
          if (pm === "semana") { const d = U.d(s); const a = li(U.addDays(d, -d.getDay())); return apply("semana", a, li(U.addDays(U.d(a), 6))); }
          if (!pick) { pick = s; return refresh(); }
          const [a, b] = pick <= s ? [pick, s] : [s, pick]; return apply("dias", a, b);
        }
      });
    }
    return { win, prev, label, prevWord, shortLabels, html, bind, mode: () => st.mode, isPreset: () => !!PRESETS[st.mode] };
  })();
  window.APA.clientFilter = F;

  const partialNote = (A) => (A.parcial ? `<p class="muted small cf-note">Os dados do Instagram são registrados por semana. Quando o período escolhido pega só parte de uma semana, entra a parte proporcional aos dias.</p>` : "");
  const noData = `<p class="say">Ainda não há dados do Instagram para esse período. Escolha outra data no filtro acima.</p>`;

  function achievements(A, pubs, cA) {
    const best = M.best(pubs), bt = M.bestType(pubs);
    const house = Store.data.imoveis.slice().sort((x, y) => M.interest(y) - M.interest(x))[0];
    const camp = cA.list.slice().sort((x, y) => n(y.cliques_airbnb) + n(y.conversas) - (n(x.cliques_airbnb) + n(x.conversas)))[0];
    const out = [];
    if (best) out.push(["trofeu", "Melhor conteúdo", best.titulo]);
    if (A.novos >= 100) out.push(["brilho", "Mais de 100 novos seguidores", `+${U.fmt(A.novos)} no período`]);
    else if (A.novos > 0) out.push(["folha", "Seu perfil está crescendo", `+${U.fmt(A.novos)} seguidores no período`]);
    if (bt && bt[2] >= 2) out.push(["chama", `${bt[0]} em alta`, `O formato que mais alcançou pessoas`]);
    if (house) out.push(["casa", "Casa mais procurada", house.nome]);
    if (camp && n(camp.cliques_airbnb) + n(camp.conversas) > 0) out.push(["foguete", "Melhor campanha", camp.nome]);
    if (!out.length) return "";
    return `<section class="achv">${out.map(([e, t, s], i) => `<div class="ach card" style="--i:${i}"><span class="ach-e">${U.ic(e)}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div></div>`).join("")}</section>`;
  }

  /* ---------- INÍCIO ---------- */
  function inicio(user) {
    const D = Store.data, [wa, wb] = F.win(), [pa, pb] = F.prev();
    const A = pWin(D.periodos, wa, wb), B = pWin(D.periodos, pa, pb);
    const pubs = D.publicacoes.filter((p) => p.data && p.data >= wa && p.data <= wb), best = M.best(pubs);
    const wk = M.currentWeek(D.semanas), wkPubs = wk ? D.publicacoes.filter((p) => p.semana_id === wk.id).sort((x, y) => (x.data < y.data ? -1 : 1)) : [];
    const cA = M.campWindow(D.campanhas, wa, wb);
    const ok = A.count && B.count;
    const pAlc = ok ? U.pct(A.alcance, B.alcance) : null, pEng = ok ? U.pct(A.eng, B.eng) : null, pSeg = ok ? U.pct(A.seguidores, B.seguidores) : null;
    return `<header class="hello"><h1>Olá, ${esc(user.nome || "Alugue por Aí")}!</h1><p>${U.ic("onda", "hello-ic")}Veja como sua marca está crescendo.</p></header>
    ${F.html()}
    <section class="card hero-card"><span class="eyebrow">${esc(F.label())}</span>
      ${A.count ? `<div class="hero-grid">
        <div><strong class="big">+${U.count(A.novos)}</strong><span>novos seguidores</span></div>
        <div><strong class="big">${U.count(A.alcance)}</strong><span>pessoas alcançadas</span></div>
        <div><strong class="big ${pAlc !== null && pAlc <= -0.5 ? "neg" : ""}">${U.sign(pAlc, 0)}</strong><span>de alcance</span></div>
        <div><strong class="big ${pEng !== null && pEng <= -0.5 ? "neg" : ""}">${U.sign(pEng, 0)}</strong><span>de engajamento</span></div>
      </div>
      <p class="say">${phrase(pAlc, `Seu alcance aumentou {p}% em relação ${F.prevWord()}. Estamos chegando a mais pessoas!`, `Seu alcance ficou {p}% menor em relação ${F.prevWord()}.`, "Seu alcance se manteve estável.")} No fim do período eram <b>${U.fmt(A.seguidores)}</b> seguidores${pSeg !== null ? ` (${U.sign(pSeg)})` : ""}.</p>${partialNote(A)}` : noData}</section>
    ${achievements(A, pubs, cA)}
    <section class="grid-2">
      ${best ? `<div class="card spot" data-view="${best.id}" role="button" tabindex="0"><div class="spot-img" style="${best.imagem ? `background-image:url('${esc(best.imagem)}')` : ""}"></div><div class="spot-b"><span class="eyebrow">Destaque do período</span><h3>${esc(ui().imName(best.imovel_id) || best.titulo)}</h3><p>Esse foi o conteúdo com melhor desempenho: <b>${esc(best.titulo)}</b>.</p><small class="muted">${U.fmt(best.alcance)} pessoas alcançadas</small></div></div>` : `<div class="card"><span class="eyebrow">Destaque do período</span><p class="muted">Nenhum conteúdo publicado nesse período.</p></div>`}
      <div class="card"><span class="eyebrow">Esta semana</span><h3>${wk ? U.range(wk.inicio, wk.fim) : "Sem semana planejada"}</h3><ul class="mini-list">${wkPubs.map((p) => `<li data-view="${p.id}" role="button" tabindex="0"><span>${U.weekday(p.data)} ${U.dShort(p.data)} · <b>${esc(p.titulo)}</b></span>${ui().stBadge(p.status)}</li>`).join("") || "<li class='muted'>Nenhum conteúdo nesta semana.</li>"}</ul><a class="link" href="#/cliente/conteudos">Ver todos os conteúdos →</a></div>
    </section>
    <section class="card"><span class="eyebrow">Seus anúncios · ${esc(F.label())}</span>
      ${cA.list.length ? `<div class="say-list"><p>Seus anúncios alcançaram <b>${U.fmt(cA.alcance)} pessoas</b>.</p><p><b>${U.fmt(cA.cliques)} pessoas</b> clicaram para conhecer as casas.</p><p><b>${U.fmt(cA.conversas)} pessoas</b> iniciaram uma conversa e <b>${U.fmt(cA.cliques_airbnb)}</b> foram até o Airbnb.</p><p class="muted">Investimento no período: ${U.money(cA.investimento)}</p></div>` : `<p class="muted">Nenhum anúncio rodando nesse período.</p>`}</section>`;
  }

  /* ---------- CRESCIMENTO ---------- */
  function crescimento() {
    const D = Store.data, [wa, wb] = F.win(), [pa, pb] = F.prev();
    const A = pWin(D.periodos, wa, wb), B = pWin(D.periodos, pa, pb);
    let ps = A.list, ctx = false;
    if (ps.length < 2) { ps = M.sortP(D.periodos).filter((p) => p.inicio <= wb).slice(-8); ctx = true; }
    const lab = ps.map((p) => U.dShort(p.fim));
    const cA = M.campWindow(D.campanhas, wa, wb), cB = M.campWindow(D.campanhas, pa, pb);
    const [la, lb] = F.shortLabels(), o = { la, lb };
    const c = (t, e, html, say) => `<div class="card"><h3 class="h-ic">${U.ic(e)}${t}</h3>${say ? `<p class="say sm">${say}</p>` : ""}${html}</div>`;
    return `<header class="page-h"><div><h1>Como estamos crescendo</h1><p class="muted">Escolha o dia, a semana ou o mês que quer ver.</p></div></header>
    ${F.html()}
    ${ps.length ? `${ctx ? `<p class="muted small cf-note">O período escolhido é curto para desenhar uma linha, então os gráficos mostram as 8 semanas até ${esc(U.dShort(wb))}.</p>` : ""}
    <section class="grid-2">
      ${c("Seguidores", "grafico", Charts.line(lab, [{ name: "Seguidores", values: ps.map((p) => n(p.seguidores_fim)), color: "#2AA89A" }]), A.count ? `Seu perfil ganhou <b>${U.fmt(A.novos)}</b> novos seguidores no período escolhido.` : "")}
      ${c("Pessoas alcançadas", "grafico", Charts.line(lab, [{ name: "Alcance", values: ps.map((p) => n(p.alcance)), color: "#13786F" }]))}
      ${c("Engajamento", "grafico", Charts.line(lab, [{ name: "Engajamento", values: ps.map(M.engRate), color: "#2AA89A" }], { pct: true }), "Quanto das pessoas alcançadas curtiu, comentou, salvou ou compartilhou.")}
      ${c("Visitas ao perfil", "grafico", Charts.line(lab, [{ name: "Visitas", values: ps.map((p) => n(p.visitas_perfil)), color: "#85DAA3" }]))}
    </section>` : `<div class="card">${noData}</div>`}
    <section class="card"><h3>${esc(F.label())}</h3><p class="muted small">Comparando com ${esc(F.prevWord().replace(/^(ao|à|aos) /, (m) => ({ "ao ": "o ", "à ": "a ", "aos ": "os " })[m]))}: ${U.range(pa, pb)}.</p>
      <div class="cmps">${Charts.compare("Novos seguidores", A.novos, B.novos, o)}${Charts.compare("Pessoas alcançadas", A.alcance, B.alcance, o)}${Charts.compare("Engajamento", A.eng, B.eng, Object.assign({ pct: true }, o))}${Charts.compare("Visitas ao perfil", A.visitas_perfil, B.visitas_perfil, o)}${Charts.compare("Cliques", A.cliques, B.cliques, o)}${Charts.compare("Cliques no Airbnb (anúncios)", cA.cliques_airbnb, cB.cliques_airbnb, o)}${Charts.compare("Conversas (anúncios)", cA.conversas, cB.conversas, o)}</div>${partialNote(A)}</section>`;
  }

  /* ---------- CONTEÚDOS ---------- */
  function conteudos() {
    const D = Store.data, [wa, wb] = F.win(), preset = F.isPreset(), cur = M.currentWeek(D.semanas);
    const inWin = (p) => p.data && p.data >= wa && (preset || p.data <= wb);
    const sems = D.semanas.slice().sort((a, b) => (a.inicio < b.inicio ? 1 : -1)).filter((w) => w.fim >= wa && (preset || w.inicio <= wb));
    const pubsW = D.publicacoes.filter(inWin), pub = pubsW.filter((p) => p.status === "Publicado").length, best = M.best(pubsW);
    const blocks = sems.map((w) => { const pubs = D.publicacoes.filter((p) => p.semana_id === w.id && inWin(p)).sort((a, b) => (a.data < b.data ? -1 : 1)); return `<section class="week card ${cur && cur.id === w.id ? "current" : ""} open"><header class="week-h"><div><span class="eyebrow">${cur && cur.id === w.id ? "Semana atual" : "Semana " + String(w.numero || "").padStart(2, "0")}</span><h3>${U.range(w.inicio, w.fim)}</h3></div><div class="week-meta"><span class="muted">${pubs.length} conteúdo${pubs.length === 1 ? "" : "s"}</span></div></header><div class="week-body"><div class="pubs">${pubs.map((p) => window.APA.pubCard(p, false)).join("") || "<p class='muted'>Nada nesse período.</p>"}</div></div></section>`; }).join("");
    return `<header class="page-h"><div><h1>Seus conteúdos</h1><p class="muted">${pub} conteúdo${pub === 1 ? "" : "s"} publicado${pub === 1 ? "" : "s"} no período${best ? ` · destaque: <b>${esc(best.titulo)}</b>` : ""}</p></div></header>
    ${F.html()}
    ${preset ? `<p class="muted small cf-note">Incluímos também os conteúdos já planejados para os próximos dias.</p>` : ""}
    <div class="legend-st">${Object.entries(M.STATUS).map(([s, c]) => `<span><i class="${c}"></i>${s}</span>`).join("")}</div>
    ${blocks || `<div class="card empty">Nenhum conteúdo nesse período.</div>`}`;
  }
  function viewPub(id) {
    const p = Store.data.publicacoes.find((x) => x.id === id); if (!p) return;
    const vs = M.vsType(p, Store.data.publicacoes);
    modal(`<div class="pubview">${p.imagem ? `<img src="${esc(p.imagem)}" alt="">` : ""}<div class="pv-b"><small class="muted">${esc(p.tipo)} · ${U.weekday(p.data)} ${U.dShort(p.data)}${p.horario ? " · " + esc(p.horario) : ""}</small><h2>${esc(p.titulo)}</h2>${ui().stBadge(p.status)}
      ${ui().imName(p.imovel_id) ? `<p class="muted ic-line">${U.ic("casa")}${esc(ui().imName(p.imovel_id))}</p>` : ""}${p.legenda ? `<p class="legenda">${esc(p.legenda)}</p>` : ""}
      ${M.hasResults(p) ? `<div class="pv-res"><div><b>${U.fmt(p.alcance)}</b><small>pessoas alcançadas</small></div><div><b>${U.fmt(p.curtidas)}</b><small>curtidas</small></div><div><b>${U.fmt(n(p.compartilhamentos) + n(p.salvamentos))}</b><small>salvaram ou compartilharam</small></div><div><b>${U.fmt(p.visitas_perfil)}</b><small>visitaram o perfil</small></div></div>${vs !== null ? `<p class="say sm">${vs >= 0 ? `Esse conteúdo foi visto por ${U.fmt(vs, 0)}% mais pessoas que a média dos ${esc(p.tipo)}. Olha esse resultado!` : `Esse conteúdo alcançou ${U.fmt(-vs, 0)}% menos pessoas que a média dos ${esc(p.tipo)}.`}</p>` : ""}` : `<p class="muted">Os resultados aparecem aqui depois da publicação.</p>`}
      ${p.link ? `<a class="btn ghost sm" href="${esc(p.link)}" target="_blank" rel="noopener">Ver no Instagram ↗</a>` : ""}</div></div>`, { wide: true });
  }
  window.APA.viewPub = viewPub;

  /* ---------- ANÚNCIOS ---------- */
  function anuncios() {
    const D = Store.data, [wa, wb] = F.win(), [pa, pb] = F.prev();
    const cA = M.campWindow(D.campanhas, wa, wb), cB = M.campWindow(D.campanhas, pa, pb);
    const p = cB.list.length ? U.pct(cA.cliques, cB.cliques) : null;
    return `<header class="page-h"><div><h1>Seus anúncios</h1><p class="muted">Como os anúncios levam pessoas até as casas.</p></div></header>
    ${F.html()}
    <section class="card hero-card"><span class="eyebrow">${esc(F.label())}</span>${cA.list.length ? `<div class="hero-grid">
      <div><strong class="big">${U.money(cA.investimento)}</strong><span>investidos</span></div><div><strong class="big">${U.count(cA.alcance)}</strong><span>pessoas alcançadas</span></div>
      <div><strong class="big">${U.count(cA.cliques)}</strong><span>cliques</span></div><div><strong class="big">${U.count(cA.conversas)}</strong><span>conversas</span></div></div>
      <p class="say">${phrase(p, `Os anúncios levaram {p}% mais pessoas até as casas em relação ${F.prevWord()}.`, `Os cliques ficaram {p}% abaixo em relação ${F.prevWord()}. Estamos ajustando as campanhas.`, "Os cliques se mantiveram parecidos com o período anterior.")} <b>${U.fmt(cA.cliques_airbnb)}</b> pessoas foram direto para o Airbnb.</p>
      <p class="muted small cf-note">Quando uma campanha pega só parte do período, entra a parte proporcional aos dias.</p>` : `<p class="say">Nenhum anúncio rodando nesse período.</p>`}</section>
    ${window.APA.funnel(D.campanhas, [wa, wb], F.label())}
    <section class="card"><h3>O que cada etapa faz</h3><div class="etapas">${M.ETAPAS.map((e, i) => `<div><span class="stage-n" style="--c:${e.cor}">${i + 1}</span><b>${e.id}</b><p class="muted small">${e.desc}.</p></div>`).join("")}</div></section>`;
  }

  /* ---------- CASAS ---------- */
  function casas() {
    const ims = Store.data.imoveis.filter((i) => i.status === "Ativo").sort((a, b) => M.interest(b) - M.interest(a));
    return `<header class="page-h"><div><h1>Suas casas</h1><p class="muted">Da mais procurada para a menos procurada · totais desde o início do acompanhamento.</p></div></header>
    <section class="card"><h3>Quem está chamando mais atenção</h3>${Charts.bars(ims.map((i) => ({ label: i.nome, value: n(i.cliques_airbnb) + n(i.cliques_whatsapp) })))}<p class="muted small">Pessoas que clicaram para reservar ou conversar sobre cada casa.</p></section>
    <div class="houses">${ims.map((i) => window.APA.houseCard(i, false)).join("")}</div>`;
  }
  function viewHouse(id) {
    const i = Store.data.imoveis.find((x) => x.id === id); if (!i) return;
    const pubs = Store.data.publicacoes.filter((p) => p.imovel_id === id), cs = Store.data.campanhas.filter((c) => c.imovel_id === id);
    modal(`<div class="pubview">${i.foto ? `<img src="${esc(i.foto)}" alt="">` : ""}<div class="pv-b"><small class="muted">${esc(i.cidade || "")} · ${esc(i.capacidade || "")}</small><h2>${esc(i.nome)}</h2><p>${esc(i.descricao || "")}</p>
      <div class="pv-res"><div><b>${U.fmt(i.visualizacoes)}</b><small>visualizações</small></div><div><b>${U.fmt(i.cliques_airbnb)}</b><small>cliques no Airbnb</small></div><div><b>${U.fmt(i.cliques_whatsapp)}</b><small>cliques no WhatsApp</small></div>${n(i.reservas) ? `<div><b>${U.fmt(i.reservas)}</b><small>reservas</small></div>` : ""}</div>
      ${pubs.length ? `<h4>Conteúdos sobre esta casa</h4><ul class="mini-list">${pubs.map((p) => `<li><span>${U.dShort(p.data)} · ${esc(p.titulo)}</span>${ui().stBadge(p.status)}</li>`).join("")}</ul>` : ""}
      ${cs.length ? `<h4>Anúncios desta casa</h4><ul class="mini-list">${cs.map((c) => `<li><span>${esc(c.nome)}</span><small>${U.fmt(c.cliques)} cliques</small></li>`).join("")}</ul>` : ""}
      ${i.airbnb ? `<a class="btn sm" href="${esc(i.airbnb)}" target="_blank" rel="noopener">Ver no Airbnb ↗</a>` : ""}</div></div>`, { wide: true });
  }
  window.APA.viewHouse = viewHouse;

  /* ---------- INSIGHTS ---------- */
  function insights() {
    const list = Store.data.insights.filter((i) => i.publicado).sort((a, b) => (b.destaque - a.destaque) || ((b.fim || "") > (a.fim || "") ? 1 : -1));
    return `<header class="page-h"><div><h1>Insights</h1><p class="muted">O que aprendemos e o que vamos fazer com isso.</p></div></header><div class="insights">${list.map((i) => window.APA.insightCard(i, false)).join("") || "<div class='card empty'>Em breve.</div>"}</div>`;
  }

  window.CLIENT_VIEWS = {
    "": { title: "Início", icon: "home", render: inicio, bind: F.bind },
    crescimento: { title: "Crescimento", icon: "chart", render: crescimento, bind: F.bind },
    conteudos: { title: "Conteúdos", icon: "cal", render: conteudos, bind: F.bind },
    anuncios: { title: "Anúncios", icon: "rocket", render: anuncios, bind: F.bind },
    casas: { title: "Casas", icon: "house", render: casas },
    insights: { title: "Insights", icon: "bulb", render: insights },
  };
})();
