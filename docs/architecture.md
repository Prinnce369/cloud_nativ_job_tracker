# Architecture Notes

## Local development

```mermaid
flowchart TD
  Browser --> Frontend[Vite React App]
  Frontend -->|HTTP REST| Backend[Express API]
  Backend -->|SQL| Postgres[(PostgreSQL)]
  DockerCompose[Docker Compose] --> Frontend
  DockerCompose --> Backend
  DockerCompose --> Postgres
```

## Production improvement ideas

- Deploy frontend to Vercel/Netlify/Cloudflare Pages.
- Deploy backend to Render/Fly.io/AWS ECS.
- Use managed PostgreSQL.
- Add JWT authentication.
- Add OpenTelemetry traces.
- Add Prometheus metrics endpoint.
