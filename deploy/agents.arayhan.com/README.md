# agents.arayhan.com

What runs on the VPS for the Agent Hub, kept here because the server is the only other place it exists.

| Path on the VPS | From | Serves |
|---|---|---|
| `/etc/nginx/sites-available/raygent-hub` | `nginx.conf` | TLS, `/api/` to the hub, `/` to the site |
| `/var/www/agents.arayhan.com/index.html` | `index.html` | the placeholder until the Office (step 5) replaces it |
| pm2 app `raygent-hub` | `~/raygent` (git checkout) | `raygent hub serve --port 3300` on 127.0.0.1 |
| `~/.raygent/hub/` | created on first start | `token` (mode 600), `agents.json`, `events.jsonl` |

## Update the hub

```bash
cd ~/raygent && git pull && npm ci && npx tsc -p tsconfig.json && pm2 restart raygent-hub
```

## Update the site or the nginx config

From the raygent repo on a laptop:

```bash
scp -i ~/.ssh/arayhan_vps deploy/agents.arayhan.com/nginx.conf deploy/agents.arayhan.com/index.html ubuntu@43.157.241.50:/tmp/
ssh -i ~/.ssh/arayhan_vps ubuntu@43.157.241.50 '
  sudo install -D -m 644 /tmp/index.html /var/www/agents.arayhan.com/index.html &&
  sudo cp /etc/nginx/sites-available/raygent-hub /tmp/raygent-hub.bak &&
  sudo install -m 644 /tmp/nginx.conf /etc/nginx/sites-available/raygent-hub &&
  { sudo nginx -t && sudo systemctl reload nginx || sudo cp /tmp/raygent-hub.bak /etc/nginx/sites-available/raygent-hub; }'
```

A config that fails `nginx -t` is put back before anything reloads.

The certificate renews through certbot's own timer. If it is ever issued again, certbot rewrites the `# managed by Certbot` lines; copy the result back here.
