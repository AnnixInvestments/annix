#!/bin/bash
# Git merge driver for yarn.lock
# Always accepts the current version and regenerates the lock file

cp "$1" yarn.lock
cd "$(dirname "$1")"
yarn install --check-files
exit 0
