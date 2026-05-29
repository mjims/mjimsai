# MILA Open — Plateforme d'Agents IA Customisables

Créez, personnalisez et déployez des agents IA conversationnels sur n'importe quel site web.

## ✨ Fonctionnalités

- **Multi-Provider LLM** — Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Grok (xAI)
- **Agents Customisables** — Prompt système, modèle, température, tokens max
- **Widget Embeddable** — Script JS intégrable sur tout site web
- **Dashboard Admin** — Interface de gestion des agents et conversations
- **Base de Connaissances** — Upload PDF, DOCX, TXT, Markdown
- **Streaming SSE** — Réponses en temps réel
- **Multi-Tenant (SaaS)** — Organisations, utilisateurs, API keys

## 🚀 Démarrage Rapide

### 1. Configuration

```bash
cp .env.example .env
# Éditer .env — configurer au minimum :
# - POSTGRES_PASSWORD
# - JWT_SECRET
# - ADMIN_API_KEY
# - Au moins une clé API LLM (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
```

### 2. Lancer

```bash
docker compose up -d
```

### 3. Vérifier

```bash
curl http://localhost:8080/health
# → {"status":"healthy","version":"1.0.0","environment":"production"}
```

### 4. Créer un compte

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "org_name": "Mon Entreprise",
    "org_slug": "mon-entreprise",
    "email": "admin@example.com",
    "username": "admin",
    "password": "motdepasse123"
  }'
```

### 5. Créer un agent

```bash
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistant Support",
    "slug": "support",
    "system_prompt": "Tu es un assistant de support client pour Mon Entreprise...",
    "llm_provider": "anthropic",
    "llm_model": "claude-sonnet-4-20250514"
  }'
```

### 6. Intégrer le widget

```html
<script
  src="http://localhost:8080/widget.js"
  data-api-url="http://localhost:8080"
  data-api-key="<org-api-key>"
  data-agent="support"
  defer></script>
```

## 📁 Architecture

```
mila-open/
├── backend/           # FastAPI API + Widget JS
│   ├── app/
│   │   ├── api/       # Routes (auth, agents, chat, conversations, knowledge)
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic + LLM providers
│   │   └── widget/    # Embeddable chat widget
│   ├── alembic/       # Database migrations
│   └── Dockerfile
├── dashboard/         # Next.js admin interface
├── docker-compose.yml
└── .env.example
```

## 🔒 Sécurité

- Mots de passe hachés en bcrypt
- JWT pour l'authentification dashboard
- API keys par organisation pour le widget
- CORS configurables
- Pas d'exposition de la base de données

## 📄 Licence

Propriétaire — Usage interne uniquement.
