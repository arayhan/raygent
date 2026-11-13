# Agent Hub

`raygent hub` is a small server, usually on your VPS, that knows every agent you created: its role, the AI account it runs under, the projects it works in, and what each of its sessions is doing right now. Laptops report to it through Claude Code hooks; you read it with `raygent hub status`.

Think of it as the board in an office lobby. Every employee has a name tag, a desk and a status light, and anyone with a key card can look at it.

## Quick start

On the server (once):

```bash
git clone https://github.com/arayhan/raygent ~/raygent && cd ~/raygent && npm ci && npx tsc -p tsconfig.json
mkdir -p ~/.raygent/hub && openssl rand -hex 32 > ~/.raygent/hub/token && chmod 600 ~/.raygent/hub/token
pm2 start "node dist/cli.js hub serve --port 3300" --name raygent-hub && pm2 save
```

Put nginx with TLS in front of `127.0.0.1:3300` (see "How it works" below).

On each laptop:

```bash
ssh user@your-vps cat ~/.raygent/hub/token | raygent hub login https://hub.example.com
raygent hub install-hooks
raygent hub agent add kage --account personal --role "backend dev" --project my-app --class ninja
raygent hub status
```

The token goes through the pipe, so it never shows in your terminal or your chat.

## Commands

| Command | Does |
|---|---|
| `raygent hub serve` | run the server: `--port` (3300), `--host` (127.0.0.1), `--data` (`~/.raygent/hub`). Token from `RAYGENT_HUB_TOKEN` or `<data>/token` |
| `raygent hub login <url>` | save the hub URL and token on this laptop; the token comes from stdin or a masked prompt and is checked first |
| `raygent hub status` | every agent and its live sessions, plus sessions no agent claims (`--json` for the raw data) |
| `raygent hub agent add <id>` | create or update an agent: `--account` (required), `--role`, `--project` (repeat for more), `--class` |
| `raygent hub agent list` | list the agents |
| `raygent hub agent remove <id>` | remove an agent; its sessions show as unassigned |
| `raygent hub watch` | print events live as they arrive |
| `raygent hub install-hooks` | add `raygent hub emit` to the session hooks of every registered Claude account |
| `raygent hub emit` | hook target; you never run it yourself |

```
AGENT         ROLE         ACCOUNT    STATUS   PROJECT  HOST      SINCE  TASK
kage          backend dev  personal   working  my-app   LAPTOP-A  2m     fix the login redirect
ryu           designer     work       offline
(unassigned)               office     idle     client   LAPTOP-B  14m
```

## How it works

```
Claude Code hook ── raygent hub emit ── detached POST ──┐
raygent gemini (start/end) ─────────────────────────────┤
                                                        ▼
                      nginx (TLS) ── raygent hub serve ── agents.json
                                                      └── events.jsonl
raygent hub status / watch ◀── /api/status, /api/stream
```

**What a session reports.**

| Claude Code hook | Status |
|---|---|
| SessionStart | `idle`, waiting for your first prompt |
| UserPromptSubmit | `working`, with the first 120 characters of the prompt as the task |
| Notification | `waiting`: it needs you in the middle of a turn |
| Stop | `idle`: the turn is done |
| SessionEnd | `ended` |

- A `working` session with no event for 30 minutes shows as `stale` (the laptop probably slept).
- An ended session stays visible for 10 minutes; any session silent for 12 hours drops off.
- Gemini has no hooks, so `raygent gemini` reports only start and end.

**Which agent a session belongs to.** A session is matched by its account and project. An agent that names the project wins over one with no project list, which covers every project of its account. A session that no agent claims shows as `(unassigned)`. Matching happens when status is read, so a new agent claims sessions that are already running.

**Projects** are named by the slug in your [Sync](sync.md) brain repo (`hosts/<COMPUTERNAME>.json`), so one project has one name on every laptop. Without a slug, the folder name is used.

**Hooks never slow a session.** `hub emit` prints nothing, never fails, and hands the network call to a detached process. With the hub down, a hook still returns in about the time Node takes to start.

**Behind nginx.** The server binds to `127.0.0.1` and every route it has lives under `/api/`. Proxy only `/api/` to it, so the root of the domain stays free for the agents' site; turn off buffering for `/api/stream` (`proxy_buffering off`, a long `proxy_read_timeout`), and add TLS with certbot. A working site file is in `deploy/agents.arayhan.com/` in the raygent repo.

## API

Every route except `/api/health` and the login needs `Authorization: Bearer <token>` or the browser session cookie.

| Route | Does |
|---|---|
| `POST /api/events` | record one event |
| `GET /api/status` | agents with their live sessions, plus unassigned sessions |
| `GET /api/agents`, `PUT /api/agents/<id>`, `DELETE /api/agents/<id>` | the registry |
| `GET /api/stream` | server-sent events: every event as it arrives |
| `GET /api/health` | `ok` |
| `POST /api/session` | browser login: `{"token": "..."}` sets the session cookie |
| `GET /api/session` | `{"ok": true}` when logged in, else 401 |
| `DELETE /api/session` | logout: clears the cookie |

## Browser login

A web page (the Agent Office) cannot hold the token, so it trades it once:

1. The page posts the token to `POST /api/session`.
2. The hub answers with a `raygent_hub` cookie: `HttpOnly` (page scripts cannot read it), `Secure` behind TLS, `SameSite=Strict` (other sites cannot use it), limited to `/api`, valid for 30 days.
3. Every later request, including the live stream, carries the cookie on its own.

The cookie is an expiry signed with the token, so the hub stores nothing. To log every browser out, put a new token in `~/.raygent/hub/token` and restart the hub; then log the laptops in again.

## Files

| Path | Where | Holds |
|---|---|---|
| `~/.raygent/hub/token` | server | the token (mode 600) |
| `~/.raygent/hub/agents.json` | server | the agents |
| `~/.raygent/hub/events.jsonl` | server | every event; the last 24 hours rebuild the status on restart |
| `~/.raygent/hub.json` | laptop | hub URL and token (mode 600) |
| `<config dir>/settings.json` | laptop | the hooks `install-hooks` adds |

## Privacy

The start of each prompt (120 characters) is stored on the server as the task title. Do not paste a secret at the very start of a prompt. Anyone with the token can read every status and edit agents, so treat it like a password.

## Troubleshooting

- **`status` says it cannot reach the hub.** Check `raygent doctor`, then `curl https://<hub>/api/health`.
- **"the hub refused this token".** The token in the pipe does not match the server's. Read it again from `~/.raygent/hub/token`.
- **A session shows as unassigned.** No agent has its account, or the agent lists other projects. Check `raygent hub agent list`.
- **Nothing shows at all.** Run `raygent hub install-hooks`, then start a new session; open sessions keep the hooks they started with.
