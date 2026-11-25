// Rappel de la veille : prévient (notification ntfy) s'il y a demain des examens sans nom d'élève.
// Lancé chaque jour vers 10h (heure de Paris) par GitHub Actions. Aucune donnée d'élève n'est écrite dans les journaux.
const API_KEY = 'AIzaSyBuPC4GpVpRiOMQT1dZ6P8drNwg1OTcr0c';
const PROJECT = 'exams-1101c';
const SITE = 'https://mazouzisouad.github.io/MazouziSouad2/';
const { ROBOT_EMAIL, ROBOT_PASSWORD, NTFY_TOPIC, SCHEDULE = '', EVENT = '' } = process.env;

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function parisParts(d) {
  const f = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour };
}

async function main() {
  if (!ROBOT_EMAIL || !ROBOT_PASSWORD || !NTFY_TOPIC) throw new Error('Secrets manquants (ROBOT_EMAIL, ROBOT_PASSWORD, NTFY_TOPIC).');
  const now = new Date();
  const test = EVENT === 'workflow_dispatch';
  // Deux horaires programmés (8h et 9h UTC) : on ne garde que celui qui tombe à 10h à Paris (été / hiver).
  if (!test) {
    const offset = parisParts(now).h - now.getUTCHours();
    const voulu = SCHEDULE.startsWith('0 8') ? 2 : 1;
    if (((offset + 24) % 24) !== voulu) { console.log('Pas le bon horaire aujourd\'hui (heure d\'été / d\'hiver), rien à faire.'); return; }
  }
  const t = parisParts(new Date(now.getTime() + 24 * 3600 * 1000));
  const demain = `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;

  const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ROBOT_EMAIL, password: ROBOT_PASSWORD, returnSecureToken: true }),
  });
  if (!auth.ok) throw new Error('Connexion du robot refusée (vérifiez ROBOT_EMAIL / ROBOT_PASSWORD).');
  const { idToken } = await auth.json();

  const q = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'dates_examen' }], where: { fieldFilter: { field: { fieldPath: 'date' }, op: 'EQUAL', value: { stringValue: demain } } } } }),
  });
  if (!q.ok) throw new Error('Lecture des examens impossible (' + q.status + ').');
  const docs = (await q.json()).filter((x) => x.document).map((x) => x.document.fields || {});
  const sansNom = docs.filter((f) => !(f.eleve && f.eleve.stringValue && f.eleve.stringValue.trim()));
  console.log(`Examens demain : ${docs.length}, sans nom : ${sansNom.length}`);

  const jour = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
  const quand = `${JOURS[jour.getUTCDay()]} ${t.d} ${MOIS[t.m - 1]}`;
  let titre, texte;
  if (sansNom.length) {
    const lieux = {};
    sansNom.forEach((f) => { const l = (f.lieu && f.lieu.stringValue) || 'lieu ?'; lieux[l] = (lieux[l] || 0) + 1; });
    titre = `Examens de demain : ${sansNom.length} sans nom`;
    texte = `Demain (${quand}), ${sansNom.length} examen${sansNom.length > 1 ? 's n\'ont' : ' n\'a'} pas encore de nom d'élève : `
      + Object.entries(lieux).map(([l, n]) => `${n} à ${l}`).join(', ') + '. Touchez pour compléter.';
  } else if (test) {
    titre = 'Rappel des examens : test réussi ✅';
    texte = `Tout fonctionne. Demain (${quand}) : ${docs.length} examen(s), aucun sans nom.`;
  } else { console.log('Rien à signaler.'); return; }

  const r = await fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`, {
    method: 'POST',
    headers: { Title: encodeURIComponent(titre), 'X-Title-Encoding': 'url', Tags: 'calendar,warning', Click: SITE, Priority: sansNom.length ? 'high' : 'default' },
    body: texte,
  });
  if (!r.ok) throw new Error('Envoi de la notification impossible (' + r.status + ').');
  console.log('Notification envoyée.');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
