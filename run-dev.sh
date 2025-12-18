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

run_psql() {
  local mode="$1"
  local password="$2"
  local container="$3"
  shift 3

  if [ "$mode" = "docker" ]; then
    docker exec -e PGPASSWORD="$password" -i "$container" psql "$@"
  else
    PGPASSWORD="$password" psql "$@"
  fi
}

port_in_use() {
  local host="$1"
  local port="$2"

  if command -v nc >/dev/null 2>&1; then
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      return 0
    fi
    return 1
  fi

  if command -v lsof >/dev/null 2>&1; then
    if lsof -PiTCP:"$port" -sTCP:LISTEN -n >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v netstat >/dev/null 2>&1; then
    if netstat -an 2>/dev/null | grep -i listen | grep -E "[:.]$port[[:space:]]" >/dev/null 2>&1; then
      return 0
    fi
  fi

  return 1
}

find_available_port() {
  local host="$1"
  local start="$2"
  local end="$3"
  local port="$start"

  while [ "$port" -le "$end" ]; do
    if ! port_in_use "$host" "$port"; then
      printf '%s' "$port"
      return
    fi
    port=$((port + 1))
  done

  fail "Unable to find a free port between $start and $end for Docker Postgres."
}

wait_for_docker_postgres() {
  local host="$1"
  local port="$2"
  local user="$3"
  local attempts="${DOCKER_POSTGRES_READY_RETRIES:-30}"

  if ! command -v psql >/dev/null 2>&1; then
    return
  fi

  while [ "$attempts" -gt 0 ]; do
    if PGPASSWORD="$PG_SUPERPASS" psql -h "$host" -p "$port" -U "$user" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      info "Docker Postgres is ready at $host:$port."
      return
    fi
    sleep 1
    attempts=$((attempts - 1))
  done

  info "Docker Postgres did not report ready after waiting. Continuing anyway..."
}

