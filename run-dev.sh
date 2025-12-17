#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/annix-backend"
FRONTEND_DIR="$ROOT_DIR/annix-frontend"

NODE_VERSION="${NODE_VERSION:-22.21.1}"
BACKEND_LOG="${BACKEND_LOG:-$ROOT_DIR/backend-dev.log}"
FRONTEND_LOG="${FRONTEND_LOG:-$ROOT_DIR/frontend-dev.log}"

info() {
  printf '\033[32m[run-dev]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[31m[run-dev]\033[0m %s\n' "$*" >&2
  exit 1
}

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return
  fi

  if [ -z "${NVM_DIR:-}" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    if [ -z "${MANPATH+x}" ]; then
      export MANPATH=''
    fi
    # shellcheck disable=SC1090
    set +u
    . "$NVM_DIR/nvm.sh"
    set -u
  fi
}

ensure_node() {
  load_nvm

  if command -v nvm >/dev/null 2>&1; then
    nvm install "$NODE_VERSION" >/dev/null
    nvm use "$NODE_VERSION" >/dev/null
    info "Using Node $(node -v) via nvm"
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    fail "Node.js not detected. Install nvm or Node $NODE_VERSION."
  fi

  local current current_major
  current="$(node -v)"
  current_major="${current#v}"
  current_major="${current_major%%.*}"
  if [ "${current_major}" -lt 22 ]; then
    fail "Node $current or newer (>=22) is required. Found $current."
  fi
  info "Using system Node $current"
}

ensure_env_file() {
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    fail "Missing $BACKEND_DIR/.env. Copy .env.example and update the secrets before running this script."
  fi
}

load_env_file() {
  set +u
  set -o allexport
  # shellcheck disable=SC1090
  . "$BACKEND_DIR/.env"
  set +o allexport
  set -u
}

check_postgres() {
  local host="${DATABASE_HOST:-localhost}"
  local port="${DATABASE_PORT:-5432}"

  if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h "$host" -p "$port" >/dev/null 2>&1; then
      info "pg_isready could not reach Postgres at $host:$port. Continuing anyway..."
    fi
  fi
}

ensure_database() {
  if ! command -v psql >/dev/null 2>&1; then
    info "psql not found; skipping automatic database setup (install PostgreSQL 15 to enable)."
    return
  fi

  local host="${DATABASE_HOST:-localhost}"
  local port="${DATABASE_PORT:-5432}"
  local db_user="${DATABASE_USERNAME:-annix_user}"
  local db_pass="${DATABASE_PASSWORD:-annix_password}"
  local db_name="${DATABASE_NAME:-annix_db}"

  if PGPASSWORD="$db_pass" psql -h "$host" -p "$port" -U "$db_user" -d "$db_name" -c 'SELECT 1' >/dev/null 2>&1; then
    info "Database $db_name already accessible as $db_user."
    return
  fi

  local superuser="${PG_SUPERUSER:-postgres}"
  local superpass="${PG_SUPERPASS:-}"
  info "Attempting to provision PostgreSQL role/database via $superuser…"
  if ! PGPASSWORD="$superpass" psql -h "$host" -p "$port" -U "$superuser" -v ON_ERROR_STOP=1 >>"$BACKEND_LOG" 2>&1 <<SQL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${db_user}') THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${db_user}', '${db_pass}');
    ELSE
        EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${db_user}', '${db_pass}');
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${db_name}') THEN
        EXECUTE format('CREATE DATABASE %I OWNER %I', '${db_name}', '${db_user}');
    END IF;
END $$;
SQL
  then
    info "Automatic provisioning failed. If your PostgreSQL superuser requires a password, set PG_SUPERPASS (and optionally PG_SUPERUSER) before rerunning."
    return
  fi

  if PGPASSWORD="$db_pass" psql -h "$host" -p "$port" -U "$db_user" -d "$db_name" -c 'SELECT 1' >/dev/null 2>&1; then
    info "Provisioned database $db_name for $db_user."
  else
    info "Provisioning ran but $db_user still cannot connect. Verify Postgres authentication rules."
  fi
}

install_backend() {
  pushd "$BACKEND_DIR" >/dev/null
  info "Installing backend dependencies…"
  yarn install >/dev/null
  info "Running backend migrations…"
  yarn migration:run
  popd >/dev/null
}

install_frontend() {
  pushd "$FRONTEND_DIR" >/dev/null
  info "Installing frontend dependencies…"
  npm install >/dev/null
  popd >/dev/null
}

start_services() {
  : >"$BACKEND_LOG"
  : >"$FRONTEND_LOG"

  info "Starting backend (logs: $BACKEND_LOG)…"
  (
    cd "$BACKEND_DIR"
    yarn start:dev
  ) | tee -a "$BACKEND_LOG" &
  BACKEND_PID=$!

  info "Starting frontend (logs: $FRONTEND_LOG)…"
  (
    cd "$FRONTEND_DIR"
    NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4001}" npm run dev
  ) | tee -a "$FRONTEND_LOG" &
  FRONTEND_PID=$!
}

cleanup() {
  info "Stopping dev servers…"
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
    wait "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}

main() {
  ensure_node
  ensure_env_file
  load_env_file
  ensure_database
  check_postgres
  install_backend
  install_frontend
  start_services

  trap cleanup EXIT INT TERM
  info "Backend → http://localhost:${PORT:-4001}, Frontend → http://localhost:3000"
  info "Press Ctrl+C to stop both dev servers."
  wait
}

main "$@"
