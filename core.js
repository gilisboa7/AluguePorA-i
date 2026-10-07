/* =====================================================================
   PAINEL ALUGUE POR AÍ — NÚCLEO
   Camada de dados (Supabase ou demonstração), autenticação, utilitários,
   gráficos e formulários.
   ===================================================================== */
(function () {
  "use strict";
  const CFG = window.APP_CONFIG || {};
  const USE_SUPABASE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const TABLES = ["imoveis", "periodos", "semanas", "publicacoes", "campanhas", "insights"];

  /* ---------------- utilitários ---------------- */
  const U = {};
  U.$ = (s, el = document) => el.querySelector(s);
  U.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  U.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.num = (v) => (v === null || v === undefined || v === "" || isNaN(+v) ? 0 : +v);
  U.fmt = (v, d = 0) => U.num(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  U.money = (v) => "R$ " + U.num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  U.pct = (a, b) => (U.num(b) ? ((U.num(a) - U.num(b)) / U.num(b)) * 100 : null);
  U.sign = (p, d = 1) => (p === null ? "—" : Math.abs(p) < 0.5 * Math.pow(10, -d) ? "0%" : (p >= 0 ? "+" : "") + p.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 }) + "%");
  U.uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  U.today = () => new Date(new Date().toDateString());
  U.d = (s) => (s ? new Date(s + "T12:00:00") : null);
  U.iso = (d) => d.toISOString().slice(0, 10);
  U.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  /* ícones lineares minimalistas (substituem emojis) */
  const IC = {
    trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.5M16 6h2.5a2.5 2.5 0 0 1-2.6 3.5M12 13v4M8.5 20h7M10 17h4"/>',
    brilho: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2"/>',
    folha: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l8-8"/>',
    chama: '<path d="M12 21c3.5 0 6-2.4 6-5.8 0-3.6-2.6-5.4-3.6-8.7-1.8 1.2-2.4 3-2.4 4.5-1.2-.7-2-2-2.2-3.3C7.6 9.6 6 12 6 15.2 6 18.6 8.5 21 12 21z"/>',
    casa: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5"/><path d="M12 17c-1.6-1.3-2.4-2.3-2.4-3.2 0-.8.6-1.3 1.2-1.3.5 0 1 .3 1.2.8.2-.5.7-.8 1.2-.8.6 0 1.2.5 1.2 1.3 0 .9-.8 1.9-2.4 3.2z"/>',
    foguete: '<path d="M13 3c3.5 1 6 3.5 7 7l-6.5 6.5-7-7z"/><path d="M6.5 9.5 4 10l-1 3 3.5-.5M14.5 17.5 14 20l-3 1 .5-3.5"/><circle cx="15.5" cy="8.5" r="1.2"/>',
    grafico: '<path d="M4 19h16M6 16l4-5 3 3 5-7"/><path d="M15 7h3v3"/>',
    olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    coracao: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    estrela: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    onda: '<path d="M3 10c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 15c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    calendario: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  };
  U.ic = (k, cls = "") => `<svg class="lic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || ""}</svg>`;
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESES_L = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  U.MESES_L = MESES_L;
  U.dShort = (s) => { const d = U.d(s); return d ? `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]}` : ""; };
  U.range = (a, b) => {
    const x = U.d(a), y = U.d(b); if (!x || !y) return "";
    if (x.getMonth() === y.getMonth()) return `${x.getDate()} a ${y.getDate()} de ${MESES_L[y.getMonth()]}`;
    return `${x.getDate()} de ${MESES_L[x.getMonth()]} a ${y.getDate()} de ${MESES_L[y.getMonth()]}`;
  };
  U.weekday = (s) => { const d = U.d(s); return d ? ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()] : ""; };

  /* ---------------- dados de demonstração ---------------- */
  function seed() {
    const IMG = window.SEED_IMG || {};
    const im = (id, nome, cidade, cap, desc, foto, airbnb, carac, vis, cs, ca, cw, rs) => ({ id, nome, cidade, capacidade: cap, descricao: desc, foto: IMG[foto] || "", galeria: "", airbnb, site: "https://gilisboa7.github.io/AluguePorA-i/#casas", whatsapp: "5511916857357", caracteristicas: carac, status: "Ativo", visualizacoes: vis, cliques_site: cs, cliques_airbnb: ca, cliques_whatsapp: cw, reservas: rs });
    const imoveis = [
      im("im-paradiso", "Chácara Paradiso", "Mairinque - SP", "15 pessoas", "Piscina aquecida, fogo de chão e quarto temático dos Minions.", "paradiso", "https://airbnb.com.br/h/paradisoalugueporai", "Piscina aquecida\nChurrasqueira e forno de pizza\nMesa de sinuca\nFogo de chão", 1840, 412, 236, 58, 4),
      im("im-recanto", "Recanto da Natureza", "Mairinque - SP", "11 pessoas", "Cercada de mata, com piscina aquecida e forno a lenha.", "recanto", "https://airbnb.com/h/recantodanatureza-mairinque", "Piscina aquecida\nForno e fogão a lenha\nFogo de chão", 1520, 351, 198, 41, 3),
      im("im-grande-familia", "Grande Família", "Mairinque - SP", "15 pessoas", "Piscina, campo de futebol, balanço e pula-pula.", "grande-familia", "https://airbnb.com/h/agrandefamilia", "Piscina\nCampo de futebol\nPula-pula", 1210, 268, 141, 37, 2),
      im("im-xabila", "Xabila", "Mairinque - SP", "16 pessoas", "Para grupos grandes, com piscina e campo de futebol.", "xabila", "https://airbnb.com/h/xabila", "Piscina\nCampo de futebol\nMesa de sinuca", 980, 214, 117, 29, 2),
      im("im-oasis", "Oasis das Flores", "Mairinque - SP", "13 pessoas", "Piscina aquecida entre palmeiras e fogo de chão.", "oasis", "http://airbnb.com/h/oasisdasflores-mairinque", "Piscina aquecida\nFogo de chão\nBalanço", 1105, 247, 139, 33, 2),
      im("im-tree-house", "Tree House", "Mairinque - SP", "16 pessoas", "Cinco suítes, hidromassagem e lareira interna.", "tree-house", "https://airbnb.com/h/treehousebrazil", "Piscina aquecida\nHidromassagem\nLareira interna", 1390, 305, 172, 46, 3),
      im("im-studio", "Studio Alto Padrão", "São Paulo - SP", "3 hóspedes", "A 300 m do Metrô Brooklin, enxoval padrão hotel.", "studio", "https://airbnb.com/h/studio-alto-padrao", "Cozinha equipada\nEnxoval padrão hotel", 640, 132, 84, 12, 1),
    ];
    // períodos semanais (últimas 26 semanas)
    const periodos = []; let seg = 1060; const t0 = U.addDays(U.today(), -U.today().getDay() - 182);
    for (let i = 0; i < 26; i++) {
      const ini = U.addDays(t0, i * 7), fim = U.addDays(ini, 6), f = 1 + i / 40;
      const novos = Math.round((9 + (i % 5) * 2 + i * 0.35) * (i % 7 === 3 ? 1.6 : 1));
      const alcance = Math.round((5200 + Math.sin(i / 1.7) * 520 + i * 120) * f), contas = Math.round(alcance * (0.054 + 0.004 * Math.sin(i / 2.6) + i * 0.0003));
      const curt = Math.round(contas * 1.7), com = Math.round(contas * 0.12), comp = Math.round(contas * 0.16), salv = Math.round(contas * 0.21);
      periodos.push({ id: "pe-" + i, inicio: U.iso(ini), fim: U.iso(fim), seguidores_inicio: seg, seguidores_fim: seg + novos, novos_seguidores: novos, alcance, impressoes: Math.round(alcance * 1.65), contas_engajadas: contas, curtidas: curt, comentarios: com, compartilhamentos: comp, salvamentos: salv, visitas_perfil: Math.round(alcance * 0.085), cliques: Math.round(alcance * 0.03), taxa_engajamento: null, observacoes: "" });
      seg += novos;
    }
    // semanas de conteúdo
    const mon = U.addDays(U.today(), -((U.today().getDay() + 6) % 7));
    const semanas = [-14, -7, 0, 7].map((o, i) => ({ id: "se-" + i, numero: i + 1, inicio: U.iso(U.addDays(mon, o)), fim: U.iso(U.addDays(mon, o + 6)), status: o < 0 ? "Concluída" : o === 0 ? "Em andamento" : "Planejamento", observacoes: "" }));
    const P = (sem, dia, hora, tipo, titulo, tema, imovel, status, foto, r) => {
      const d = U.iso(U.addDays(U.d(semanas[sem].inicio), dia));
      return Object.assign({ id: U.uid(), semana_id: semanas[sem].id, data: d, horario: hora, tipo, titulo, tema, imovel_id: imovel, legenda: "", imagem: IMG[foto] || "", link: "", status, observacoes: "" }, r ? { alcance: r[0], impressoes: Math.round(r[0] * 1.4), curtidas: r[1], comentarios: r[2], compartilhamentos: r[3], salvamentos: r[4], visitas_perfil: r[5], cliques: r[6], novos_seguidores: r[7] } : {});
    };
    const publicacoes = [
      P(0, 1, "18:00", "Reels", "Tour pela piscina aquecida", "Piscina", "im-paradiso", "Publicado", "paradiso", [4820, 312, 21, 58, 74, 410, 96, 22]),
      P(0, 3, "12:00", "Carrossel", "Qual casa combina com você?", "Escolha da casa", null, "Publicado", "hero", [2310, 188, 34, 22, 61, 205, 64, 9]),
      P(0, 5, "19:00", "Post", "Fogo de chão ao entardecer", "Experiência", "im-recanto", "Publicado", "recanto", [1980, 154, 9, 12, 28, 140, 31, 5]),
      P(1, 1, "18:30", "Reels", "Um dia na Tree House", "Tour", "im-tree-house", "Publicado", "tree-house", [3640, 251, 17, 39, 52, 318, 77, 15]),
      P(1, 3, "12:00", "Post", "Nota 5,0 no Airbnb", "Prova social", "im-oasis", "Publicado", "oasis", [2050, 176, 12, 15, 19, 162, 40, 6]),
      P(1, 5, "20:00", "Stories", "Bastidores da arrumação", "Bastidores", "im-grande-familia", "Publicado", "grande-familia", [1240, 0, 0, 0, 0, 74, 28, 2]),
      P(2, 1, "18:00", "Reels", "Studio pertinho do metrô", "Tour", "im-studio", "Publicado", "studio", [2780, 196, 14, 26, 41, 230, 58, 11]),
      P(2, 3, "12:00", "Carrossel", "Casas para o feriado", "Datas especiais", null, "Agendado", "xabila"),
      P(2, 5, "19:00", "Post", "Recanto da Natureza", "Apresentação da casa", "im-recanto", "Em produção", "recanto"),
      P(3, 1, "18:00", "Reels", "Xabila para grupos grandes", "Tour", "im-xabila", "Aguardando material", "xabila"),
      P(3, 4, "12:00", "Post", "Grande Família: espaço para todos", "Apresentação da casa", "im-grande-familia", "Em produção", "grande-familia"),
    ];
    const mStart = U.iso(new Date(U.today().getFullYear(), U.today().getMonth(), 1));
    const pmStart = U.iso(new Date(U.today().getFullYear(), U.today().getMonth() - 1, 1)), pmEnd = U.iso(U.addDays(U.d(mStart), -1));
    const C = (nome, etapa, objetivo, ini, fim, imovel, inv, alc, imp, cli, conv, ca, cw, res) => ({ id: U.uid(), nome, etapa, objetivo, inicio: ini, fim, imovel_id: imovel, plataforma: "Meta", investimento: inv, alcance: alc, impressoes: imp, cliques: cli, conversas: conv, cliques_airbnb: ca, cliques_whatsapp: cw, reservas: res, observacoes: "" });
    const campanhas = [
      C("Descoberta · Reels das casas", "Descoberta", "Visualizações", pmStart, pmEnd, null, 180, 9800, 16400, 210, 6, 31, 9, null),
      C("Consideração · Paradiso", "Consideração", "Visitas ao site", pmStart, pmEnd, "im-paradiso", 150, 4100, 7200, 236, 18, 64, 22, 1),
      C("Reserva · Remarketing", "Reserva", "Remarketing", pmStart, pmEnd, null, 120, 1900, 4800, 142, 41, 58, 37, 2),
      ...[["Descoberta · Feriado de novembro", "Descoberta", "Alcance", null, 200, 9300, 15100, 238, 9, 36, 12, null],
        ["Consideração · Tree House", "Consideração", "Visitas ao site", "im-tree-house", 170, 3900, 6900, 262, 24, 71, 28, 1],
        ["Reserva · Remarketing", "Reserva", "Conversas", null, 130, 1620, 4300, 168, 54, 67, 46, 2]].map((r) => {
        // campanhas do mês atual: números proporcionais aos dias já passados
        const k = Math.min(1, U.today().getDate() / 30) * 1.12, sc = (v) => (v === null ? null : Math.max(0, Math.round(v * k)));
        return C(r[0], r[1], r[2], mStart, U.iso(U.today()), r[3], Math.round(r[4] * k * 100) / 100, ...r.slice(5).map(sc));
      }),
    ];
    const insights = [
      { id: U.uid(), titulo: "Piscinas puxam o alcance", descricao: "Conteúdos mostrando piscinas tiveram o maior alcance das últimas semanas. Vamos abrir mais Reels com a água logo no primeiro segundo.", inicio: semanas[0].inicio, fim: semanas[1].fim, categoria: "Conteúdo", destaque: true, publicado: true },
      { id: U.uid(), titulo: "Interior das casas leva ao perfil", descricao: "Reels mostrando o interior das casas geraram mais visitas ao perfil do que fotos só da área externa.", inicio: semanas[1].inicio, fim: semanas[1].fim, categoria: "Instagram", destaque: false, publicado: true },
      { id: U.uid(), titulo: "São Paulo e região respondem melhor", descricao: "Os anúncios segmentados para São Paulo e região tiveram cliques mais baratos que os demais públicos.", inicio: mStart, fim: U.iso(U.today()), categoria: "Tráfego", destaque: true, publicado: true },
      { id: U.uid(), titulo: "Rascunho: testar horário das 12h", descricao: "Nota interna — ainda não publicada para a cliente.", inicio: mStart, fim: U.iso(U.today()), categoria: "Estratégia", destaque: false, publicado: false },
    ];
    return { imoveis, periodos, semanas, publicacoes, campanhas, insights };
  }

  /* ---------------- camada de dados ---------------- */
  const DEMO_KEY = "apa_painel_demo_v1", SESSION_KEY = "apa_painel_demo_sessao";
  const DEMO_USERS = { "giovanna@demo": { id: "u-admin", nome: "Giovanna", role: "admin" }, "cliente@demo": { id: "u-cliente", nome: "Alugue por Aí", role: "cliente" } };
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("storage", e); } }, del(k) { try { localStorage.removeItem(k); } catch {} } };

  function demoAdapter() {
    let mem = ls.get(DEMO_KEY);
    if (!mem) { mem = seed(); ls.set(DEMO_KEY, mem); }
    const save = () => ls.set(DEMO_KEY, mem);
    let user = ls.get(SESSION_KEY);
    const guard = () => { if (!user) throw new Error("Faça login."); if (user.role !== "admin") throw new Error("Acesso somente leitura."); };
    return {
      mode: "demo",
      async signIn(email, senha) {
        const u = DEMO_USERS[String(email).trim().toLowerCase()];
        if (!u || senha !== "demonstracao") throw new Error("E-mail ou senha incorretos.");
        user = u; ls.set(SESSION_KEY, u); return u;
      },
      async signOut() { user = null; ls.del(SESSION_KEY); },
      async currentUser() { return user; },
      async list(t) {
        if (!user) throw new Error("Faça login.");
        let rows = (mem[t] || []).slice();
        if (t === "insights" && user.role !== "admin") rows = rows.filter((r) => r.publicado);
        return rows;
      },
      async insert(t, row) { guard(); const r = Object.assign({ id: U.uid() }, row); mem[t].push(r); save(); return r; },
      async update(t, id, row) { guard(); const i = mem[t].findIndex((r) => r.id === id); if (i < 0) throw new Error("Registro não encontrado."); mem[t][i] = Object.assign({}, mem[t][i], row); save(); return mem[t][i]; },
      async remove(t, id) {
        guard(); mem[t] = mem[t].filter((r) => r.id !== id);
        if (t === "semanas") mem.publicacoes = mem.publicacoes.filter((p) => p.semana_id !== id);
        if (t === "imoveis") ["publicacoes", "campanhas"].forEach((k) => mem[k].forEach((r) => { if (r.imovel_id === id) r.imovel_id = null; }));
        save();
      },
      async upload(file) { guard(); return await compressImage(file, 900); },
      async reset() { guard(); mem = seed(); save(); },
      exportAll() { return JSON.parse(JSON.stringify(mem)); },
    };
  }

  function supabaseAdapter() {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    let profile = null;
    const chk = ({ data, error }) => { if (error) throw new Error(traduz(error.message)); return data; };
    const traduz = (m) => /Invalid login/i.test(m) ? "E-mail ou senha incorretos." : /row-level security|permission/i.test(m) ? "Você não tem permissão para alterar dados." : m;
    const clean = (row) => { const o = {}; Object.keys(row).forEach((k) => { o[k] = row[k] === "" ? null : row[k]; }); delete o.id; return o; };
    return {
      mode: "supabase",
      async signIn(email, senha) {
        chk(await sb.auth.signInWithPassword({ email, password: senha }));
        return await this.currentUser();
      },
      async signOut() { await sb.auth.signOut(); profile = null; },
      async currentUser() {
        const { data } = await sb.auth.getSession(); const s = data.session; if (!s) return null;
        if (profile && profile.id === s.user.id) return profile;
        const p = chk(await sb.from("profiles").select("id,nome,role").eq("id", s.user.id).single());
        profile = p; return p;
      },
      async list(t) { return chk(await sb.from(t).select("*").order("created_at", { ascending: true })); },
      async insert(t, row) { return chk(await sb.from(t).insert(clean(row)).select().single()); },
      async update(t, id, row) { return chk(await sb.from(t).update(clean(row)).eq("id", id).select().single()); },
      async remove(t, id) { chk(await sb.from(t).delete().eq("id", id)); },
      async upload(file) {
        const blob = await (await fetch(await compressImage(file, 1400))).blob();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        chk(await sb.storage.from("midias").upload(path, blob, { contentType: "image/jpeg" }));
        return sb.storage.from("midias").getPublicUrl(path).data.publicUrl;
      },
      async reset() { throw new Error("Disponível só no modo demonstração."); },
      exportAll: null,
    };
  }

  function compressImage(file, max) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.78)); }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  // Supabase configurado mas a biblioteca não carregou (sem internet ou CDN fora do ar):
  // mostra o erro em vez de cair no modo demonstração.
  const offlineAdapter = () => {
    const msg = "Não foi possível carregar o sistema de login. Verifique a internet e recarregue a página.";
    const no = async () => { throw new Error(msg); };
    return { mode: "supabase", signIn: no, signOut: async () => {}, currentUser: async () => null, list: no, insert: no, update: no, remove: no, upload: no, reset: no, exportAll: null };
  };
  const API = USE_SUPABASE ? (window.supabase ? supabaseAdapter() : offlineAdapter()) : demoAdapter();

  /* cache de dados para as telas */
  const Store = { data: {}, async loadAll() { const r = await Promise.all(TABLES.map((t) => API.list(t).catch(() => []))); TABLES.forEach((t, i) => (this.data[t] = r[i])); return this.data; } };

  /* ---------------- toast ---------------- */
  function toast(msg, type = "ok") {
    let wrap = U.$("#toasts"); if (!wrap) { wrap = document.createElement("div"); wrap.id = "toasts"; document.body.appendChild(wrap); }
    const t = document.createElement("div"); t.className = "toast " + type; t.innerHTML = (type === "ok" ? U.ic("check") : "") + `<span>${U.esc(msg)}</span>`;
    wrap.appendChild(t); setTimeout(() => t.classList.add("out"), 2600); setTimeout(() => t.remove(), 3100);
  }

  /* ---------------- gráficos SVG ---------------- */
  const Charts = {};
  Charts.line = (labels, series, opt = {}) => {
    const W = 640, H = opt.h || 220, P = { l: 44, r: 14, t: 16, b: 28 };
    const all = series.flatMap((s) => s.values.map(U.num));
    if (!labels.length || !all.length) return `<div class="empty">Sem dados no período.</div>`;
    let min = Math.min(...all), max = Math.max(...all); if (opt.zero) min = 0; if (min === max) { max += 1; min = Math.max(0, min - 1); }
    const pad = (max - min) * 0.12; min = opt.zero ? 0 : Math.max(0, min - pad); max += pad;
    const x = (i) => P.l + (labels.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (labels.length - 1));
    const y = (v) => P.t + (H - P.t - P.b) * (1 - (U.num(v) - min) / (max - min));
    const ticks = [0, 0.5, 1].map((k) => min + (max - min) * k);
    const fmtT = (v) => (opt.pct ? U.fmt(v, 1) + "%" : v >= 10000 ? U.fmt(v / 1000, 0) + "k" : U.fmt(v));
    const step = Math.ceil(labels.length / (opt.maxLabels || 7));
    let g = ticks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end" class="ax">${fmtT(v)}</text>`).join("");
    g += labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="ax">${U.esc(l)}</text>` : "")).join("");
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [x(i), y(v)]);
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      if (si === 0 && !opt.noArea) g += `<path d="${d} L${pts[pts.length - 1][0]} ${H - P.b} L${pts[0][0]} ${H - P.b} Z" fill="${s.color}" opacity=".10" class="area"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="draw" pathLength="1"/>`;
      g += pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${U.esc(labels[i])}: ${opt.pct ? U.fmt(s.values[i], 1) + "%" : U.fmt(s.values[i])}</title></circle>`).join("");
    });
    const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${U.esc(s.name)}</span>`).join("")}</div>` : "";
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${U.esc(opt.label || "Gráfico")}">${g}</svg>${legend}`;
  };
  Charts.bars = (items, opt = {}) => {
    const max = Math.max(1, ...items.map((i) => U.num(i.value)));
    return `<div class="hbars">${items.map((it, k) => `<div class="hbar"><div class="hbar-top"><span>${U.esc(it.label)}</span><b>${opt.money ? U.money(it.value) : U.fmt(it.value)}</b></div><div class="hbar-track"><div class="hbar-fill" style="--w:${(U.num(it.value) / max) * 100}%;--d:${k * 70}ms;background:${it.color || "var(--turq)"}"></div></div></div>`).join("")}</div>`;
  };
  Charts.compare = (label, a, b, opt = {}) => {
    const max = Math.max(1, U.num(a), U.num(b)), p = U.pct(a, b);
    const f = (v) => (opt.pct ? U.fmt(v, 1) + "%" : U.fmt(v));
    return `<div class="cmp"><div class="cmp-h"><span>${U.esc(label)}</span><em class="${p === null || Math.abs(p) < 0.5 ? "" : p > 0 ? "up" : "down"}">${U.sign(p, 0)}</em></div>
      <div class="cmp-row"><small>${U.esc(opt.la || "Este mês")}</small><div class="hbar-track"><div class="hbar-fill" style="--w:${(U.num(a) / max) * 100}%;background:var(--turq)"></div></div><b>${f(a)}</b></div>
      <div class="cmp-row"><small>${U.esc(opt.lb || "Mês anterior")}</small><div class="hbar-track"><div class="hbar-fill" style="--w:${(U.num(b) / max) * 100}%;background:var(--menta)"></div></div><b>${f(b)}</b></div></div>`;
  };

  /* ---------------- números animados ---------------- */
  function animateNumbers(root) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    U.$$("[data-count]", root).forEach((el) => {
      const end = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || ""; const t0 = performance.now(), dur = 900;
      const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + (end * e).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }
  U.count = (v, dec = 0, pre = "", suf = "") => `<span data-count="${U.num(v)}" data-dec="${dec}" data-pre="${pre}" data-suf="${suf}">${pre}${U.fmt(v, dec)}${suf}</span>`;

  /* ---------------- modal + formulário ---------------- */
  function modal(html, { wide } = {}) {
    closeModal();
    const m = document.createElement("div"); m.className = "modal"; m.id = "modal";
    m.innerHTML = `<div class="modal-bg" data-x></div><div class="modal-card ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><button class="icon-btn modal-x" data-x aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${html}</div>`;
    document.body.appendChild(m); document.body.classList.add("noscroll");
    m.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) closeModal(); });
    setTimeout(() => { const f = U.$("input,select,textarea,button:not(.modal-x)", m); f && f.focus(); }, 60);
    return m;
  }
  function closeModal() { const m = U.$("#modal"); if (m) m.remove(); document.body.classList.remove("noscroll"); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function field(f, v) {
    const id = "f-" + f.k, req = f.req ? "required" : "", val = v ?? f.def ?? "";
    let inp;
    if (f.type === "select") inp = `<select id="${id}" name="${f.k}" ${req}>${f.opts.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${U.esc(ov)}" ${String(ov) === String(val ?? "") ? "selected" : ""}>${U.esc(ol)}</option>`; }).join("")}</select>`;
    else if (f.type === "textarea") inp = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 3}" ${req}>${U.esc(val)}</textarea>`;
    else if (f.type === "bool") inp = `<label class="switch"><input type="checkbox" id="${id}" name="${f.k}" ${val ? "checked" : ""}><span></span>${U.esc(f.hint || "")}</label>`;
    else if (f.type === "image") inp = `<div class="imgfield"><div class="imgprev" style="${val ? `background-image:url('${U.esc(val)}')` : ""}"></div><div><input type="hidden" name="${f.k}" value="${U.esc(val)}"><label class="btn ghost sm">Enviar imagem<input type="file" accept="image/*" hidden data-up="${f.k}"></label><input type="url" placeholder="ou cole o link da imagem" data-url="${f.k}" value="${val && !String(val).startsWith("data:") ? U.esc(val) : ""}"></div></div>`;
    else inp = `<input id="${id}" name="${f.k}" type="${f.type || "text"}" ${f.step ? `step="${f.step}"` : ""} ${f.min !== undefined ? `min="${f.min}"` : ""} value="${U.esc(val)}" ${req} placeholder="${U.esc(f.ph || "")}">`;
    return `<div class="fld ${f.full ? "full" : ""} ${f.type === "bool" ? "full" : ""}"><label for="${id}">${U.esc(f.label)}${f.req ? " *" : ""}</label>${inp}${f.help ? `<small>${U.esc(f.help)}</small>` : ""}</div>`;
  }
  function form({ title, sub, groups, values = {}, onSave, onDelete, saveLabel = "Salvar" }) {
    const html = `<form class="form" novalidate><h2>${U.esc(title)}</h2>${sub ? `<p class="muted">${U.esc(sub)}</p>` : ""}
      ${groups.map((g) => `<fieldset>${g.title ? `<legend>${U.esc(g.title)}</legend>` : ""}<div class="grid2">${g.fields.map((f) => field(f, values[f.k])).join("")}</div></fieldset>`).join("")}
      <div class="form-actions">${onDelete ? `<button type="button" class="btn danger ghost" data-del>Excluir</button>` : "<span></span>"}<div><button type="button" class="btn ghost" data-x>Cancelar</button><button class="btn primary" type="submit">${U.esc(saveLabel)}</button></div></div></form>`;
    const m = modal(html, { wide: true }), fm = U.$("form", m);
    U.$$("[data-up]", fm).forEach((inp) => inp.addEventListener("change", async () => {
      const f = inp.files[0]; if (!f) return; const k = inp.dataset.up, prev = inp.closest(".imgfield").querySelector(".imgprev");
      prev.classList.add("loading");
      try { const url = await API.upload(f); fm.elements[k].value = url; prev.style.backgroundImage = `url('${url}')`; } catch (e) { toast(e.message, "err"); }
      prev.classList.remove("loading");
    }));
    U.$$("[data-url]", fm).forEach((inp) => inp.addEventListener("change", () => { const k = inp.dataset.url; fm.elements[k].value = inp.value; inp.closest(".imgfield").querySelector(".imgprev").style.backgroundImage = inp.value ? `url('${inp.value}')` : ""; }));
    fm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = {}; let bad = null;
      groups.flatMap((g) => g.fields).forEach((f) => {
        const el = fm.elements[f.k]; if (!el) return;
        let v = f.type === "bool" ? el.checked : el.value.trim();
        if (f.type === "number") v = v === "" ? null : +v;
        if (f.req && (v === "" || v === null)) bad = bad || f.label;
        if (f.type === "select" && v === "") v = null;
        out[f.k] = v;
      });
      if (bad) { toast(`Preencha: ${bad}`, "err"); return; }
      const btn = U.$("button[type=submit]", fm); btn.disabled = true; btn.textContent = "Salvando…";
      try { await onSave(out); closeModal(); } catch (err) { toast(err.message, "err"); btn.disabled = false; btn.textContent = saveLabel; }
    });
    if (onDelete) U.$("[data-del]", fm).addEventListener("click", () => confirmBox("Excluir este item?", "Essa ação não pode ser desfeita.", onDelete));
  }
  function confirmBox(title, text, onOk) {
    const m = modal(`<div class="confirm"><h2>${U.esc(title)}</h2><p class="muted">${U.esc(text)}</p><div class="form-actions"><span></span><div><button class="btn ghost" data-x>Cancelar</button><button class="btn danger" data-ok>Excluir</button></div></div></div>`);
    U.$("[data-ok]", m).addEventListener("click", async () => { try { await onOk(); closeModal(); } catch (e) { toast(e.message, "err"); } });
  }

  window.APA = { U, API, Store, Charts, toast, modal, closeModal, form, confirmBox, animateNumbers, USE_SUPABASE };
})();
