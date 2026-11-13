# Orca plugin

[raygent-orca](https://github.com/arayhan/raygent-orca) is a plugin for [Orca](https://orca.app) that shows and edits the raygent account policy of the focused workspace. It also picks the right account when Orca launches Claude.

Think of it as the rule card from [Accounts](accounts.md), pinned to the side of every workspace so you never have to look it up.

## What you see

A **Raygent Accounts** panel in the right sidebar lists every registered account:

- the allowed ones first, in fallback order, then the rest;
- which of them is rate-limited;
- which one is Orca's active account;
- which one the next launch gets, marked `next`.

A status bar item carries the same summary. Pressing it refreshes.

## Quick start

```bash
npm i -g raygent
raygent accounts discover          # register your logins once
raygent accounts allow personal    # in a project: who may run here
```

Then open the Raygent Accounts panel in Orca.

## Editing the policy

| Button | Does |
|---|---|
| Allow | add an account at the end of the list |
| Remove | drop it from the list |
| Arrow | move it up one place |
| Clear policy | let the project use any account again |
| Allow only this | start a policy on a project that has none |

It writes the same `projects` entry `raygent accounts allow` writes, and nothing else in the file.

## Switching accounts

```
Orca launches Claude in a workspace with a policy
   │
   ▼
agent.launch.before hook
   │
   ▼
rewrite to: raygent claude --account <next> …
```

- **Per launch, automatic.** The launch runs as the first allowed account that is not rate-limited, whatever account is active in Orca. If every allowed account is limited, it still launches on the first. Turn this off with the setting *Pick the account per workspace policy*; the policy is then only shown.
- **Make active.** The button on a row runs `orca account select --agent claude --account <id>`, so Orca's own active account changes for every later launch. Only accounts Orca manages get the button.

A Claude session that is already open keeps its account. Switching means a new tab.

## Permissions

| Permission | Why |
|---|---|
| `workspace:read` | know which workspace is focused and map launches to projects |
| `terminal:send` | the button that opens a terminal running `raygent claude` or `raygent gemini` |
| `settings:own` | the enforce toggle |

`raygent` and `orca` must be on the PATH of the machine Orca runs on.

## Files

The plugin reads `~/.raygent/accounts.json` and never sees a token. The panel updates when the focus moves or the file changes, whether the CLI or a Claude Code hook rewrote it.

## Troubleshooting

- **The panel is empty.** No accounts are registered yet. Run `raygent accounts discover`.
- **A launch uses the wrong account.** Check that the enforce setting is on and that `raygent` is on Orca's PATH.
