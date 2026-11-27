// Dates d'examen — code de l'appli.
// Sécurité : refuse d'être affichée dans le cadre (iframe) d'un autre site.
if (window.top !== window.self) { try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.innerHTML = ""; } }

(function () {
  const $ = (id) => document.getElementById(id);
  const ACCS = ["Towfiq", "Manel", "Monim", "Selim", "Walid", "Selma"];
  const PAYS = [["W", "payeW"], ["B", "payeB"], ["S", "payeS"]];
  const PAYS_B = [["S", "payeS"]];
  // Accompagnateurs classés par nombre d'examens (celui qui en fait le plus en premier)
  function accCounts() { const c = new Map(); ACCS.forEach(a => c.set(a, 0)); rows.forEach(r => { const a = (r.accompagnateur || "").trim(); if (a) c.set(a, (c.get(a) || 0) + 1); }); return c; }
  function accsSorted() { const c = accCounts(); return [...c.keys()].sort((a, b) => c.get(b) - c.get(a) || (ACCS.indexOf(a) < 0 ? 99 : ACCS.indexOf(a)) - (ACCS.indexOf(b) < 0 ? 99 : ACCS.indexOf(b))); }
  function accRank(a) { return accsSorted().indexOf(a); }
  const paysOf = (r) => r.type === "B" ? PAYS_B : PAYS;
  // Deux carnets : les examens et les « dates B » (même fonctionnement, paiement S seulement)
  let mode = "exam";
  try { if (localStorage.getItem("examens_mode") === "B") mode = "B"; } catch (e) {}
  let allRows = [];
  const inMode = (r) => mode === "B" ? r.type === "B" : r.type !== "B";
  const nom1 = () => mode === "B" ? "date B" : "examen";
  const noun = (n) => n + " " + (mode === "B" ? (n > 1 ? "dates B" : "date B") : (n > 1 ? "examens" : "examen"));
  const LIEUX = ["Gennevilliers", "Noisy", "Bobigny", "Créteil"];
  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let col = null, rows = [], loaded = false, canWrite = true, view = "next";
  let editingId = null, selAcc = "", selLieu = "", delArmed = false;

  const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysUntil = (s) => Math.round((parse(s) - parse(todayStr())) / 86400000);
  const shortDate = (s) => { const [y, m, d] = s.split("-").map(Number); return d + " " + MONTHS[m - 1] + (y !== new Date().getFullYear() ? " " + y : ""); };
  const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const TBD = "Élève à définir";
  const nameOf = (r) => (r.eleve && r.eleve.trim()) ? r.eleve : TBD;
  const noName = (r) => !(r.eleve && r.eleve.trim());
  const noAcc = (r) => !(r.accompagnateur && r.accompagnateur.trim());
  const incomplet = (r) => noName(r) || noAcc(r);
  function manque(list) {
    const a = list.filter(noName).length, b = list.filter(noAcc).length, parts = [];
    if (a) parts.push(a + " sans nom");
    if (b) parts.push(b + " sans accompagnateur");
    return parts;
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function colorFor(name) { const i = ACCS.indexOf(name); if (i >= 0) return COLORS[i]; let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
  function avatar(name) { const a = el("span", "avatar", (name || "?").charAt(0).toUpperCase()); a.style.background = colorFor(name || "?"); a.setAttribute("aria-hidden", "true"); return a; }
  function toast(text) { const t = el("div", "toast", text); t.setAttribute("role", "status"); document.body.append(t); setTimeout(() => t.remove(), 1800); }

  function render() {
    if (!loaded) return;
    curKeys = [];
    updateRedoTab();
    const list = $("list");
    const today = todayStr();
    const next = rows.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = rows.filter(r => r.date < today).sort((a, b) => b.date.localeCompare(a.date));
    const unpaid = rows.filter(r => paysOf(r).some(([, f]) => r[f] !== true)).length; // élèves qui n'ont pas tout payé
    $("summary").textContent = (next.length === 0 ? (mode === "B" ? "Aucune date B à venir" : "Aucun examen à venir") : noun(next.length) + " à venir")
      + (rows.length ? (unpaid ? " · " + unpaid + " élève" + (unpaid > 1 ? "s" : "") + " à payer" : " · tout est payé 🎉") : "")
      + manque(next).map(x => " · " + x).join("");
    const dateIn = (n) => { const t = new Date(); t.setDate(t.getDate() + n); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
    const bientot = rows.filter(r => r.date >= today && r.date <= dateIn(2) && incomplet(r));
    const ban = $("banner");
    ban.hidden = !bientot.length;
    if (bientot.length) {
      const first = bientot.reduce((m, r) => r.date < m ? r.date : m, bientot[0].date);
      const quand = first === today ? "aujourd'hui" : first === dateIn(1) ? "demain" : "dans 2 jours";
      ban.textContent = "⚠️ Examens à compléter d'ici 2 jours (le 1er : " + quand + ") : " + manque(bientot).join(", ") + ". Pensez à les remplir !";
    }
    list.replaceChildren();
    if (norm($("search").value)) { renderSearch(list, today); return; }
    if (view === "month") { renderMonths(list, today); return; }
    if (view === "acc") { renderAccs(list, today, false); return; }
    if (view === "lieu") { renderAccs(list, today, true); return; }
    if (view === "pay") { renderPay(list, today); return; }
    if (view === "redo") { renderRedo(list, today); return; }
    if (view === "date") { renderDates(list, today); return; }
    const items = view === "next" ? next : past;
    if (!items.length) {
      const e = el("div", "empty");
      e.append(el("div", "big", view === "next" ? "🚦" : "🏁"));
      e.append(el("p", null, view === "next" ? (rows.length ? "Aucun examen à venir." : "Aucun examen pour l'instant.") + (canWrite ? " Touchez « Nouvel examen » pour en ajouter un." : "") : "Aucun examen passé."));
      list.append(e);
      return;
    }
    foldTools(list);
    const byD = new Map();
    items.forEach(r => { if (!byD.has(r.date)) byD.set(r.date, []); byD.get(r.date).push(r); });
    [...byD.keys()].forEach(d => list.append(dateBox(d, byD.get(d), today, true, true)));
  }

  // ---------- vue « Par mois » ----------
  const MONTHS_FULL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  function renderMonths(list, today) {
    if (!rows.length) {
      const e = el("div", "empty"); e.append(el("div", "big", "📅"), el("p", null, "Aucun examen pour l'instant."));
      list.append(e); return;
    }
    const groups = new Map();
    rows.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
      const k = r.date.slice(0, 7);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const curMonth = today.slice(0, 7);
    const keys = [...groups.keys()];
    const coming = keys.filter(k => k >= curMonth);
    const gone = keys.filter(k => k < curMonth).reverse();
    foldTools(list);
    coming.forEach((k, i) => list.append(fold(monthBox(k, groups.get(k), today, k === curMonth), "m" + k, i < 2)));
    if (gone.length) {
      const d = el("details", "past-months");
      d.append(el("summary", null, "Mois passés (" + gone.length + ")"));
      gone.forEach(k => d.append(fold(monthBox(k, groups.get(k), today, false), "m" + k, false)));
      list.append(d);
    }
  }
  function monthBox(key, items, today, isCurrent) {
    const [y, m] = key.split("-").map(Number);
    const box = el("section", "month" + (isCurrent ? " current" : ""));
    const head = el("div", "month-head");
    const title = el("h2", null, MONTHS_FULL[m - 1] + " " + y);
    if (isCurrent) title.append(el("span", "now", "Ce mois-ci"));
    const unpaid = items.filter(r => paysOf(r).some(([, f]) => r[f] !== true)).length; // élèves qui n'ont pas tout payé
    const stats = el("div", "month-stats");
    stats.append(el("span", "pill", noun(items.length)));
    manque(items).forEach(x => stats.append(el("span", "pill tbdp", x)));
    const nR = items.filter(x => x.resultat === "reussi").length, nE = items.filter(x => x.resultat === "echec").length;
    if (nR) stats.append(el("span", "pill res-ok", nR + " réussi" + (nR > 1 ? "s" : "")));
    if (nE) stats.append(el("span", "pill res-ko", nE + " échec" + (nE > 1 ? "s" : "")));
    stats.append(el("span", "pill " + (unpaid ? "wait" : "ok"), unpaid ? unpaid + " élève" + (unpaid > 1 ? "s" : "") + " à payer" : "Tout payé ✓"));
    head.append(title, stats);
    box.append(head);
    box.append(accTotals(items));
    const ul = el("div", "mrows");
    items.forEach(r => ul.append(mrowEl(r, today, false)));
    box.append(ul);
    return box;
  }

  function mrowEl(r, today, byAcc, byLieu, payField) {
    const d = parse(r.date);
    const row = el("div", "mrow" + (r.date < today ? " past" : ""));
    const day = el("div", "mday");
    day.append(el("b", null, String(d.getDate())), el("span", null, byAcc ? MONTHS[d.getMonth()] : DAYS[d.getDay()]));
    const mid = el("div", "mmid");
    mid.append(el("div", "mname" + (noName(r) ? " tbd" : ""), nameOf(r)));
    const sub = el("div", "msub");
    if (byAcc) sub.append(el("span", null, DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear()));
    else if (r.accompagnateur) { const a = el("span"); a.append(avatar(r.accompagnateur), r.accompagnateur); sub.append(a); } else sub.append(el("span", "tbd", "👤 À définir"));
    if (byLieu) { if (r.accompagnateur) { const a = el("span"); a.append(avatar(r.accompagnateur), r.accompagnateur); sub.append(a); } else sub.append(el("span", "tbd", "👤 À définir")); }
    else if (r.lieu) sub.append(el("span", null, "📍 " + r.lieu));
    mid.append(sub);
    if (byAcc && byLieu === null) { if (r.accompagnateur) { const a = el("span"); a.append(avatar(r.accompagnateur), r.accompagnateur); sub.prepend(a); } }
    const dots = el("div", "mdots");
    paysOf(r).forEach(([lbl, f]) => { const t = el("span", "mdot" + (r[f] === true ? " paid" : ""), lbl); t.title = "Paiement " + lbl + (r[f] === true ? " : payé" : " : pas payé"); dots.append(t); });
    if (payField && canWrite) {
      const b = el("button", "paynow", "✓ Payé");
      b.type = "button"; b.setAttribute("aria-label", "Marquer le paiement " + payField.slice(-1) + " payé pour " + nameOf(r));
      b.onclick = (e) => { e.stopPropagation(); togglePay(r, payField); };
      row.append(day, mid, b);
    } else {
      if (r.resultat) dots.prepend(el("span", "mres " + r.resultat, r.resultat === "reussi" ? "✓" : "✗"));
      row.append(day, mid, dots);
    }
    if (canWrite) { row.tabIndex = 0; row.onclick = () => openSheet(r); row.onkeydown = (e) => { if (e.key === "Enter") openSheet(r); }; }
    return row;
  }

  // Totaux : par accompagnateur (dans un mois) et par mois (pour un accompagnateur ou un lieu)
  function accTotals(items) {
    const line = el("div", "totals");
    line.append(el("span", "totals-lbl", "Par accompagnateur :"));
    const counts = new Map();
    items.forEach(r => { const k = (r.accompagnateur && r.accompagnateur.trim()) || ""; counts.set(k, (counts.get(k) || 0) + 1); });
    const order = [...counts.keys()].filter(Boolean).sort((a, b) => counts.get(b) - counts.get(a) || accRank(a) - accRank(b));
    order.forEach(a => { const c = el("span", "tot"); c.append(avatar(a), a + " ", el("b", null, String(counts.get(a)))); line.append(c); });
    if (counts.has("")) { const c = el("span", "tot tbd"); c.append("👤 À définir ", el("b", null, String(counts.get("")))); line.append(c); }
    return line;
  }
  function appendByMonth(ul, items, today, parLieu) {
    let cur = null;
    items.forEach(r => {
      const k = r.date.slice(0, 7);
      if (k !== cur) {
        cur = k;
        const n = items.filter(x => x.date.slice(0, 7) === k).length;
        const [y, m] = k.split("-").map(Number);
        const h = el("div", "msep");
        h.append(el("span", null, MONTHS_FULL[m - 1] + " " + y), el("b", null, noun(n)));
        ul.append(h);
      }
      ul.append(mrowEl(r, today, true, parLieu));
    });
  }

  // ---------- déplier / replier (dans tous les onglets) ----------
  const foldState = new Map(); let curKeys = [];
  const fkey = (k) => mode + "|" + view + "|" + k;
  function track(det, k, def) {
    const key = fkey(k); curKeys.push(key);
    det.open = foldState.has(key) ? foldState.get(key) : false; // fermé par défaut
    det.addEventListener("toggle", () => foldState.set(key, det.open));
    return det;
  }
  // Transforme un cadre (titre + contenu) en cadre qui se déplie / se replie
  function fold(box, k, def) {
    const det = el("details", box.className + " fold");
    const sum = el("summary");
    const head = box.firstChild;
    sum.append(head, el("span", "chev", "▾"));
    det.append(sum);
    while (box.firstChild) det.append(box.firstChild);
    return track(det, k, def);
  }
  function foldTools(list) {
    const bar = el("div", "dtools");
    const openAll = el("button", "linkbtn", "Tout déplier"); openAll.type = "button";
    openAll.onclick = () => { curKeys.forEach(k => foldState.set(k, true)); render(); };
    const closeAll = el("button", "linkbtn", "Tout replier"); closeAll.type = "button";
    closeAll.onclick = () => { curKeys.forEach(k => foldState.set(k, false)); render(); };
    bar.append(openAll, closeAll);
    list.append(bar);
  }

  // ---------- vue « Par date » : chaque date se déplie / se replie ----------
  function dateBox(date, items, today, def, asCards) {
    const d = parse(date);
    const det = track(el("details", "datebox" + (date < today ? " past" : "") + (asCards ? " cards" : "")), "d" + date, def);
    const sum = el("summary");
    const left = el("div", "dleft");
    const jour = DAYS[d.getDay()];
    left.append(el("b", null, jour.charAt(0).toUpperCase() + jour.slice(1) + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear()));
    const lieux = [...new Set(items.map(x => x.lieu).filter(Boolean))];
    if (lieux.length) left.append(el("span", "dinfo", "📍 " + lieux.join(", ")));
    const right = el("div", "dright");
    right.append(el("span", "dcount", items.length + " élève" + (items.length > 1 ? "s" : "")));
    if (date >= today) { const n = daysUntil(date); right.append(el("span", "pill nextp", n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : "J-" + n)); }
    const unpaid = items.filter(r => paysOf(r).some(([, f]) => r[f] !== true)).length; // élèves qui n'ont pas tout payé
    if (unpaid) right.append(el("span", "pill res-ko", unpaid + " élève" + (unpaid > 1 ? "s" : "") + " à payer"));
    const inc = items.filter(incomplet).length;
    if (inc) right.append(el("span", "pill tbdp", inc + " à compléter"));
    sum.append(left, right, el("span", "chev", "▾"));
    det.append(sum);
    if (asCards) { const wrapc = el("div", "dcards"); items.forEach(r => wrapc.append(card(r, r.date < today))); det.append(wrapc); }
    else { const ul = el("div", "mrows"); items.forEach(r => ul.append(mrowEl(r, today, false))); det.append(ul); }
    return det;
  }
  function renderDates(list, today) {
    if (!rows.length) { const e = el("div", "empty"); e.append(el("div", "big", "📅"), el("p", null, "Aucune date pour l'instant.")); list.append(e); return; }
    const by = new Map();
    rows.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.eleve || "").localeCompare(b.eleve || "")).forEach(r => { if (!by.has(r.date)) by.set(r.date, []); by.get(r.date).push(r); });
    const dates = [...by.keys()];
    const next = dates.filter(d => d >= today), past = dates.filter(d => d < today).reverse();
    foldTools(list);
    next.forEach((d, i) => list.append(dateBox(d, by.get(d), today, i === 0)));
    if (!next.length) list.append(el("p", "hint", "Aucune date à venir."));
    if (past.length) {
      const pd = el("details", "past-months");
      pd.append(el("summary", null, "Dates passées (" + past.length + ")"));
      past.forEach(d => pd.append(dateBox(d, by.get(d), today, false)));
      list.append(pd);
    }
  }

  // ---------- recherche d'un élève (dans les 2 carnets) ----------
  function renderSearch(list, today) {
    const q = norm($("search").value);
    const found = allRows.filter(r => norm(r.eleve).includes(q));
    if (!found.length) {
      const e = el("div", "empty"); e.append(el("div", "big", "🔍"), el("p", null, "Aucun élève trouvé pour « " + $("search").value.trim() + " »."));
      list.append(e); return;
    }
    const groups = new Map();
    found.forEach(r => { const k = norm(r.eleve); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    [...groups.values()].sort((a, b) => a[0].eleve.localeCompare(b[0].eleve)).forEach(items => {
      items.sort((a, b) => a.date.localeCompare(b.date));
      const box = el("section", "month");
      const head = el("div", "month-head");
      head.append(el("h2", null, items[0].eleve));
      const stats = el("div", "month-stats");
      const nR = items.filter(x => x.resultat === "reussi").length, nE = items.filter(x => x.resultat === "echec").length;
      const next = items.find(x => x.date >= today);
      if (next) { const n = daysUntil(next.date); stats.append(el("span", "pill nextp", n === 0 ? "Examen aujourd'hui" : n === 1 ? "Examen demain" : "Prochain dans " + n + " j")); }
      if (nR) stats.append(el("span", "pill res-ok", nR + " réussi" + (nR > 1 ? "s" : "")));
      if (nE) stats.append(el("span", "pill res-ko", nE + " échec" + (nE > 1 ? "s" : "")));
      if (!next && !nR && !nE) stats.append(el("span", "pill", "Aucun examen à venir"));
      head.append(stats);
      box.append(head);
      const ul = el("div", "mrows search-list");
      items.forEach(r => {
        const row = mrowEl(r, today, true, null);
        const sub = row.querySelector(".msub");
        sub.prepend(el("span", "kind" + (r.type === "B" ? " b" : ""), r.type === "B" ? "Date B" : "Examen"));
        if (r.resultat) sub.append(el("span", r.resultat === "reussi" ? "okline" : "koline", r.resultat === "reussi" ? "✓ Réussi" : "✗ Échec"));
        else if (r.date >= today) { const n = daysUntil(r.date); sub.append(el("span", "nextline", n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : "Dans " + n + " jours")); }
        else sub.append(el("span", "tbd", "Résultat non noté"));
        ul.append(row);
      });
      box.append(ul);
      list.append(box);
    });
  }

  // ---------- vue « À repasser » (échecs) ----------
  const norm = (t) => (t || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  // Un échec est « reprogrammé » si le même élève a un examen plus tard dans le même carnet.
  function relance(r) {
    if (noName(r)) return null;
    const n = norm(r.eleve);
    return rows.filter(x => x.id !== r.id && x.date > r.date && norm(x.eleve) === n).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }
  function echecsAFaire() { return rows.filter(r => r.resultat === "echec" && !relance(r)); }
  function updateRedoTab() {
    const n = echecsAFaire().length;
    $("tabRedo").textContent = "À repasser" + (n ? " (" + n + ")" : "");
    $("tabRedo").classList.toggle("alert", n > 0);
  }
  function renderRedo(list, today) {
    const echecs = rows.filter(r => r.resultat === "echec").sort((a, b) => a.date.localeCompare(b.date));
    const todo = echecs.filter(r => !relance(r)), done = echecs.filter(r => relance(r));
    const box = el("section", "month");
    const head = el("div", "month-head");
    head.append(el("h2", null, "À repasser"), el("span", "pill " + (todo.length ? "res-ko" : "res-ok"), todo.length ? todo.length + " à reprogrammer" : "Personne à reprogrammer ✓"));
    box.append(head);
    if (!echecs.length) box.append(el("p", "hint", "Quand vous cochez « ✗ Échec » sur un examen, l'élève apparaît ici pour reprogrammer son passage."));
    const ul = el("div", "mrows redo-list");
    todo.forEach(r => {
      const row = mrowEl(r, today, true, null);
      const nb = rows.filter(x => x.resultat === "echec" && norm(x.eleve) === norm(r.eleve) && !noName(r)).length;
      if (nb > 1) row.querySelector(".msub").append(el("span", "tbd", nb + " échecs"));
      const btn = el("button", "redobtn", "📅 Reprogrammer");
      btn.type = "button"; btn.disabled = !canWrite;
      btn.onclick = (e) => { e.stopPropagation(); reprogrammer(r); };
      row.querySelector(".mdots").replaceWith(btn);
      ul.append(row);
    });
    box.append(ul);
    list.append(box);
    if (done.length) {
      const d = el("details", "past-months");
      d.append(el("summary", null, "Déjà reprogrammés (" + done.length + ")"));
      const ul2 = el("div", "mrows");
      done.slice().reverse().forEach(r => {
        const row = mrowEl(r, today, true, null);
        const nx = relance(r), dd = parse(nx.date);
        row.querySelector(".msub").append(el("span", "okline", "→ repasse le " + dd.getDate() + " " + MONTHS[dd.getMonth()] + " " + dd.getFullYear()));
        ul2.append(row);
      });
      d.append(ul2);
      list.append(d);
    }
  }
  function reprogrammer(r) {
    openSheet(null);
    $("eleve").value = r.eleve || "";
    selAcc = r.accompagnateur || ""; selLieu = r.lieu || "";
    drawChips();
    const d = parse(r.date);
    $("commentaire").value = "Repassage (échec du " + d.getDate() + " " + MONTHS[d.getMonth()] + ")";
    $("sheetTitle").textContent = "Repassage de " + nameOf(r);
    $("placesField").hidden = true;
    setTimeout(() => $("date").focus(), 50);
  }

  // ---------- vue « Paiements en attente » ----------
  function renderPay(list, today) {
    foldTools(list);
    const pays = mode === "B" ? PAYS_B : PAYS;
    let total = 0;
    pays.forEach(([lbl, f]) => {
      const items = rows.filter(r => r[f] !== true).sort((a, b) => a.date.localeCompare(b.date));
      total += items.length;
      const box = el("section", "month");
      const head = el("div", "month-head");
      const title = el("h2"); title.append(el("span", "paybadge", lbl), "Paiement " + lbl);
      const stats = el("div", "month-stats");
      stats.append(el("span", "pill " + (items.length ? "wait" : "ok"), items.length ? items.length + " en attente" : "Tout payé ✓"));
      const late = items.filter(r => r.date < today).length;
      if (late) stats.append(el("span", "pill tbdp", late + " examen" + (late > 1 ? "s" : "") + " déjà passé" + (late > 1 ? "s" : "")));
      head.append(title, stats);
      box.append(head);
      if (items.length) {
        const ul = el("div", "mrows");
        items.forEach(r => ul.append(mrowEl(r, today, true, null, f)));
        box.append(ul);
      }
      list.append(fold(box, "p" + lbl, true));
    });
    if (!rows.length) { list.replaceChildren(); const e = el("div", "empty"); e.append(el("div", "big", "💶"), el("p", null, "Aucun examen pour l'instant.")); list.append(e); }
  }

  // ---------- vue « Par accompagnateur » ----------
  function renderAccs(list, today, parLieu) {
    if (rows.length) foldTools(list);
    if (!rows.length) {
      const e = el("div", "empty"); e.append(el("div", "big", parLieu ? "📍" : "👥"), el("p", null, "Aucun examen pour l'instant."));
      list.append(e); return;
    }
    const champ = parLieu ? "lieu" : "accompagnateur";
    const names = (parLieu ? LIEUX : accsSorted()).slice();
    rows.forEach(r => { if (r[champ] && !names.includes(r[champ])) names.push(r[champ]); });
    const groups = names.map(n => [n, rows.filter(r => r[champ] === n)]);
    const sans = rows.filter(r => !(r[champ] && r[champ].trim()));
    if (sans.length) groups.push(["", sans]);
    groups.forEach(([name, items]) => {
      const next = items.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const past = items.filter(r => r.date < today).sort((a, b) => b.date.localeCompare(a.date));
      const box = el("section", "month acc-box");
      const head = el("div", "month-head");
      const title = el("h2");
      if (name) { if (parLieu) title.append("📍 " + name); else title.append(avatar(name), name); }
      else title.append(el("span", "tbd", parLieu ? "📍 Lieu à définir" : "👤 À définir"));
      const stats = el("div", "month-stats");
      if (!parLieu && name) stats.append(el("span", "pill nextp", items.length + " au total"));
      stats.append(el("span", "pill", next.length ? next.length + " à venir" : "Aucun à venir"));
      if (past.length) stats.append(el("span", "pill", past.length + " passé" + (past.length > 1 ? "s" : "")));
      head.append(title, stats);
      box.append(head);
      if (next.length) {
        const ul = el("div", "mrows");
        appendByMonth(ul, next, today, parLieu);
        box.append(ul);
      }
      if (past.length) {
        const d = el("details", "acc-past");
        d.append(el("summary", null, "Voir les examens passés (" + past.length + ")"));
        const ul = el("div", "mrows");
        appendByMonth(ul, past, today, parLieu);
        d.append(ul);
        box.append(d);
      }
      list.append(fold(box, (parLieu ? "l" : "a") + name, true));
    });
  }

  function card(r, isPast) {
    const c = el("article", "card" + (isPast ? " past" : ""));
    const d = parse(r.date);
    const top = el("div", "top");
    const day = el("div", "day");
    day.append(el("div", "m", DAYS[d.getDay()]), el("div", "n", String(d.getDate())), el("div", "m", MONTHS[d.getMonth()]));
    const who = el("div", "who");
    const nr = el("div", "name-row");
    nr.append(el("span", "name" + (noName(r) ? " tbd" : ""), nameOf(r)));
    if (!isPast) {
      const n = daysUntil(r.date);
      nr.append(el("span", "count" + (n === 0 ? " today" : n <= 3 ? " hot" : ""), n === 0 ? "Aujourd'hui !" : n === 1 ? "Demain" : "J-" + n));
    }
    const tags = el("div", "tags");
    if (r.accompagnateur) { const t = el("span"); t.append(avatar(r.accompagnateur), r.accompagnateur); tags.append(t); } else tags.append(el("span", "tbd", "👤 Accompagnateur à définir"));
    if (r.lieu) tags.append(el("span", null, "📍 " + r.lieu));
    who.append(nr, tags);
    top.append(day, who);
    c.append(top);
    if (typeof r.commentaire === "string" && r.commentaire.trim()) c.append(el("div", "note", "💬 " + r.commentaire));
    const pays = el("div", "pays" + (r.type === "B" ? " one" : ""));
    paysOf(r).forEach(([lbl, field]) => {
      const paid = r[field] === true;
      const b = el("button", "pay" + (paid ? " paid" : ""));
      b.type = "button";
      const pd = r[field + "Date"];
      b.append(el("span", "lbl", lbl), el("span", "st", paid ? "✓ Payé" : "Pas payé"));
      if (paid && isDate(pd)) b.append(el("span", "when", "le " + shortDate(pd)));
      b.setAttribute("aria-pressed", paid ? "true" : "false");
      b.disabled = !canWrite;
      b.onclick = (e) => { e.stopPropagation(); togglePay(r, field); };
      pays.append(b);
    });
    c.append(el("div", "pays-title", "Paiements"), pays);
    // Résultat de l'examen
    const res = el("div", "res");
    [["reussi", "✓ Réussi"], ["echec", "✗ Échec"]].forEach(([v, txt]) => {
      const b = el("button", "resbtn " + v + (r.resultat === v ? " on" : ""), txt);
      b.type = "button"; b.disabled = !canWrite;
      b.setAttribute("aria-pressed", r.resultat === v ? "true" : "false");
      b.onclick = (e) => { e.stopPropagation(); setResultat(r, r.resultat === v ? null : v); };
      res.append(b);
    });
    c.append(el("div", "pays-title", "Résultat"), res);
    if (canWrite) { c.tabIndex = 0; c.onclick = () => openSheet(r); c.onkeydown = (e) => { if (e.key === "Enter" && e.target === c) openSheet(r); }; }
    return c;
  }

  async function setResultat(r, v) {
    try {
      await col.doc(r.id).update({ resultat: v ? v : firebase.firestore.FieldValue.delete() });
      if (v === "reussi") { confetti(); toast("Bravo " + nameOf(r) + " ! 🎉"); } else if (v === "echec") toast("Échec noté"); else toast("Résultat effacé");
    } catch (e) { toast("Le résultat n'a pas pu être enregistré"); }
  }
  const busy = new Set();
  async function togglePay(r, field) {
    const key = r.id + field; if (busy.has(key)) return; busy.add(key);
    const nowPaid = r[field] !== true;
    try {
      await col.doc(r.id).update({ [field]: nowPaid, [field + "Date"]: nowPaid ? todayStr() : null });
      if (nowPaid) {
        if (paysOf(r).every(([, f]) => f === field || r[f] === true)) { confetti(); toast("Tout est payé pour " + nameOf(r) + " 🎉"); }
        else toast("Paiement " + field.slice(-1) + " noté ✓");
      }
    } catch (e) { toast("Le paiement n'a pas pu être enregistré"); }
    finally { busy.delete(key); }
  }

  function renderChips(boxId, options, selected, onPick, withAvatar) {
    const box = $(boxId); box.replaceChildren();
    const opts = options.slice(); if (selected && !opts.includes(selected)) opts.push(selected);
    opts.forEach(o => {
      const b = el("button", "chip" + (withAvatar ? "" : " plain")); b.type = "button";
      if (withAvatar) b.append(avatar(o));
      b.append(withAvatar ? o : "📍 " + o);
      b.setAttribute("aria-pressed", o === selected ? "true" : "false");
      b.onclick = () => onPick(o);
      box.append(b);
    });
  }
  function drawChips() {
    renderChips("accChips", accsSorted(), selAcc, (v) => { selAcc = selAcc === v ? "" : v; drawChips(); }, true);
    renderChips("lieuChips", LIEUX, selLieu, (v) => { selLieu = v; drawChips(); }, false);
  }
  function openSheet(r) {
    editingId = r ? r.id : null; delArmed = false;
    $("eleve").value = r ? r.eleve : "";
    $("date").value = r ? r.date : "";
    $("commentaire").value = r && typeof r.commentaire === "string" ? r.commentaire : "";
    selAcc = r ? (r.accompagnateur || "") : ""; selLieu = r ? (r.lieu || "") : "";
    $("sheetTitle").textContent = r ? (r.type === "B" ? "Modifier la date B" : "Modifier l'examen") : (mode === "B" ? "Nouvelle date B" : "Nouvel examen");
    $("saveBtn").textContent = r ? "Enregistrer" : "Ajouter";
    $("delBtn").hidden = !r; $("delBtn").classList.remove("sure"); $("delBtn").textContent = "Supprimer";
    $("formMsg").textContent = "";
    places = 1; $("placesField").hidden = !!r; $("placesN").textContent = "1";
    $("addSameBtn").hidden = !r; sheetRow = r || null;
    drawChips();
    $("overlay").hidden = false;
    if (r && incomplet(r) && noName(r)) setTimeout(() => $("eleve").focus(), 50);
  }
  let places = 1, sheetRow = null;
  // Nouvel élève au même examen : reprend la date, le lieu et l'accompagnateur
  $("addSameBtn").onclick = () => {
    const src = sheetRow; if (!src) return;
    openSheet(null);
    $("date").value = src.date; selLieu = src.lieu || ""; selAcc = src.accompagnateur || "";
    drawChips();
    const d = parse(src.date);
    $("sheetTitle").textContent = "Nouvel élève le " + d.getDate() + " " + MONTHS[d.getMonth()] + (src.lieu ? " à " + src.lieu : "");
    setTimeout(() => $("eleve").focus(), 50);
  };
  $("placesMinus").onclick = () => { places = Math.max(1, places - 1); $("placesN").textContent = String(places); };
  $("placesPlus").onclick = () => { places = Math.min(10, places + 1); $("placesN").textContent = String(places); };
  function closeSheet() { $("overlay").hidden = true; editingId = null; }

  $("fab").onclick = () => openSheet(null);
  $("cancelBtn").onclick = closeSheet;
  $("overlay").addEventListener("click", (e) => { if (e.target === $("overlay")) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("overlay").hidden) closeSheet(); });
  $("tabNext").onclick = () => setView("next");
  $("tabPast").onclick = () => setView("past");
  $("tabMonth").onclick = () => setView("month");
  $("tabAcc").onclick = () => setView("acc");
  function setMode(m) {
    mode = m;
    try { localStorage.setItem("examens_mode", m); } catch (e) {}
    $("modeExam").setAttribute("aria-selected", String(m === "exam"));
    $("modeB").setAttribute("aria-selected", String(m === "B"));
    $("appTitle").firstChild.textContent = m === "B" ? "Dates B " : "Dates d'examen ";
    $("fabLbl").textContent = m === "B" ? "Nouvelle date B" : "Nouvel examen";
    rows = allRows.filter(inMode);
    render();
  }
  $("modeExam").onclick = () => setMode("exam");
  $("modeB").onclick = () => setMode("B");
  setMode(mode);
  $("tabLieu").onclick = () => setView("lieu");
  $("tabPay").onclick = () => setView("pay");
  $("tabRedo").onclick = () => setView("redo");
  $("tabDate").onclick = () => setView("date");
  $("search").addEventListener("input", () => { $("searchClear").hidden = !$("search").value; render(); });
  $("searchClear").onclick = () => { $("search").value = ""; $("searchClear").hidden = true; render(); $("search").focus(); };
  function setViewClear(v) { if ($("search").value) { $("search").value = ""; $("searchClear").hidden = true; } }
  function setView(v) {
    setViewClear(v);
    view = v;
    [["tabNext", "next"], ["tabPast", "past"], ["tabMonth", "month"], ["tabAcc", "acc"], ["tabLieu", "lieu"], ["tabPay", "pay"], ["tabRedo", "redo"], ["tabDate", "date"]].forEach(([id, k]) => $(id).setAttribute("aria-selected", String(v === k)));
    render();
  }

  $("delBtn").onclick = async () => {
    if (!delArmed) { delArmed = true; $("delBtn").classList.add("sure"); $("delBtn").textContent = "Oui, supprimer"; return; }
    const id = editingId; closeSheet();
    try { await col.doc(id).delete(); toast(mode === "B" ? "Date B supprimée" : "Examen supprimé"); } catch (e) { toast("La suppression a échoué"); }
  };

  $("sheet").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!col) { $("formMsg").textContent = "Connectez-vous d'abord."; return; }
    const data = { eleve: $("eleve").value.trim(), accompagnateur: selAcc, lieu: selLieu, date: $("date").value, commentaire: $("commentaire").value.trim() };
    const missing = [!data.lieu && "le lieu", !data.date && "la date"].filter(Boolean);
    if (missing.length) { $("formMsg").textContent = "Il manque " + missing.join(", ") + "."; return; }
    $("saveBtn").disabled = true;
    try {
      if (editingId) { await col.doc(editingId).update(Object.assign(data, { modifieLe: firebase.firestore.FieldValue.serverTimestamp() })); toast("Modifié ✓"); }
      else {
        const pf = mode === "B" ? { type: "B", payeS: false } : { payeW: false, payeB: false, payeS: false };
        const base = Object.assign(data, pf, { creeLe: firebase.firestore.FieldValue.serverTimestamp(), creePar: (auth.currentUser && auth.currentUser.email) || "" });
        if (places > 1) {
          const batch = fs.batch();
          for (let i = 0; i < places; i++) batch.set(col.doc(), i === 0 ? base : Object.assign({}, base, { eleve: "" }));
          await batch.commit();
          toast(places + " places ajoutées 🚗");
        } else { await col.add(base); toast((mode === "B" ? "Date B ajoutée" : "Examen ajouté") + (data.eleve && data.accompagnateur ? " 🚗" : ", à compléter plus tard 🚗")); }
        if (view === "past" && data.date >= todayStr()) setView("next");
      }
      closeSheet();
    } catch (err) {
      if (err && /permission/i.test(err.code + " " + err.message)) $("formMsg").textContent = "Ce compte ne peut pas modifier la liste.";
      else $("formMsg").textContent = "L'enregistrement a échoué. Réessayez.";
    } finally { $("saveBtn").disabled = false; }
  });

  function confetti() {
    if (reduce) return;
    const cv = $("confetti"); cv.hidden = false;
    const ctx = cv.getContext("2d"); const W = cv.width = innerWidth, H = cv.height = innerHeight;
    const ps = Array.from({ length: 90 }, () => ({ x: W / 2, y: H * 0.6, vx: (Math.random() - .5) * 12, vy: -Math.random() * 14 - 6, r: Math.random() * 6 + 4, c: COLORS[Math.floor(Math.random() * 6)], a: Math.random() * 6 }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += .45; p.x += p.vx; p.y += p.vy; p.a += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (++t < 90) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
    })();
  }

  // ---------- connexion et données (Firebase) ----------
  let fs = null, auth = null, unsub = null;
  function showLogin(text) {
    $("app").hidden = true; $("login").hidden = false; $("fab").hidden = true;
    $("loginMsg").textContent = text || "";
  }
  function showApp(user) {
    $("login").hidden = true; $("app").hidden = false; $("fab").hidden = !canWrite;
    $("userMail").textContent = user.email || "";
  }
  function startCloud() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || !window.firebase) { $("setup").hidden = false; return; }
    firebase.initializeApp(cfg);
    auth = firebase.auth(); fs = firebase.firestore();
    fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    auth.onAuthStateChanged((u) => {
      if (unsub) { unsub(); unsub = null; }
      rows = []; loaded = false; col = null;
      if (!u) { showLogin(""); return; }
      canWrite = true; showApp(u);
      $("summary").textContent = "Chargement…"; $("list").replaceChildren();
      col = fs.collection("dates_examen");
      unsub = col.onSnapshot((snap) => {
        loaded = true;
        allRows = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(r => typeof r.eleve === "string" && isDate(r.date));
        rows = allRows.filter(inMode);
        render();
      }, (err) => {
        loaded = true;
        if (/permission/i.test((err && (err.code + " " + err.message)) || "")) {
          auth.signOut();
          showLogin("Ce compte n'a pas accès aux dates d'examen.");
        } else { $("summary").textContent = "Impossible de charger la liste. Vérifiez la connexion."; }
      });
    });
  }
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const mail = $("loginEmail").value.trim(), pass = $("loginPass").value;
    if (!mail || !pass) { $("loginMsg").textContent = "Entrez votre e-mail et votre mot de passe."; return; }
    $("loginBtn").disabled = true; $("loginMsg").textContent = "";
    try { await auth.signInWithEmailAndPassword(mail, pass); $("loginPass").value = ""; }
    catch (err) {
      const c = (err && err.code) || "";
      $("loginMsg").textContent = /wrong-password|invalid-credential|user-not-found|invalid-login/.test(c) ? "E-mail ou mot de passe incorrect."
        : /too-many-requests/.test(c) ? "Trop d'essais. Réessayez dans quelques minutes."
        : /network/.test(c) ? "Pas de connexion internet."
        : /unauthorized-domain/.test(c) ? "Ce site n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés)."
        : /user-disabled/.test(c) ? "Ce compte a été désactivé." : "Connexion impossible. Réessayez.";
    } finally { $("loginBtn").disabled = false; }
  });
  $("forgotBtn").onclick = async () => {
    const mail = $("loginEmail").value.trim();
    if (!mail) { $("loginMsg").textContent = "Écrivez d'abord votre e-mail, puis touchez « Mot de passe oublié »."; return; }
    try { await auth.sendPasswordResetEmail(mail); $("loginMsg").textContent = "Un e-mail pour changer le mot de passe vient d'être envoyé."; }
    catch (err) { $("loginMsg").textContent = "Envoi impossible. Vérifiez l'adresse e-mail."; }
  };
  $("logoutBtn").onclick = async () => {
    if (unsub) { unsub(); unsub = null; }
    try { await auth.signOut(); } catch (_) {}
    try { await fs.terminate(); await fs.clearPersistence(); } catch (_) {}
    location.reload();
  };
  startCloud();
})();

// Installation hors connexion (service worker)
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
