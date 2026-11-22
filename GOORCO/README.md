# 💈 GOORCO — Plateforme Web Complète de Salon de Coiffure & Barbershop de Luxe

> **Casablanca (Maroc) 🇲🇦 & Abidjan (Côte d'Ivoire) 🇨🇮**  
> Plateforme bi-nationale trilingue (**Français, العربية, English**) avec portail Utilisateur (Client & Emploi/Staff) et portail Administratif complet.

---

## 🌟 Présentation Générale

**GOORCO** est une application web moderne et robuste conçue sur-mesure pour un salon de coiffure et barbier haut de gamme avec deux implantations géographiques majeures :
- **Casablanca (Quartier Gauthier, Maroc)** : Monnaie en Dirham marocain (MAD). Prestations orientées rasage traditionnel au coupe-chou, huile d'argan bio marocaine, lissage brésilien et soins vapeur.
- **Abidjan (Cocody Riviera Bonoumin, Côte d'Ivoire)** : Monnaie en Franc CFA (FCFA/XOF). Prestations orientées Taper fade afro chirurgical, nattes géométriques (cornrows), reprise de locks & dreadlocks, et soins au beurre de karité pur.

---

## 🚀 Architecture & Fonctionnalités

### 1. 👤 Espace Utilisateur (Triple Volet : Client, Recrutement & Employés)

#### A. Mode Client
1. **Sélecteur de Salon en 1 Clic** : Bascule immédiate entre Casablanca et Abidjan. Les prestations, les tarifs (MAD vs FCFA), les coiffeurs/barbiers, l'adresse physique et les horaires changent instantanément.
2. **Support Trilingue Intégral** :
   - **Français (FR)**
   - **العربية (AR)** avec gestion native du sens de lecture **RTL** (`dir="rtl"`), typographie adaptée et alignements miroirs.
   - **English (EN)**
3. **Section Rendez-vous (Wizard Pas-à-Pas)** :
   - Étape 1 : Choix du salon (Casablanca ou Abidjan)
   - Étape 2 : Choix de la prestation adaptée
   - Étape 3 : Choix du coiffeur / maître barbier préféré
   - Étape 4 : Sélection de la date et du créneau horaire
   - Étape 5 : Saisie des coordonnées et choix du **mode de rappel automatique (WhatsApp, SMS, Email)**
   - Étape 6 : Confirmation immédiate avec génération d'un code de réservation unique (ex: `GC-CAS-XXXXX` ou `GC-ABI-XXXXX`).
4. **Section GOORCO E-Commerce** :
   - Catalogue de soins capillaires (huiles à barbe, pommades coiffantes, shampoings, tondeuses de précision, coffrets gentleman).
   - Panier dynamique avec badge temps réel et volet coulissant (slide-over).
   - Validation de commande avec modes de paiement adaptés : **CMI Carte bancaire** pour le Maroc, **Wave / Orange Money / MTN** pour la Côte d'Ivoire, et **Espèces à la livraison / au salon**.

#### B. Mode Recrutement (GOORCO Jobs)
- Espaces carrières dédié aux candidats et professionnels de la coiffure.
- Offres d'emploi filtrées par ville (Master Barbier, Coloriste, Spécialiste Tresses & Locks, Manager de salon).
- Formulaire de candidature interactif en ligne avec envoi des coordonnées, années d'expérience, lien portfolio/Instagram et lettre de motivation.

#### C. ✂️ Espace Employés & Fiche Rendez-vous (Nouveau !)
- **Système d'Authentification Collaborateur** :
  - Connexion sécurisée par Identifiant (Email, Téléphone ou Nom) et **Code PIN d'accès** (Code PIN par défaut : `1234`).
  - Boutons de connexion rapide en 1 clic pour les maîtres barbiers de Casablanca et d'Abidjan :
    * 🇲🇦 **Karim El Fassi** (`karim@goorco.com` | PIN: `1234`)
    * 🇲🇦 **Yassine Bennani** (`yassine@goorco.com` | PIN: `1234`)
    * 🇲🇦 **Mehdi Tazi** (`mehdi@goorco.com` | PIN: `1234`)
    * 🇨🇮 **Jean-Luc Koffi** (`jeanluc@goorco.com` | PIN: `1234`)
    * 🇨🇮 **Aminata Traoré** (`aminata@goorco.com` | PIN: `1234`)
    * 🇨🇮 **Ibrahim Cissé** (`ibrahim@goorco.com` | PIN: `1234`)
- **Tableau de Bord & Indicateurs Personnels de l'Employé** :
  - Photo, nom, rôle/spécialité, salon d'affectation et note moyenne ⭐.
  - 4 compteurs KPIs en temps réel :
    * *Rendez-vous Aujourd’hui*
    * *En attente / En cours*
    * *Prestations Terminées*
    * *Revenus Générés par le coiffeur* (en MAD ou FCFA).
- **Fiche des Rendez-vous Clients (Planning Sheet)** :
  - Filtres par statut (*Tous, Aujourd’hui, À servir, Terminés*).
  - Vue détaillée de chaque client : Nom, Code de réservation, Heure et Date.
  - **Liaison directe WhatsApp & Appel** : bouton d'appel en 1 clic (`tel:...`) et ouverture directe du chat WhatsApp (`wa.me/...`).
  - Prestation réservée, durée en minutes et prix.
  - Mode de rappel choisi par le client (WhatsApp, SMS, Email).
  - Préférences & notes spécifiques du client (ex: thé à la menthe, contours nets).
  - **Gestion de Statut en direct par l'employé** :
    * *Confirmé*
    * *✂️ En cours*
    * *✅ Terminé*
    * *❌ Annulé / Absent*
  - **Champ de Notes Techniques Staff** : permet au coiffeur de renseigner des notes techniques (ex: sabot utilisé, texture du cheveu, sensibilité) et de les enregistrer immédiatement.

---

### 2. 👑 Espace Administratif (Tableau de Bord Centralisé)

Accessible via la navigation ou sur `http://localhost:8080/admin` :
- **Tableau de Bord & Métriques Clés** :
  - Nombre total de rendez-vous avec ventilation Casablanca vs Abidjan.
  - Chiffre d'affaires de la boutique en **MAD** et en **FCFA**.
  - Suivi des commandes e-commerce et des candidatures d'emploi reçues.
- **Gestion des Rendez-vous** :
  - Visualisation de toutes les réservations avec filtre par salon.
  - Modification de statut (*Confirmé, En attente, Terminé, Annulé*).
  - Envoi instantané d'un rappel automatique simulé (WhatsApp / SMS).
- **Gestion des Prestations (CRUD Complet)** :
  - Ajout, modification et suppression de prestations avec attribution par salon (Casablanca vs Côte d'Ivoire), titre FR/AR/EN, prix, durée, description et photos.
- **Gestion E-Commerce & Stocks (CRUD Complet)** :
  - Ajout et modification des produits, ajustement des stocks et des prix dans les deux devises.
- **Suivi des Commandes** :
  - Liste détaillée des commandes clients, articles achetés, adresses de livraison et mise à jour du statut d'expédition.
- **Gestion des Offres d'Emploi & Candidatures** :
  - Publication et clôture d'offres d'emploi.
  - Examen des dossiers de candidatures avec consultation des CV et mise à jour des statuts (*Nouveau, Examiné, Entretien fixé, Recruté, Refusé*).

---

## 🛠️ Démarrage Rapide

### Prérequis
- Python 3.10+ (Aucune dépendance externe requise, utilise la bibliothèque standard Python et SQLite 3).

### Lancement du serveur
```bash
# 1. Initialiser la base de données (si non déjà fait)
python3 database.py

# 2. Démarrer le serveur HTTP
python3 server.py
```

L'application est disponible immédiatement sur :
- **Portail Public / Client & Employés** : [http://localhost:8080](http://localhost:8080)
- **Portail Administration** : [http://localhost:8080/admin](http://localhost:8080/admin)

---

## 📁 Structure du Projet

```
GOORCO/
├── server.py              # Serveur HTTP REST API & gestionnaire de fichiers statiques
├── database.py            # Initialisation SQLite, schémas Employés & données de départ
├── goorco.db              # Base de données SQLite relationnelle
├── static/
│   ├── index.html         # Application cliente (Prestations, RDV, E-Commerce, Jobs, Espace Employés)
│   ├── admin.html         # Tableau de bord administratif interactif
│   ├── css/
│   │   └── style.css      # Thème noir obsidienne & or, design responsive, support RTL, fiches staff
│   └── js/
│       ├── i18n.js        # Dictionnaire trilingue (Français, Arabe avec RTL, Anglais)
│       ├── app.js         # Logique applicative (Panier, RDV, Candidatures, Authentification Employés, Fiche client)
│       └── admin.js       # Logique du dashboard administrateur (CRUD, filtres par salon, statistiques)
└── README.md              # Documentation technique complète
```

---

## 🌐 Endpoints de l'API REST

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/employee/login` | Authentification de l'employé (Identifiant & Code PIN) |
| `GET` | `/api/employee/appointments` | Fiche planning des rendez-vous du coiffeur |
| `GET` | `/api/employee/stats` | KPIs personnels de l'employé (RDV du jour, terminés, revenus) |
| `PUT` | `/api/employee/appointments/<id>/status` | Mise à jour du statut du soin et enregistrement des notes techniques |
| `GET` | `/api/locations` | Liste des salons (Casablanca & Abidjan) |
| `GET` | `/api/services?location=xxx` | Liste des prestations filtrées par salon |
| `POST` | `/api/services` | Création d'une nouvelle prestation (Admin) |
| `PUT` | `/api/services/<id>` | Modification d'une prestation existante (Admin) |
| `DELETE` | `/api/services/<id>` | Suppression d'une prestation (Admin) |
| `GET` | `/api/products` | Liste des produits e-commerce |
| `POST` | `/api/products` | Ajout d'un produit en boutique (Admin) |
| `PUT` | `/api/products/<id>` | Mise à jour prix, stock et détails d'un produit (Admin) |
| `DELETE` | `/api/products/<id>` | Suppression d'un produit (Admin) |
| `GET` | `/api/appointments?location=xxx` | Liste de tous les rendez-vous |
| `POST` | `/api/appointments` | Réservation d'un rendez-vous par un client |
| `PUT` | `/api/appointments/<id>/status` | Mise à jour du statut d'un rendez-vous (Admin) |
| `POST` | `/api/appointments/<id>/reminder`| Déclenchement d'un rappel automatique client (Admin) |
| `GET` | `/api/orders` | Liste des commandes de la boutique |
| `POST` | `/api/orders` | Validation d'un panier d'achat client |
| `PUT` | `/api/orders/<id>/status` | Mise à jour du statut de livraison (Admin) |
| `GET` | `/api/jobs?location=xxx` | Liste des offres d'emploi actives |
| `POST` | `/api/jobs` | Publication d'une nouvelle offre d'emploi (Admin) |
| `DELETE` | `/api/jobs/<id>` | Clôture d'une offre d'emploi (Admin) |
| `GET` | `/api/applications` | Liste des candidatures reçues (Admin) |
| `POST` | `/api/applications` | Envoi d'une candidature par un candidat |
| `PUT` | `/api/applications/<id>/status` | Suivi et mise à jour du statut d'une candidature (Admin) |
| `GET` | `/api/stats` | Données analytiques et indicateurs clés de performance |
# goorco
# goorco
# goorco
# goorco
# goorco
