# Plume AI — code complet de l’application

Cette archive contient la version publiée de Plume, y compris la correction du bouton de connexion IA. Aucune clé API, aucun identifiant Git secret et aucun manuscrit personnel ne sont inclus.

## Lancer sur ton ordinateur

1. Installer Node.js 22 ou une version plus récente.
2. Extraire cette archive.
3. Ouvrir un terminal dans le dossier `Plume-AI-code-complet`.
4. Exécuter `npm start`.
5. Ouvrir http://127.0.0.1:3000 dans un navigateur.

Aucune dépendance npm à installer. Le serveur local écoute uniquement sur ton ordinateur.

## Fichiers

- `src/client/index.html`, `src/client/style.css`, `src/client/app.js` : l’interface (HTML, CSS, JavaScript du navigateur).
- `src/server.js` : les routes du serveur (`/api/connection`, `/api/agent`, icône, manifeste).
- `assets/plume-ai-icon.png` : l’icône, embarquée dans le Worker et servie sur `/icon.png`.
- `scripts/bundle.mjs` : assemble `src/` et l’icône en un seul fichier, `worker/index.js`.
- `worker/index.js` : **fichier généré**, ne pas le modifier à la main. C’est lui qui est publié.
- `dev-server.mjs` : adaptateur Node.js pour lancer le Worker sur ton ordinateur.
- `scripts/build.sh` : création de l’artefact Sites dans `dist/` (nécessite Bash).
- `scripts/validate-artifact.mjs` : validation de l’artefact.
- `.openai/hosting.json` : configuration du site existant. L’identifiant est public, sans clé secrète. Ce fichier ne constitue pas une autorisation de publication.

## Fonctionnement

Éditeur de chapitres, fiches d’univers, faits validés et idées, analyse de cohérence, suggestions de style et d’inspiration, import de chapitres TXT, sauvegardes JSON et export du manuscrit TXT.

Les écrits sont conservés dans le `localStorage` du navigateur, pour chaque adresse du site. Le projet du site publié n’apparaît donc pas automatiquement à l’adresse locale : exporter le JSON depuis le site et l’importer localement pour le transférer.

La clé API reste en mémoire dans l’onglet et disparaît au rechargement, sauf si « Mémoriser la clé dans ce navigateur » est cochée : elle est alors enregistrée en clair dans le `localStorage` (décocher l’efface). Elle transite vers le serveur puis vers l’API OpenAI lors des demandes. La route `/api/connection` vérifie la clé et l’accès au modèle ; elle ne confirme pas le crédit disponible. La route `/api/agent` effectue l’analyse via Chat Completions. Les appels sont facturés séparément par OpenAI.

L’agent reçoit tous les chapitres et les fiches à chaque demande, avec une limite de contexte de 200 000 octets UTF-8 (environ 190 000 caractères), mesurée de la même façon dans le navigateur et sur le serveur. La réponse s’affiche progressivement (streaming). Il produit des propositions sans modifier le manuscrit automatiquement. Il n’y a pas de boucle d’outils autonome ni de base de données distante dans cette version.

## Modifier

Modifier les fichiers de `src/`, puis arrêter et relancer `npm start` : la commande régénère `worker/index.js` avant de lancer le serveur. Pour publier : `npm run build` puis `npm run validate`. `npm run format` remet en forme le code avec Prettier. `npm test` lance les tests automatiques (`test/`), qui simulent OpenAI : aucune clé ni aucun appel payant n’est nécessaire. Ils tournent aussi sur GitHub à chaque push (`.github/workflows/test.yml`), avec une vérification que `worker/index.js` a bien été régénéré. Le modèle se règle dans « Connexion IA ».

## Hébergement

Le Worker s’exécute dans un environnement compatible avec les Web APIs, notamment Cloudflare Workers. Les scripts de construction préparent un artefact pour Sites. L’accès privé de la version publiée est assuré par Sites : il n’est pas implémenté dans le code du Worker. Un hébergement public ailleurs nécessite d’ajouter une authentification et des limites d’usage adaptées.

## Vérification de cette livraison

Source du Worker identique à la version publiée. Syntaxe Node.js vérifiée ; serveur local testé sur la page d’accueil et la validation de connexion. L’analyse avec une vraie clé API n’a pas été testée dans cette livraison.

## Identité visuelle

Nom : Plume AI. Icône générée avec l’outil de génération d’images intégré : plume ivoire avec éclat doré sur fond vert profond. Fichier : `assets/plume-ai-icon.png`. Elle est également embarquée dans le Worker pour la servir sur `/icon.png`. Le manifeste `/manifest.webmanifest` fournit le nom et l’icône du raccourci.

Prompt de génération : « Square app icon for Plume AI, French novelist writing assistant; ivory quill with a small sage-gold four-point sparkle, deep forest green background (#344c3e), clean editorial flat graphic, generous safe margin, no text, no mockup. »
