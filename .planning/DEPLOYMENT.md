# Deployment & Environment Strategy

## Environments

| Environment | Branch | Railway Service | Commit (current) | Purpose |
|-------------|--------|-----------------|------------------|---------|
| **Production** | `main` | erp-cashflowsync | `53c914a` | Live users, stable only |
| **Staging** | `staging` | erp-cashflowsync-staging | `b77669f` | Testing before production |

## Workflow

```
feature branch → staging branch → test → main branch → production
```

### 1. Development
- Dezvoltare pe branch-uri de feature (`feature/xxx` sau `claude/xxx`)
- Fiecare feature branch se bazează pe `staging`

### 2. Merge to Staging
- Merge feature branch în `staging`
- Railway face deploy automat pe staging environment
- Testează pe staging

### 3. Promote to Production
- După validare completă pe staging
- Merge `staging` în `main`
- Railway face deploy automat pe production

## Railway Configuration

### Production Environment
- **Branch**: `main`
- **Auto-deploy**: ON
- **Service name**: erp-cashflowsync

### Staging Environment
- **Branch**: `staging`
- **Auto-deploy**: ON
- **Service name**: erp-cashflowsync-staging (sau ce ai setat)

## How to Set Branch in Railway

1. Go to Railway Dashboard → Project → Settings
2. For each service (production/staging):
   - Go to **Settings** tab
   - Under **Source**, click **Configure**
   - Select **Branch** dropdown
   - Choose the appropriate branch (`main` or `staging`)

## Current State (2026-01-30)

### Production (`main`)
Commit: `53c914a` - feat: add webhook secret configuration to Settings page

Features included:
- Webhook secret field in store edit dialog
- Webhook status column in stores table
- Webhook URL with copy button for Shopify setup

### Staging (`staging`)
Commit: `b77669f` - feat: multi-store Trendyol support

Additional features being tested:
- TrendyolStore model for multiple stores per company
- CRUD API for TrendyolStore
- Per-store webhook handlers with HMAC
- Updated stock-sync, invoice, awb services
- TrendyolStoresTab in Settings UI

**Note**: Multi-store Trendyol was reverted from production due to bugs. Testing continues on staging.

## Bugs to Fix Before Promoting Staging

From the revert, these issues need resolution:

1. [ ] TBD - document specific bugs found
2. [ ] TBD - investigate and list issues

## Commands Quick Reference

```bash
# Switch to staging for development
git checkout staging

# Create feature branch
git checkout -b feature/my-feature

# After completing feature, merge to staging
git checkout staging
git merge feature/my-feature
git push origin staging  # triggers staging deploy

# After testing, promote to production
git checkout main
git merge staging
git push origin main  # triggers production deploy
```

## Rollback Procedure

If production has issues:

```bash
# Find last working commit
git log --oneline main

# Reset main to that commit
git checkout main
git reset --hard <commit-hash>
git push --force origin main
```

**Warning**: `--force` overwrites remote history. Use with caution.

---
*Last updated: 2026-01-30*
