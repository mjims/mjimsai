# MjimsAI — Task Tracker

> Plateforme SaaS d'agents IA customisables.
> Architecture : **Utilisateur → Agents** (organisation supprimée). Abonnement **par agent**, plans gérés en backoffice.

---

## ✅ Phase 1 — MVP (terminé)

### Backend API (FastAPI)
- [x] Structure projet & config
- [x] Modèles DB (User, Agent, Conversation, Message, KnowledgeDocument)
- [x] Schemas Pydantic
- [x] Service auth (JWT + API keys)
- [x] Providers LLM (Anthropic, OpenAI, Gemini, Grok)
- [x] CRUD agents & routes
- [x] Chat service & routes (streaming SSE)
- [x] Routes conversations
- [x] Routes admin
- [x] Base de connaissances (upload & traitement)
- [x] Widget JS embeddable
- [x] Migrations Alembic
- [x] Dockerfile & entrypoint

### Frontend (Next.js)
- [x] Init & layout
- [x] Login / Register
- [x] Dashboard overview
- [x] Liste agents
- [x] Builder agent (create/edit)
- [x] Conversation viewer
- [x] Settings
- [x] Dockerfile

### Infra
- [x] docker-compose.yml
- [x] .env.example
- [x] README.md

---

## ✅ Phase 2 — Refactor architecture (terminé)

> Suppression Organisation + Abonnement par agent + Plans CRUD + branding MjimsAI

### Branding & i18n
- [x] Rebrand MILA → MjimsAI partout
- [x] i18n FR/EN (next-intl), `proxy.ts` (Next.js 16, plus de `middleware.ts`)
- [x] Frontends sans dossier `src/`, structure types/services/components/lib/context
- [x] Axios centralisé (plus de `fetch` brut)

### Suppression Organisation
- [x] Modèle `Organization` supprimé
- [x] `User` : ajout `api_key` (widget) + `is_suspended`, suppression `organization_id` / `role`
- [x] `Agent` : `organization_id` → `user_id`
- [x] `usage_records` : `organization_id` → `agent_id`
- [x] Migration `0004_remove_org_add_plans_per_agent_billing` (préserve les données)
- [x] `seed.py` réécrit (plan free + user démo, plus d'organisation)
- [x] Nettoyage refs `organization` (deps, services, routes, schemas)

### Plans (CRUD backoffice)
- [x] Modèle `Plan` (slug, label, limite conv, prix EUR/XOF × 3 périodes, features, actif, ordre)
- [x] Schemas Plan (Create/Update/Response)
- [x] Routes admin CRUD plans (soft-delete si référencé)
- [x] Backoffice : `dashboard/plans` (liste + toggle actif + delete)
- [x] Backoffice : `dashboard/plans/new` (création)
- [x] Backoffice : `dashboard/plans/[id]` (édition)
- [x] Backoffice : `dashboard/users` (liste + suspendre)
- [x] Backoffice : `dashboard/page` (stats user-based)
- [x] Backoffice : `dashboard/system` (health)
- [x] Anciennes pages `organizations` supprimées

### Abonnement par agent
- [x] Agent : `plan_id`, `billing_period`, `subscription_expires_at`, `stripe_subscription_id`, `sebpay_subscription_ref`
- [x] `usage_service` par agent + `check_quota` (HTTP 429)
- [x] Quota appliqué dans `chat_service` à la création de conversation
- [x] Routes billing : `GET /plans`, `GET /agents/{id}/subscription`, subscribe Stripe / Sebpay
- [x] Frontend : onglet « Abonnement » sur la page agent (sélecteur période + plans + Stripe/Sebpay)
- [x] Frontend : page billing (vue synthèse par agent)
- [x] Frontend : settings utilise `user.api_key` directement

### Paiements
- [x] Stripe (cartes, EUR) — checkout + webhook (update agent.plan_id)
- [x] Sebpay (Mobile Money, XOF) vérifié sur la doc officielle
  - [x] Opérateur `wav` (corrigé depuis `wave`)
  - [x] Téléphone sans `+`
  - [x] Webhook HMAC-SHA256 fail-closed
  - [x] Garde IDOR sur le statut de paiement

### Sécurité (clés LLM)
- [x] Chiffrement Fernet des clés LLM par agent (`services/encryption.py`)

---

## ✅ Phase 3 — Providers & modèles dynamiques (terminé)

> Les modèles ont une « durée de vie » : on les sort du code et on les gère en backoffice.

- [x] Provider **DeepSeek** (API compatible OpenAI, `https://api.deepseek.com`)
- [x] Config `DEEPSEEK_API_KEY` + `.env.example`
- [x] Modèle `LLMModel` (provider, model_id, label, is_active, sort_order) — table `llm_models`
- [x] Migration `0005_llm_models` (table + seed des modèles 2026)
- [x] Schemas `LLMModelCreate/Update/Response` (`protected_namespaces=()` pour `model_id`)
- [x] `get_available_models(db)` lit les modèles **actifs** depuis la DB (plus de `list_models()` hardcodé)
- [x] `list_models()` retiré de `base.py` et des 4 providers
- [x] Routes admin : `GET /admin/providers`, CRUD `/admin/models`
- [x] Backoffice : page `dashboard/models` (ajout inline + table groupée par provider + toggle actif + delete) + nav
- [x] Frontend : fallback `DEFAULT_PROVIDERS` vidé (catalogue 100% DB via `/agents/providers`)

**Providers code-backed** : anthropic, openai, gemini, grok, deepseek (ajouter un provider = code ; ajouter/retirer un **modèle** = backoffice).

---

## 🔄 Vérification (en cours)

- [x] Build Docker (api / frontend / backoffice) OK
- [x] Stack démarre (`docker compose up -d`)
- [x] `alembic upgrade head` exécuté & validé
- [x] `seed.py` exécuté (plan free + user démo)
- [x] Register → user créé avec `api_key`
- [x] `GET /billing/plans` → plans depuis la DB
- [ ] Backoffice : créer un plan → visible dans l'app
- [ ] Backoffice : Modèles IA → ajouter/désactiver un modèle → reflété dans le builder d'agent
- [ ] Agent → onglet Abonnement → souscrire (Sebpay tél. sans `+`, opérateur `wav`)
- [ ] Widget embed avec `data-api-key={user.api_key}`
- [ ] Quota : dépasser `plan.conversations_limit` → HTTP 429

---

## 📌 Backlog / À venir

- [ ] Renouvellement automatique des abonnements (cron / expiration)
- [ ] Notifications expiration d'abonnement
- [ ] Tests automatisés (backend + frontend)
- [ ] Analytics par agent (graphes d'usage)
