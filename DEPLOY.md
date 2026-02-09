# Deploy on VPS (Ubuntu 22.04+)

## 1) Server prerequisites

```bash
sudo apt update
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Check versions:

```bash
node -v
npm -v
pm2 -v
```

## 2) Upload project to server

Option A (git):

```bash
git clone <your-repo-url> /var/www/casino777
cd /var/www/casino777
```

Option B (scp/rsync): copy the whole project into `/var/www/casino777`.

## 3) Install dependencies and run

```bash
cd /var/www/casino777
npm install
npm run start
```

App starts on port `3000` by default.

## 4) Run in background with PM2

```bash
cd /var/www/casino777
pm2 start server.js --name casino777
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs casino777
pm2 restart casino777
```

## 5) Nginx reverse proxy

Create config:

```bash
sudo nano /etc/nginx/sites-available/casino777
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/casino777 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7) Persistence and backups

Server state is stored in:

- `data/state.json`
- `uploads/`

Backup example:

```bash
tar -czf /var/backups/casino777-$(date +%F).tar.gz /var/www/casino777/data /var/www/casino777/uploads
```

Add cron backup (daily 03:30):

```bash
crontab -e
```

```cron
30 3 * * * tar -czf /var/backups/casino777-$(date +\%F).tar.gz /var/www/casino777/data /var/www/casino777/uploads
```

## 8) Update release

```bash
cd /var/www/casino777
git pull
npm install
pm2 restart casino777
```

## Notes

- All combinations, spin history, and media settings are now server-side.
- Uploaded background/audio files are served from `/uploads/...`.
- If you use multiple app instances, move from JSON file storage to PostgreSQL/SQLite with proper locking.
