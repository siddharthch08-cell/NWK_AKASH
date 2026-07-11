# NWK_AKASH Deployment Guide

## Prerequisites
- Node.js 22
- npm
- Git
- Vercel account (free)
- Neon PostgreSQL account (free)
- Upstash Redis account (free)
- Domain name (~₹42/year)

---

## Step 1: Create PostgreSQL Database (Neon)

1. Sign up at https://neon.tech (free)
2. Create a new project
3. Copy the **Connection URL** (looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
4. Keep this safe — you'll need it in Step 3

## Step 2: Create Redis (Upstash)

1. Sign up at https://upstash.com (free)
2. Create a new Redis database
3. Copy the **Redis URL** (looks like: `redis://default:xxx@xxx.upstash.io:6379`)
4. Keep this safe — you'll need it in Step 3

## Step 3: Generate Secrets

Run this in your terminal to generate JWT secrets:

```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
```

Run each command separately and save both values.

## Step 4: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Set environment variables
vercel env add DATABASE_URL production
# Paste your Neon PostgreSQL URL when prompted

vercel env add JWT_ACCESS_SECRET production
# Paste the generated secret

vercel env add JWT_REFRESH_SECRET production
# Paste the other generated secret

vercel env add REDIS_URL production
# Paste your Upstash Redis URL

vercel env add APP_URL production
# Enter your domain (e.g., https://yourdomain.com)

vercel env add ALLOWED_HOSTS production
# Enter your domain (e.g., yourdomain.com)

vercel env add ALLOWED_ORIGINS production
# Enter your domain (e.g., https://yourdomain.com)

vercel env add NODE_ENV production
# Enter: production

# Deploy
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next`
4. Add environment variables in the dashboard:
   - `DATABASE_URL` = your Neon URL
   - `JWT_ACCESS_SECRET` = generated secret
   - `JWT_REFRESH_SECRET` = generated secret
   - `REDIS_URL` = your Upstash URL
   - `APP_URL` = your domain
   - `ALLOWED_HOSTS` = your domain
   - `ALLOWED_ORIGINS` = your domain
   - `NODE_ENV` = production
5. Click **Deploy**

## Step 5: Run Database Migration

After first deploy, run the migration:

```bash
# Using Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

Or add a build step in Vercel:
- Go to Project Settings → Build & Development Settings
- Add: `prisma generate && prisma migrate deploy && next build`

## Step 6: Bootstrap Admin User

```bash
# Set these in Vercel environment variables first:
# ADMIN_EMAIL, ADMIN_NAME, ADMIN_INITIAL_PASSWORD

# Then run via Vercel CLI or add as a build step
npm run db:bootstrap-admin
```

## Step 7: Set Up Custom Domain

1. In Vercel Dashboard → your project → Settings → Domains
2. Add your custom domain
3. Update your domain's DNS:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.21.21`
4. Wait for SSL certificate (automatic, ~5 minutes)

---

## Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Neon PostgreSQL | Free | Free |
| Upstash Redis | Free | Free |
| Cloudflare | Free | Free |
| Domain | .com | ~₹42/year |
| **Total** | | **₹42/year** |

---

## Environment Variables Checklist

```
DATABASE_URL=postgresql://...           # Neon
JWT_ACCESS_SECRET=...                   # Generated
JWT_REFRESH_SECRET=...                  # Generated (different from above)
REDIS_URL=redis://...                   # Upstash
APP_URL=https://yourdomain.com          # Your domain
ALLOWED_HOSTS=yourdomain.com            # Your domain
ALLOWED_ORIGINS=https://yourdomain.com  # Your domain
NODE_ENV=production                     # Fixed value
```

---

## Post-Deployment Checklist

- [ ] App loads at your domain
- [ ] Admin login works
- [ ] Student registration works
- [ ] Can create a test
- [ ] Can take a test
- [ ] Videos play correctly
- [ ] Materials accessible
- [ ] SSL certificate active (https://)

---

## Updating the App

```bash
# Push to main branch
git push origin main

# Vercel auto-deploys on push to main
```

---

## Troubleshooting

### "Application error: a server-side exception has occurred"
- Check environment variables are set correctly
- Check Neon database is active (not suspended)

### Database connection timeout
- Neon free tier suspends after 5 min idle
- Set "Auto-suspend" to "Never" in Neon dashboard

### 404 on API routes
- Ensure `VERCEL_OUTPUT_STANDALONE` is not set in next.config.ts
- Check `output: 'standalone'` is NOT in next.config.ts for Vercel

### Build fails
- Ensure `prisma generate` runs before build
- Check Node.js version is 22
