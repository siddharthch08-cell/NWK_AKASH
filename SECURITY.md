# Security Policy

## Credential Rotation

All credentials exposed in the initial .env file MUST be rotated before deployment:

1. **Administrator Password** — Change immediately via the admin panel or database
2. **JWT_ACCESS_SECRET** — Generate a new 32+ byte random value
3. **JWT_REFRESH_SECRET** — Generate a new 32+ byte random value  
4. **PROXY_SHARED_SECRET** — Generate a new shared secret and update Caddy config

To generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Git History Cleanup

Run `git filter-repo` to remove .env from history:
```bash
pip install git-filter-repo
git filter-repo --path .env --invert-paths --force
git push origin main --force
```

All clone owners must re-clone after history rewrite.

## Session Invalidation

After rotating JWT secrets, all existing sessions are automatically invalidated
because they were signed with the old secrets. Users will need to log in again.

## Reporting

Report security issues via GitHub Issues with the `security` label.
Do not disclose vulnerabilities publicly until a fix is available.