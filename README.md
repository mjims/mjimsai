# MjimsAI — Plateforme d'Agents IA Customisables

Créez, personnalisez et déployez des agents IA conversationnels sur n'importe quel site web.

## ✨ Fonctionnalités

- **Multi-Provider LLM** — Claude (Anthropic), GPT (OpenAI), Gemini (Google), Grok (xAI), DeepSeek
- **Modèles dynamiques** — La liste des modèles par provider est gérée en backoffice (CRUD), pas codée en dur
- **Agents Customisables** — Prompt système, modèle, température, tokens max, clé LLM par agent (chiffrée)
- **Widget Embeddable** — Script JS intégrable sur tout site web
- **Dashboard Utilisateur** — Gestion des agents, conversations, abonnements
- **Backoffice Admin** — CRUD des plans, gestion des utilisateurs, supervision
- **Base de Connaissances** — Upload PDF, DOCX, TXT, Markdown
- **Streaming SSE** — Réponses en temps réel
- **Abonnement par agent** — Chaque agent a son propre plan (mensuel / 6 mois / annuel)
- **Paiements** — Stripe (cartes, EUR) + Sebpay (Mobile Money, XOF, Afrique de l'Ouest)
- **Multilingue** — Interface FR/EN (next-intl)

## 🏗️ Architecture

Modèle simplifié : **Utilisateur → Agents** (pas d'organisation).

- Un utilisateur crée son compte
- Il crée des agents liés à son compte
- Chaque agent porte son propre abonnement (plan + période de facturation)
- Les plans sont gérés dynamiquement depuis le backoffice (pas codés en dur)

## 🚀 Démarrage Rapide

### 1. Configuration

```bash
cp .env.example .env
# Éditer .env — configurer au minimum :
# - POSTGRES_PASSWORD
# - JWT_SECRET
# - ADMIN_API_KEY
# - ENCRYPTION_KEY (Fernet, pour chiffrer les clés LLM par agent)
# - Au moins une clé API LLM (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
# - Stripe / Sebpay (optionnel, pour les paiements)
```

### 2. Lancer

```bash
docker compose up -d --build
```

### 3. Appliquer les migrations & seed

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.seed
```

### 4. Vérifier

```bash
curl http://localhost:8080/health
# → {"status":"healthy","version":"1.0.0","environment":"production"}
```

### 5. Créer un compte

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "motdepasse123",
    "full_name": "Admin"
  }'
# → renvoie un token JWT + l'utilisateur (avec sa api_key widget)
```

### 6. Créer un agent

```bash
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistant Support",
    "slug": "support",
    "system_prompt": "Tu es un assistant de support client...",
    "llm_provider": "anthropic",
    "llm_model": "claude-sonnet-4-20250514"
  }'
```

### 7. Intégrer le widget

La clé `data-api-key` est la `api_key` de l'utilisateur (visible dans les paramètres du compte).

```html
<script
  src="http://localhost:8080/widget.js"
  data-api-url="http://localhost:8080"
  data-api-key="<user-api-key>"
  data-agent="support"
  defer></script>
```

## 🌐 Services & Ports

| Service     | URL                     | Description                       |
|-------------|-------------------------|-----------------------------------|
| API         | http://localhost:8080   | FastAPI + Widget JS               |
| Frontend    | http://localhost:3000   | Dashboard utilisateur (Next.js)   |
| Backoffice  | http://localhost:3001   | Admin / CRUD plans (Next.js)      |
| PostgreSQL  | localhost:5432          | Base de données                   |

## 📁 Structure

```
mjimsai/
├── backend/              # FastAPI API + Widget JS
│   ├── app/
│   │   ├── api/          # Routes (auth, agents, chat, conversations, knowledge, billing, admin)
│   │   ├── models/       # SQLAlchemy (User, Agent, Plan, Conversation, Message, Knowledge, UsageRecord)
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Logique métier + providers LLM + encryption + usage + billing
│   │   ├── scripts/      # seed.py
│   │   └── widget/       # Widget chat embeddable
│   ├── alembic/          # Migrations
│   └── Dockerfile
├── frontend/             # Dashboard utilisateur (Next.js 16, App Router, next-intl)
│   ├── app/[locale]/     # Pages localisées (auth, dashboard, agents, billing, settings)
│   ├── services/         # Axios centralisé (auth, agents, billing, conversations...)
│   ├── types/ context/ lib/ i18n/
│   └── Dockerfile
├── backoffice/           # Admin (Next.js 16)
│   ├── app/dashboard/    # plans (CRUD), users, system
│   ├── services/ types/ lib/
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 💳 Abonnements & Plans

- Les **plans** sont créés/édités/désactivés depuis le backoffice (`/dashboard/plans`).
- Champs : nom (slug), label, limite de conversations (-1 = illimité), prix EUR & XOF pour 3 périodes (mensuel / 6 mois / annuel), fonctionnalités, actif, ordre.
- L'abonnement est attaché **à un agent** (onglet « Abonnement » sur la page de l'agent).
- Quota appliqué à la création de conversation (HTTP 429 si dépassé).

## 🧠 Providers & Modèles IA

- Les **providers** (anthropic, openai, gemini, grok, deepseek) sont des intégrations code (SDK). Ajouter un provider = code.
- Les **modèles** d'un provider sont des données, gérées depuis le backoffice (`/dashboard/models`).
  - Désactiver un modèle déprécié ou ajouter un nouveau ne demande **aucune** modification de code.
  - L'app récupère les modèles actifs via `GET /api/v1/agents/providers` (groupés par provider).
- DeepSeek utilise l'API compatible OpenAI (`https://api.deepseek.com`), clé `DEEPSEEK_API_KEY`.

### Sebpay (Mobile Money)

- Opérateurs : `mtn`, `moov`, `orange`, `wav`
- Téléphone au format international **sans** le `+` (ex : `22997000000`)
- Webhook signé HMAC-SHA256 (`X-SebPay-Signature`), vérification obligatoire (fail-closed)

## 🔒 Sécurité

- Mots de passe hachés en bcrypt
- JWT (`{"sub": user_id}`) pour l'authentification dashboard
- `api_key` par utilisateur pour le widget
- Clés LLM par agent chiffrées (Fernet)
- Webhooks de paiement à signature vérifiée
- CORS configurables, base de données non exposée

## 📄 Licence

Propriétaire — Usage interne uniquement.
