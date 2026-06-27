# Deployment Guide — EDULEARN PRO

## Pre-Deployment Checklist

- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run build` succeeds
- [ ] No secrets in git: `git log --all -p | grep -iE "password|secret|jwt" | head`
- [ ] `.env` is in `.gitignore` (verified: `git check-ignore .env`)
- [ ] Generate production JWT secrets: `openssl rand -base64 32`
- [ ] Change default admin password after first login
- [ ] Switch database from SQLite to PostgreSQL

---

## Option 1: Vercel (Recommended — Free Tier)

Vercel is the company behind Next.js. Zero-config, auto-HTTPS, global CDN.

### Step 1: Switch to PostgreSQL

SQLite doesn't work on Vercel (ephemeral filesystem). Create a free PostgreSQL database on:
- **[Neon](https://neon.tech)** — recommended, 0.5GB free, branching
- **[Supabase](https://supabase.com)** — 500MB free, includes auth
- **[Railway](https://railway.app)** — $5 free credit

### Step 2: Update Prisma for PostgreSQL

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"   // change from "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
bun run db:push    # apply schema to PostgreSQL
bun run db:seed    # seed demo data
```

### Step 3: Deploy on Vercel

**Via CLI:**
```bash
npm i -g vercel
vercel              # preview deployment
vercel --prod       # production deployment
```

**Via Dashboard:**
1. Go to [vercel.com](https://vercel.com) → "New Project"
2. Import your GitHub repo
3. Add Environment Variables:
   ```
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   JWT_ACCESS_SECRET=<openssl rand -base64 32>
   JWT_REFRESH_SECRET=<openssl rand -base64 32>
   ```
4. Deploy — every `git push` auto-deploys

### Step 4: Run Migration on Vercel

```bash
vercel env pull .env.production.local
DATABASE_URL=<prod-url> bun run db:push
DATABASE_URL=<prod-url> bun run db:seed
```

**Cost**: Free for hobby tier (100GB bandwidth, 1000 builds/month)

---

## Option 2: Railway (App + DB in One)

Railway hosts both your app and database on one platform.

1. Go to [railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo"
2. Select your `edulearn-pro` repo
3. Click "Add" → "Database" → "PostgreSQL"
4. Copy the `DATABASE_URL` from the PostgreSQL service
5. In your app service → "Variables", add:
   ```
   DATABASE_URL=<from postgres service>
   JWT_ACCESS_SECRET=<openssl rand -base64 32>
   JWT_REFRESH_SECRET=<openssl rand -base64 32>
   ```
6. Railway auto-detects Next.js and deploys
7. Run seed via Railway shell:
   ```bash
   bun run db:push && bun run db:seed
   ```
8. Get your URL: `https://edulearn-pro-production.up.railway.app`

**Cost**: $5/month (includes 500GB outbound + $5 compute credit)

---

## Option 3: Self-Hosted VPS (DigitalOcean / Hetzner / AWS EC2)

Full control, cheapest long-term.

### Step 1: Provision Server

- Ubuntu 22.04 LTS, minimum 1GB RAM (2GB recommended)
- SSH in: `ssh root@your-server-ip`

### Step 2: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20 + build tools
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git ufw

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 (process manager)
npm i -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --createdb edulearn
sudo -u postgres psql -c "ALTER USER edulearn WITH PASSWORD 'your-secure-password';"
sudo -u postgres createdb -O edulearn edulearn_pro
```

### Step 3: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### Step 4: Clone & Build

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/edulearn-pro.git
cd edulearn-pro

bun install --production

# Configure environment
cp .env.example .env
nano .env
# Set:
#   DATABASE_URL=postgresql://edulearn:your-password@localhost:5432/edulearn_pro
#   JWT_ACCESS_SECRET=<openssl rand -base64 32>
#   JWT_REFRESH_SECRET=<openssl rand -base64 32>
#   NODE_ENV=production

# Update schema.prisma to postgresql
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# Build and migrate
bun run db:push
bun run db:seed
bun run build
```

### Step 5: Run with PM2

```bash
pm2 start "bun run start" --name edulearn-pro --cwd /var/www/edulearn-pro
pm2 startup
pm2 save
```

### Step 6: Configure Nginx

```bash
nano /etc/nginx/sites-available/edulearn-pro
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 25M;  # must match MAX_UPLOAD_SIZE_MB

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/edulearn-pro /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Step 7: SSL with Let's Encrypt

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
# Auto-renews via systemd timer
```

**Cost**: $4-6/month (1GB VPS) + domain ($10/year)

---

## Option 4: Docker (Portable)

### Using Docker Compose (app + PostgreSQL)

The project includes `Dockerfile` and `docker-compose.yml`.

```bash
# Generate secrets
export JWT_ACCESS_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Run seed (first time only)
docker-compose exec app bun run db:seed
```

### Deploy to Any Container Platform

The Docker image works on:
- **Google Cloud Run**
- **AWS ECS Fargate**
- **Azure Container Apps**
- **Fly.io**
- **Render**

Example (Google Cloud Run):
```bash
docker build -t gcr.io/YOUR_PROJECT/edulearn-pro .
docker push gcr.io/YOUR_PROJECT/edulearn-pro
gcloud run deploy edulearn-pro \
  --image gcr.io/YOUR_PROJECT/edulearn-pro \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "JWT_ACCESS_SECRET=...,JWT_REFRESH_SECRET=..."
```

---

## Post-Deployment

### 1. Change the Default Admin Password

Login as `admin@edulearn.pro` / `Admin@12345`, then:
- Go to Profile → Change Password
- Use a strong password (8+ chars, uppercase, lowercase, number)

### 2. Update Institute Settings

Login as admin → Settings → update:
- Institute name, tagline, logo
- Hero content
- Contact details
- Social links
- Statistics (students, courses, pass rate)

### 3. Set Up Backups

**PostgreSQL:**
```bash
# Daily backup cron job
echo "0 2 * * * pg_dump -U edulearn edulearn_pro | gzip > /backups/edulearn-$(date +\%Y\%m\%d).sql.gz" | crontab -
```

### 4. Monitor Logs

```bash
# PM2 logs
pm2 logs edulearn-pro

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 5. Set Up Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com) (free) to monitor your health endpoint:
```
GET https://your-domain.com/api
```

---

## Troubleshooting

### Build Fails
```bash
# Clear Next.js cache
rm -rf .next
bun run build
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma can connect
bun run db:generate
```

### 401 on All API Calls
- JWT secrets changed — all existing tokens are invalid
- Users need to log in again (expected behavior)
- Check that `JWT_ACCESS_SECRET` is set in environment

### File Uploads Fail
- Check `client_max_body_size` in Nginx (must match `MAX_UPLOAD_SIZE_MB`)
- Verify `private-uploads/` directory is writable
- Check file MIME type is in the allowed list

### Charts Not Rendering
- Ensure forced light mode is active (dark mode causes invisible chart text)
- Check browser console for errors
