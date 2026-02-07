.PHONY: up down build logs restart clean ps

# Start all services
up:
	docker compose up -d

# Start with build
up-build:
	docker compose up -d --build

# Stop all services
down:
	docker compose down

# Stop and remove volumes
clean:
	docker compose down -v --remove-orphans

# Rebuild and restart
restart:
	docker compose down && docker compose up -d --build

# View logs (all services)
logs:
	docker compose logs -f

# View logs for specific service
logs-%:
	docker compose logs -f $*

# Show running containers
ps:
	docker compose ps

# Run auth-service migrations
migrate-auth:
	docker compose exec auth-service alembic upgrade head

# Run task-service migrations
migrate-task:
	docker compose exec task-service alembic upgrade head

# Run audit-service migrations
migrate-audit:
	docker compose exec audit-service alembic upgrade head

# Run all migrations
migrate: migrate-auth migrate-task migrate-audit

# Open Jaeger UI
jaeger:
	open http://localhost:16686

# Open API docs
docs-auth:
	open http://localhost/api/v1/auth/docs
docs-tasks:
	open http://localhost/api/v1/tasks/docs
docs-audit:
	open http://localhost/api/v1/audit/docs
