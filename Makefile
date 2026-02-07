.PHONY: up down build logs restart clean ps db-auth db-task db-audit db-users db-tasks db-audit-logs

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

# Database shell (interactive psql)
db-auth:
	docker compose exec postgres psql -U taskman -d auth_db
db-task:
	docker compose exec postgres psql -U taskman -d task_db
db-audit:
	docker compose exec postgres psql -U taskman -d audit_db

# Quick queries
db-users:
	docker compose exec postgres psql -U taskman -d auth_db -c "SELECT id, email, username, role, created_at FROM users;"
db-tasks:
	docker compose exec postgres psql -U taskman -d task_db -c "SELECT id, title, status, priority, created_by, created_at FROM tasks;"
db-audit-logs:
	docker compose exec postgres psql -U taskman -d audit_db -c "SELECT id, event_type, entity_type, entity_id, user_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

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
