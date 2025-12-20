# Secret Management Guide

This document outlines how to properly manage secrets and API keys in the Annix project to prevent security vulnerabilities.

## 🚨 **IMPORTANT: Never Commit Secrets to Git**

### Rules for Secret Management:
1. **NEVER** commit actual API keys, passwords, or secrets to the repository
2. **ALWAYS** use environment variables (`.env` files) for secrets
3. **ONLY** commit `.env.example` files with placeholder values
4. **USE** GitHub Secrets for CI/CD environments

## Environment Files Setup

### Backend (annix-backend/)
```bash
# Copy the example file
cp annix-backend/.env.example annix-backend/.env

# Edit with your actual secrets
nano annix-backend/.env
```

### Frontend (annix-frontend/)
```bash
# Copy the example file  
cp annix-frontend/.env.example annix-frontend/.env.local

# Edit with your actual secrets
nano annix-frontend/.env.local
```

## 📁 File Structure

```
annix-sync/
├── .gitignore                    # Excludes all .env files
├── annix-backend/
│   ├── .env.example             # ✅ Committed (template only)
│   ├── .env                     # ❌ Never committed (actual secrets)
│   └── .env.backup              # ❌ Never committed (backup)
├── annix-frontend/
│   ├── .env.example             # ✅ Committed (template only)
│   └── .env.local               # ❌ Never committed (actual secrets)
└── scripts/
    └── check-secrets.sh         # 🔍 Secret detection tool
```

## 🔍 Secret Detection Tools

### Pre-commit Hook
Automatically scans staged files for potential secrets before allowing commits.

### Manual Scan
```bash
# Run the secret detection script
./scripts/check-secrets.sh
```

### GitHub Actions
The repository uses GitHub's built-in secret scanning to detect committed secrets.

## 🛡️ Best Practices

### 1. Environment Variable Naming
- Backend: Use descriptive names (`JWT_SECRET`, `DATABASE_PASSWORD`)
- Frontend: Prefix with `NEXT_PUBLIC_` for browser-exposed variables

### 2. Secret Generation
```bash
# Generate secure JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate secure passwords
openssl rand -base64 32
```

### 3. GitHub Secrets for CI/CD
Set up repository secrets in GitHub Settings:
1. Go to Repository Settings → Secrets and variables → Actions
2. Add secrets like `JWT_SECRET`, `DATABASE_PASSWORD`, etc.
3. Reference in workflows using `${{ secrets.SECRET_NAME }}`

### 4. Local Development
- Use `.env` files for local development
- Never share `.env` files containing real secrets
- Add `.env` to your global `.gitignore` if needed

## 🚨 Emergency Response

If you accidentally commit a secret:

1. **Immediately** remove the secret from the code
2. **Rotate** the compromised secret (generate a new one)
3. **Remove** from git history:
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch path/to/file' --prune-empty --tag-name-filter cat -- --all
   ```
4. **Force push** the cleaned history (if necessary)
5. **Update** any services that used the compromised secret

## 📋 Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] Only `.env.example` files are committed
- [ ] No actual secrets in committed code
- [ ] Pre-commit hook is installed and working
- [ ] GitHub Secrets configured for CI/CD
- [ ] Team members trained on secret management

## 🔗 Helpful Resources

- [GitHub Secret Scanning Documentation](https://docs.github.com/en/code-security/secret-scanning)
- [Environment Variables Best Practices](https://12factor.net/config)
- [OWASP Secret Management Guidelines](https://owasp.org/www-project-secrets-management/)