ensure_docker_postgres() {
  if [ "${USE_DOCKER_POSTGRES:-0}" != "1" ]; then
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    fail "USE_DOCKER_POSTGRES=1 but docker is not available."
  fi

  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon is not reachable. Start Docker Desktop before running this script."
  fi

  local host="${DATABASE_HOST:-localhost}"
  if [ "$host" != "localhost" ] && [ "$host" != "127.0.0.1" ]; then
    fail "USE_DOCKER_POSTGRES expects DATABASE_HOST=localhost or 127.0.0.1 (found $host)."
  fi

  local original_port="${DATABASE_PORT:-5432}"
  local port="$original_port"
  local container="${POSTGRES_CONTAINER_NAME:-annix-postgres}"
  local volume="${POSTGRES_CONTAINER_VOLUME:-annix-postgres-data}"
  local image="${POSTGRES_CONTAINER_IMAGE:-postgres:15}"
  local superuser="${PG_SUPERUSER:-postgres}"
  local docker_superpass="${DOCKER_POSTGRES_PASSWORD:-postgres}"
  local superpass="${PG_SUPERPASS:-$docker_superpass}"
  export PG_SUPERUSER="$superuser"
  export PG_SUPERPASS="$superpass"

  local existing_state existing_port
  existing_state="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)"
  existing_port="$(docker inspect -f '{{range $p,$cfg := .NetworkSettings.Ports}}{{if eq $p \"5432/tcp\"}}{{(index $cfg 0).HostPort}}{{end}}{{end}}' "$container" 2>/dev/null || true)"

  if [ -n "$existing_port" ]; then
    port="$existing_port"
    export DATABASE_PORT="$port"
  fi

  if port_in_use "$host" "$port"; then
    if [ "$existing_state" = "true" ]; then
      info "Reusing running container $container on $host:$port."
    else
      if [ -n "$existing_state" ]; then
        info "Removing stopped container $container to adjust port mapping..."
        docker rm "$container" >/dev/null
      fi
      port="$(find_available_port "$host" "${DOCKER_POSTGRES_PORT_FALLBACK_START:-55432}" "${DOCKER_POSTGRES_PORT_FALLBACK_END:-55452}")"
      export DATABASE_PORT="$port"
      info "Port $original_port is already in use; Docker Postgres will listen on $port instead."
    fi
  fi

  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    docker volume create "$volume" >/dev/null
  fi

  local existing
  existing="$(docker ps -a --filter "name=^/${container}$" --format '{{.Names}}')"
  if [ "$existing" != "$container" ]; then
    info "Creating Postgres container $container ($image)..."
    docker run -d \
      --name "$container" \
      -e POSTGRES_USER="$superuser" \
      -e POSTGRES_PASSWORD="$superpass" \
      -p "$port:5432" \
      -v "$volume:/var/lib/postgresql/data" \
      "$image" >/dev/null
  else
    local running
    running="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)"
    if [ "$running" != "true" ]; then
      info "Starting Postgres container $container..."
      docker start "$container" >/dev/null
    fi
  fi

  wait_for_docker_postgres "$host" "$port" "$superuser"
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
  local host="${DATABASE_HOST:-localhost}"
  local port="${DATABASE_PORT:-5432}"
  local db_user="${DATABASE_USERNAME:-annix_user}"
  local db_pass="${DATABASE_PASSWORD:-annix_password}"
  local db_name="${DATABASE_NAME:-annix_db}"
  local psql_mode="host"
  local docker_container="${POSTGRES_CONTAINER_NAME:-annix-postgres}"

  if ! command -v psql >/dev/null 2>&1; then
    if [ "${USE_DOCKER_POSTGRES:-0}" = "1" ] && docker ps -a --format '{{.Names}}' | grep -Fx "$docker_container" >/dev/null 2>&1; then
      psql_mode="docker"
      info "psql not found on host; using docker exec into $docker_container for provisioning."
    else
      info "psql not found; skipping automatic database setup (install PostgreSQL 15 or set USE_DOCKER_POSTGRES=1)."
      return
    fi
  fi

  local psql_host="$host"
  local psql_port="$port"
  if [ "$psql_mode" = "docker" ]; then
    psql_host="localhost"
    psql_port="5432"
  fi

  if run_psql "$psql_mode" "$db_pass" "$docker_container" -h "$psql_host" -p "$psql_port" -U "$db_user" -d "$db_name" -c 'SELECT 1' >/dev/null 2>&1; then
    info "Database $db_name already accessible as $db_user."
    return
  fi

  local superuser="${PG_SUPERUSER:-postgres}"
  local superpass="${PG_SUPERPASS:-}"
  info "Attempting to provision PostgreSQL role/database via ${superuser}..."
  if ! run_psql "$psql_mode" "$superpass" "$docker_container" -h "$psql_host" -p "$psql_port" -U "$superuser" -v ON_ERROR_STOP=1 >>"$BACKEND_LOG" 2>&1 <<SQL
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

  if run_psql "$psql_mode" "$db_pass" "$docker_container" -h "$psql_host" -p "$psql_port" -U "$db_user" -d "$db_name" -c 'SELECT 1' >/dev/null 2>&1; then
    info "Provisioned database $db_name for $db_user."
  else
    info "Provisioning ran but $db_user still cannot connect. Verify Postgres authentication rules."
  fi
}

install_backend() {
  pushd "$BACKEND_DIR" >/dev/null
  info "Installing backend dependencies..."
  yarn install >/dev/null
  info "Running backend migrations..."
  yarn migration:run
  popd >/dev/null
}

install_frontend() {
  pushd "$FRONTEND_DIR" >/dev/null
  info "Installing frontend dependencies..."
  npm install >/dev/null
  popd >/dev/null
}

start_services() {
  : >"$BACKEND_LOG"
  : >"$FRONTEND_LOG"

  info "Starting backend (logs: $BACKEND_LOG)..."
  (
    cd "$BACKEND_DIR"
    yarn start:dev
  ) | tee -a "$BACKEND_LOG" &
  BACKEND_PID=$!

  info "Starting frontend (logs: $FRONTEND_LOG)..."
  (
    cd "$FRONTEND_DIR"
    NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4001}" npm run dev
  ) | tee -a "$FRONTEND_LOG" &
  FRONTEND_PID=$!
}

cleanup() {
  info "Stopping dev servers..."
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
  ensure_docker_postgres
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
