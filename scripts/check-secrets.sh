#!/bin/bash
# Secret detection script for the Annix project

echo "🔍 Scanning repository for potential secrets..."

# Define patterns that might indicate secrets
PATTERNS=(
    "AIza[0-9A-Za-z_-]{35}"  # Google API keys
    "sk-[a-zA-Z0-9]{48}"      # OpenAI API keys
    "ghp_[a-zA-Z0-9]{36}"     # GitHub personal access tokens
    "xoxb-[0-9]{10}-[0-9]{12}" # Slack bot tokens
    "AKIA[0-9A-Z]{16}"        # AWS access keys
    "JWT_SECRET\s*=\s*[a-f0-9]{64}"  # JWT secrets (64-char hex)
    "password\s*=\s*['\"][^'\"]{8,}['\"]"  # Passwords 8+ chars
    "secret\s*=\s*['\"][^'\"]{8,}['\"]"    # Secrets 8+ chars
    "token\s*=\s*['\"][^'\"]{8,}['\"]"     # Tokens 8+ chars
    "api_key\s*=\s*['\"][^'\"]{8,}['\"]"   # API keys 8+ chars
    "API_KEY\s*=\s*['\"][^'\"]{8,}['\"]"   # API keys 8+ chars
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FOUND_SECRETS=false

# Scan all files except those in exclude patterns
echo "Scanning files..."
while IFS= read -r -d '' file; do
    # Skip certain file types and directories
    if [[ "$file" =~ \.(jpg|jpeg|png|gif|pdf|zip|tar|gz|log)$ ]] || 
       [[ "$file" =~ node_modules|dist|build|\.git|\.idea ]] ||
       [[ "$file" =~ \.env\.(local|development|test|production)$ ]]; then
        continue
    fi
    
    for pattern in "${PATTERNS[@]}"; do
        if grep -iE "$pattern" "$file" > /dev/null 2>&1; then
            echo -e "${RED}❌ POTENTIAL SECRET FOUND in $file${NC}"
            echo -e "${RED}   Pattern: $pattern${NC}"
            grep -iE --color=always "$pattern" "$file" | head -3
            echo ""
            FOUND_SECRETS=true
            break
        fi
    done
done < <(find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./build/*" -print0)

if [ "$FOUND_SECRETS" = false ]; then
    echo -e "${GREEN}✅ No secrets detected${NC}"
else
    echo -e "${YELLOW}⚠️  Please review and remove any potential secrets before committing${NC}"
    echo -e "${YELLOW}   Use .env files for secrets and ensure .env is in .gitignore${NC}"
fi

exit 0