/* =====================================================================
   MÉTRICAS — cálculos a partir dos dados cadastrados
   ===================================================================== */
(function () {
  "use strict";
  const { U } = window.APA;
  const M = {};
  const n = U.num;

  M.sortP = (ps) => ps.slice().sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  M.engRate = (p) => (p.taxa_engajamento !== null && p.taxa_engajamento !== undefined && p.taxa_engajamento !== "" ? n(p.taxa_engajamento) : n(p.alcance) ? ((n(p.curtidas) + n(p.comentarios) + n(p.compartilhamentos) + n(p.salvamentos)) / n(p.alcance)) * 100 : 0);
  M.newF = (p) => (p.novos_seguidores !== null && p.novos_seguidores !== undefined && p.novos_seguidores !== "" ? n(p.novos_seguidores) : n(p.seguidores_fim) - n(p.seguidores_inicio));

  // filtra por janela de dias (períodos que terminam dentro da janela)
  M.window = (ps, days, from, to) => {
    const s = M.sortP(ps);
    if (from || to) return s.filter((p) => (!from || p.fim >= from) && (!to || p.fim <= to));
    if (!days) return s;
    const lim = U.iso(U.addDays(U.today(), -days));
    return s.filter((p) => p.fim > lim);
  };

  M.sum = (ps, k) => ps.reduce((a, p) => a + n(p[k]), 0);
  M.agg = (ps) => {
    const s = M.sortP(ps);
    const alc = M.sum(s, "alcance");
    const inter = M.sum(s, "curtidas") + M.sum(s, "comentarios") + M.sum(s, "compartilhamentos") + M.sum(s, "salvamentos");
    const engs = s.map(M.engRate).filter((x) => x);
    return {
      seguidores: s.length ? n(s[s.length - 1].seguidores_fim) : 0,
      novos: s.reduce((a, p) => a + M.newF(p), 0),
      alcance: alc, impressoes: M.sum(s, "impressoes"), engajadas: M.sum(s, "contas_engajadas"),
      interacoes: inter, visitas: M.sum(s, "visitas_perfil"), cliques: M.sum(s, "cliques"),
      eng: engs.length ? engs.reduce((a, b) => a + b, 0) / engs.length : 0, count: s.length,
    };
  };

  // mês corrente vs mês anterior (por data de término do período)
  M.monthBounds = (offset = 0) => {
    const t = U.today(); const a = new Date(t.getFullYear(), t.getMonth() + offset, 1), b = new Date(t.getFullYear(), t.getMonth() + offset + 1, 0);
    return [U.iso(a), U.iso(b)];
  };
  M.inMonth = (rows, offset, key = "fim") => { const [a, b] = M.monthBounds(offset); return rows.filter((r) => r[key] && r[key] >= a && r[key] <= b); };
  // últimos 30 dias vs 30 anteriores — mais estável no início do mês
  M.last = (ps, days = 30, shift = 0) => {
    const end = U.addDays(U.today(), -shift), start = U.addDays(end, -days);
    return M.sortP(ps).filter((p) => p.fim > U.iso(start) && p.fim <= U.iso(end));
  };
  M.compare = (ps, days = 30) => {
    const a = M.agg(M.last(ps, days, 0)), b = M.agg(M.last(ps, days, days));
    const s = M.sortP(ps); const prevF = M.last(ps, days, days); const fPrev = prevF.length ? n(prevF[prevF.length - 1].seguidores_fim) : (s[0] ? n(s[0].seguidores_inicio) : 0);
    return { a, b, fPrev };
  };

  /* campanhas */
  M.camp = (c) => {
    const inv = n(c.investimento), cl = n(c.cliques), imp = n(c.impressoes);
    return { ctr: imp ? (cl / imp) * 100 : 0, cpc: cl ? inv / cl : 0, cpm: imp ? (inv / imp) * 1000 : 0 };
  };
  M.campAgg = (cs) => {
    const o = { investimento: 0, alcance: 0, impressoes: 0, cliques: 0, conversas: 0, cliques_airbnb: 0, cliques_whatsapp: 0, reservas: 0 };
    cs.forEach((c) => Object.keys(o).forEach((k) => (o[k] += n(c[k]))));
    return Object.assign(o, M.camp(o));
  };
  M.campInMonth = (cs, offset) => { const [a, b] = M.monthBounds(offset); return cs.filter((c) => (c.inicio || "") <= b && (c.fim || c.inicio || "") >= a); };
  // janela "mês até hoje": dia 1 até o dia de hoje, no mês atual (0) ou no anterior (-1)
  M.mtd = (offset = 0) => {
    const t = U.today(), a = new Date(t.getFullYear(), t.getMonth() + offset, 1);
    const last = new Date(t.getFullYear(), t.getMonth() + offset + 1, 0).getDate();
    const b = new Date(a.getFullYear(), a.getMonth(), Math.min(t.getDate(), last));
    return [U.iso(a), U.iso(b)];
  };
  // soma campanhas proporcionalmente aos dias que caem dentro da janela
  M.campWindow = (cs, a, b) => {
    const days = (x, y) => Math.max(0, Math.round((U.d(y) - U.d(x)) / 864e5) + 1);
    const keys = ["investimento", "alcance", "impressoes", "cliques", "conversas", "cliques_airbnb", "cliques_whatsapp", "reservas"];
    const o = Object.fromEntries(keys.map((k) => [k, 0])); const list = [];
    cs.forEach((c) => {
      const ci = c.inicio || c.fim, cf = c.fim || c.inicio; if (!ci) return;
      const ini = ci > a ? ci : a, fim = cf < b ? cf : b; const ov = days(ini, fim); if (ini > fim || !ov) return;
      const f = ov / Math.max(1, days(ci, cf)); keys.forEach((k) => (o[k] += n(c[k]) * f)); list.push(c);
    });
    keys.forEach((k) => (o[k] = k === "investimento" ? Math.round(o[k] * 100) / 100 : Math.round(o[k])));
    return Object.assign(o, M.camp(o), { list });
  };
  M.campMTD = (cs, offset) => { const [a, b] = M.mtd(offset); return M.campWindow(cs, a, b); };
  M.periodsMTD = (ps, offset) => { const [a, b] = M.mtd(offset); return ps.filter((p) => p.fim >= a && p.fim <= b); };
  M.ETAPAS = [
    { id: "Descoberta", desc: "Primeiro contato com a marca", cor: "var(--menta)", metas: "Alcance · visualizações · reconhecimento" },
    { id: "Consideração", desc: "Visita o site e conhece uma casa", cor: "var(--turq)", metas: "Visitas ao site · imóveis vistos · cliques" },
    { id: "Reserva", desc: "Já demonstrou interesse", cor: "var(--mata)", metas: "Airbnb · WhatsApp · reservas" },
  ];

  /* publicações */
  M.score = (p) => n(p.alcance) + 3 * (n(p.curtidas) + n(p.comentarios)) + 6 * (n(p.compartilhamentos) + n(p.salvamentos));
  M.hasResults = (p) => p.status === "Publicado" && n(p.alcance) > 0;
  M.vsType = (p, all) => {
    const peers = all.filter((x) => x.id !== p.id && x.tipo === p.tipo && M.hasResults(x));
    if (peers.length < 2 || !M.hasResults(p)) return null;
    const avg = peers.reduce((a, x) => a + n(x.alcance), 0) / peers.length;
    return U.pct(p.alcance, avg);
  };
  M.best = (pubs) => pubs.filter(M.hasResults).sort((a, b) => M.score(b) - M.score(a))[0] || null;
  M.bestType = (pubs) => {
    const g = {}; pubs.filter(M.hasResults).forEach((p) => { (g[p.tipo] = g[p.tipo] || []).push(n(p.alcance)); });
    const r = Object.entries(g).map(([t, v]) => [t, v.reduce((a, b) => a + b, 0) / v.length, v.length]).sort((a, b) => b[1] - a[1]);
    return r[0] || null;
  };
  M.currentWeek = (sems) => {
    const t = U.iso(U.today()), s = sems.slice().sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
    return s.find((w) => w.inicio <= t && w.fim >= t) || s.filter((w) => w.inicio > t)[0] || s[s.length - 1] || null;
  };
  M.STATUS = { "Em produção": "st-prod", "Aguardando material": "st-wait", "Agendado": "st-sched", "Publicado": "st-pub", "Pausado": "st-pause" };
  M.TIPOS = ["Reels", "Post", "Carrossel", "Stories", "Outro"];

  /* imóveis */
  M.interest = (im) => n(im.visualizacoes) + 2 * n(im.cliques_site) + 4 * n(im.cliques_airbnb) + 4 * n(im.cliques_whatsapp) + 20 * n(im.reservas);

  window.APA.M = M;
})();
