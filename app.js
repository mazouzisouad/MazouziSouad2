// Dates d'examen — code de l'appli.
// Sécurité : refuse d'être affichée dans le cadre (iframe) d'un autre site.
if (window.top !== window.self) { try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.innerHTML = ""; } }

(function () {
  const $ = (id) => document.getElementById(id);
  const ACCS = ["Towfiq", "Manel", "Monim", "Selim", "Walid", "Selma"];
  const PAYS = [["W", "payeW"], ["B", "payeB"], ["S", "payeS"]];
  const LIEUX = ["Gennevilliers", "Noisy", "Bobigny"];
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
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function colorFor(name) { const i = ACCS.indexOf(name); if (i >= 0) return COLORS[i]; let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
  function avatar(name) { const a = el("span", "avatar", (name || "?").charAt(0).toUpperCase()); a.style.background = colorFor(name || "?"); a.setAttribute("aria-hidden", "true"); return a; }
  function toast(text) { const t = el("div", "toast", text); t.setAttribute("role", "status"); document.body.append(t); setTimeout(() => t.remove(), 1800); }

  function render() {
    if (!loaded) return;
    const list = $("list");
    const today = todayStr();
    const next = rows.filter(r => r.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = rows.filter(r => r.date < today).sort((a, b) => b.date.localeCompare(a.date));
    const unpaid = rows.reduce((n, r) => n + PAYS.filter(([, f]) => r[f] !== true).length, 0);
    $("summary").textContent = (next.length === 0 ? "Aucun examen à venir" : next.length + " examen" + (next.length > 1 ? "s" : "") + " à venir")
      + (rows.length ? (unpaid ? " · " + unpaid + " paiement" + (unpaid > 1 ? "s" : "") + " en attente" : " · tout est payé 🎉") : "");
    const items = view === "next" ? next : past;
    list.replaceChildren();
    if (!items.length) {
      const e = el("div", "empty");
      e.append(el("div", "big", view === "next" ? "🚦" : "🏁"));
      e.append(el("p", null, view === "next" ? (rows.length ? "Aucun examen à venir." : "Aucun examen pour l'instant.") + (canWrite ? " Touchez « Nouvel examen » pour en ajouter un." : "") : "Aucun examen passé."));
      list.append(e);
      return;
    }
    items.forEach(r => list.append(card(r, r.date < today)));
  }

  function card(r, isPast) {
    const c = el("article", "card" + (isPast ? " past" : ""));
    const d = parse(r.date);
    const top = el("div", "top");
    const day = el("div", "day");
    day.append(el("div", "m", DAYS[d.getDay()]), el("div", "n", String(d.getDate())), el("div", "m", MONTHS[d.getMonth()]));
    const who = el("div", "who");
    const nr = el("div", "name-row");
    nr.append(el("span", "name", r.eleve));
    if (!isPast) {
      const n = daysUntil(r.date);
      nr.append(el("span", "count" + (n === 0 ? " today" : n <= 3 ? " hot" : ""), n === 0 ? "Aujourd'hui !" : n === 1 ? "Demain" : "J-" + n));
    }
    const tags = el("div", "tags");
    if (r.accompagnateur) { const t = el("span"); t.append(avatar(r.accompagnateur), r.accompagnateur); tags.append(t); }
    if (r.lieu) tags.append(el("span", null, "📍 " + r.lieu));
    who.append(nr, tags);
    top.append(day, who);
    c.append(top);
    if (typeof r.commentaire === "string" && r.commentaire.trim()) c.append(el("div", "note", "💬 " + r.commentaire));
    const pays = el("div", "pays");
    PAYS.forEach(([lbl, field]) => {
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
    if (canWrite) { c.tabIndex = 0; c.onclick = () => openSheet(r); c.onkeydown = (e) => { if (e.key === "Enter" && e.target === c) openSheet(r); }; }
    return c;
  }

  const busy = new Set();
  async function togglePay(r, field) {
    const key = r.id + field; if (busy.has(key)) return; busy.add(key);
    const nowPaid = r[field] !== true;
    try {
      await col.doc(r.id).update({ [field]: nowPaid, [field + "Date"]: nowPaid ? todayStr() : null });
      if (nowPaid) {
        if (PAYS.every(([, f]) => f === field || r[f] === true)) { confetti(); toast("Tout est payé pour " + r.eleve + " 🎉"); }
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
    renderChips("accChips", ACCS, selAcc, (v) => { selAcc = v; drawChips(); }, true);
    renderChips("lieuChips", LIEUX, selLieu, (v) => { selLieu = v; drawChips(); }, false);
  }
  function openSheet(r) {
    editingId = r ? r.id : null; delArmed = false;
    $("eleve").value = r ? r.eleve : "";
    $("date").value = r ? r.date : "";
    $("commentaire").value = r && typeof r.commentaire === "string" ? r.commentaire : "";
    selAcc = r ? (r.accompagnateur || "") : ""; selLieu = r ? (r.lieu || "") : "";
    $("sheetTitle").textContent = r ? "Modifier l'examen" : "Nouvel examen";
    $("saveBtn").textContent = r ? "Enregistrer" : "Ajouter";
    $("delBtn").hidden = !r; $("delBtn").classList.remove("sure"); $("delBtn").textContent = "Supprimer";
    $("formMsg").textContent = "";
    drawChips();
    $("overlay").hidden = false;
    if (!r) setTimeout(() => $("eleve").focus(), 50);
  }
  function closeSheet() { $("overlay").hidden = true; editingId = null; }

  $("fab").onclick = () => openSheet(null);
  $("cancelBtn").onclick = closeSheet;
  $("overlay").addEventListener("click", (e) => { if (e.target === $("overlay")) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("overlay").hidden) closeSheet(); });
  $("tabNext").onclick = () => setView("next");
  $("tabPast").onclick = () => setView("past");
  function setView(v) { view = v; $("tabNext").setAttribute("aria-selected", String(v === "next")); $("tabPast").setAttribute("aria-selected", String(v === "past")); render(); }

  $("delBtn").onclick = async () => {
    if (!delArmed) { delArmed = true; $("delBtn").classList.add("sure"); $("delBtn").textContent = "Oui, supprimer"; return; }
    const id = editingId; closeSheet();
    try { await col.doc(id).delete(); toast("Examen supprimé"); } catch (e) { toast("La suppression a échoué"); }
  };

  $("sheet").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!col) { $("formMsg").textContent = "Connectez-vous d'abord."; return; }
    const data = { eleve: $("eleve").value.trim(), accompagnateur: selAcc, lieu: selLieu, date: $("date").value, commentaire: $("commentaire").value.trim() };
    const missing = [!data.eleve && "l'élève", !data.accompagnateur && "l'accompagnateur", !data.lieu && "le lieu", !data.date && "la date"].filter(Boolean);
    if (missing.length) { $("formMsg").textContent = "Il manque " + missing.join(", ") + "."; return; }
    $("saveBtn").disabled = true;
    try {
      if (editingId) { await col.doc(editingId).update(Object.assign(data, { modifieLe: firebase.firestore.FieldValue.serverTimestamp() })); toast("Examen modifié ✓"); }
      else { await col.add(Object.assign(data, { payeW: false, payeB: false, payeS: false, creeLe: firebase.firestore.FieldValue.serverTimestamp(), creePar: (auth.currentUser && auth.currentUser.email) || "" })); toast("Examen ajouté 🚗"); if (data.date >= todayStr()) setView("next"); }
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
        rows = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(r => typeof r.eleve === "string" && isDate(r.date));
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
