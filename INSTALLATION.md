# Dates d'examen — mise en route

✅ Déjà fait : site en ligne, projet Firebase « Exams » relié (config.js).
 (≈ 15 minutes, gratuit)

Site privé pour suivre les dates d'examen : élève, accompagnateur, lieu, date, commentaire,
paiements W, B et S (avec la date du paiement). Connexion par e-mail + mot de passe.

## 1. Mettre le site en ligne (GitHub Pages)

1. Sur GitHub, ouvrez ce dépôt (**MazouziSouad2**) → **Settings** → **Pages**.
2. **Source** : *Deploy from a branch*.
3. **Branch** : choisissez `claude/elegant-cray-vh5fgk`, dossier `/ (root)` → **Save**.
4. Après une minute, l'adresse du site s'affiche : `https://mazouzisouad.github.io/MazouziSouad2/`.

## 2. Créer le projet Firebase (la base de données et les comptes)

1. Allez sur <https://console.firebase.google.com> et connectez-vous avec votre compte Google.
2. **Ajouter un projet** → nom : `dates-examen` → Google Analytics : **désactivé** → **Créer**.

## 3. Activer la base de données

1. Menu de gauche : **Créer → Firestore Database** → **Créer une base de données**.
2. Emplacement : **europe-west9 (Paris)** → Suivant → **Mode production** → Créer.
3. Onglet **Règles** : effacez tout, collez le contenu du fichier [`firestore.rules`](firestore.rules), puis **Publier**.

## 4. Activer la connexion par e-mail

1. Menu de gauche : **Créer → Authentication** → **Commencer**.
2. Onglet **Méthode de connexion** → **Adresse e-mail/Mot de passe** → Activer → Enregistrer.
3. Onglet **Utilisateurs** → **Ajouter un utilisateur** : créez un compte pour chaque personne, avec un mot de passe.
4. Onglet **Paramètres → Actions des utilisateurs** : décochez « Activer la création (inscription) » → Enregistrer.
5. Onglet **Paramètres → Domaines autorisés** → **Ajouter un domaine** : `mazouzisouad.github.io`.

## 5. Relier le site à Firebase

1. Roue dentée ⚙️ en haut à gauche → **Paramètres du projet**.
2. En bas : **Vos applications** → icône **`</>`** (Web) → nom : `dates-examen` → **Enregistrer l'application**.
3. Copiez le bloc `const firebaseConfig = { ... };` qui s'affiche et **envoyez-le moi** : je le mets dans
   `config.js` et le site est prêt.

> Ces informations ne sont pas secrètes : les données sont protégées par les comptes et par les règles de l'étape 3.

## Sur le téléphone

Ouvrez l'adresse du site → connectez-vous → menu du navigateur → **« Ajouter à l'écran d'accueil »**.

## Donner ou retirer l'accès à quelqu'un

- **Donner** : créez son compte (Authentication → Utilisateurs → Ajouter un utilisateur).
- **Retirer** : supprimez ou désactivez son compte (Authentication → Utilisateurs → ⋮).
