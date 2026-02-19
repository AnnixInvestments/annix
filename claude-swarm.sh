#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -f node_modules/@annix/claude-swarm/run.sh ] || pnpm install
exec node_modules/@annix/claude-swarm/run.sh
