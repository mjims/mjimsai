# MILA Open — Task Tracker

## Phase 1 — MVP

### Backend API (FastAPI)
- [ ] Project structure & config
- [ ] Database models (Organization, User, Agent, Conversation, Message, KnowledgeDocument)
- [ ] Pydantic schemas
- [ ] Auth service (JWT + API keys)
- [ ] LLM providers (Anthropic, OpenAI, Gemini, Grok)
- [ ] Agent CRUD service & routes
- [ ] Chat service & routes (with streaming SSE)
- [ ] Conversation routes
- [ ] Admin routes
- [ ] Knowledge base upload & processing
- [ ] Widget JS (embeddable chat)
- [ ] Alembic migrations setup
- [ ] Dockerfile & entrypoint

### Dashboard (Next.js)
- [ ] Project init & layout
- [ ] Login page
- [ ] Dashboard overview
- [ ] Agent list page
- [ ] Agent builder (create/edit)
- [ ] Conversation viewer
- [ ] Settings page
- [ ] Dockerfile

### Infrastructure
- [ ] docker-compose.yml
- [ ] .env.example
- [ ] README.md

### Verification
- [ ] Docker compose up & health check
- [ ] Create agent via API
- [ ] Test chat via widget
- [ ] Dashboard login & agent management
