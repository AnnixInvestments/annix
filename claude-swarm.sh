#!/usr/bin/env bash
cd "$(dirname "$0")"

package_version=$(node -p "require('./package.json').devDependencies['@annix/claude-swarm']" 2>/dev/null)
latest_version=$(npm view @annix/claude-swarm version 2>/dev/null)
installed_version=$(node -p "require('./node_modules/@annix/claude-swarm/package.json').version" 2>/dev/null)

needs_install=false

if [ -n "$latest_version" ] && [ "$latest_version" != "$package_version" ]; then
    echo "Updating @annix/claude-swarm: $package_version -> $latest_version"
    node -e "const pkg = require('./package.json'); pkg.devDependencies['@annix/claude-swarm'] = '$latest_version'; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')"
    needs_install=true
elif [ "$installed_version" != "$package_version" ]; then
    echo "Installing @annix/claude-swarm@$package_version (currently have $installed_version)"
    needs_install=true
fi

if [ "$needs_install" = true ]; then
    pnpm install
fi

exec node_modules/@annix/claude-swarm/run.sh
