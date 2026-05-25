# PECS Sample Usage: Your First Working Example

This guide shows the simplest way to understand PECS by using it once from end
to end.

PECS has three parts:

| Part | Folder | Simple meaning |
| --- | --- | --- |
| Desktop app | `desktop/` | Starts the local PECS service/API. |
| CLI | `cli/` | Lets you talk to PECS from the terminal. |
| VS Code extension | `extension/` | Lets you use PECS inside VS Code. |

If you are new, start with the desktop app plus CLI. That is the easiest path
to see the tool working.

## What You Will Do

You will:

1. Start PECS Desktop.
2. Confirm the local API is running.
3. Record a sample engineering memory.
4. Search for that memory.
5. Understand how this maps to the VS Code extension.

## Step 1: Build the Project

Open PowerShell in the project root:

```powershell
cd E:\ClaudeProjects\Personal-Engineering-Cognition-System
```

Build the desktop app:

```powershell
cd desktop
npm install
npm run build
```

Build the CLI:

```powershell
cd ..\cli
npm install
npm run build
```

## Step 2: Start PECS Desktop

In one PowerShell window:

```powershell
cd E:\ClaudeProjects\Personal-Engineering-Cognition-System\desktop
npm start
```

Keep this window open. This starts the PECS desktop app and a local API at:

```text
http://127.0.0.1:39457
```

PECS also creates an API token file at:

```text
C:\Users\<your-user>\.pecs\api-token
```

The CLI reads that token automatically.

## Step 3: Check That PECS Is Running

Open a second PowerShell window:

```powershell
cd E:\ClaudeProjects\Personal-Engineering-Cognition-System\cli
node dist\index.js status
```

Expected output will look similar to:

```text
PECS Desktop v0.6.0
Memories : 0
Uptime   : 12s
API      : http://127.0.0.1:39457
```

If you see this, PECS is initialized and reachable.

## Step 4: Record Your First Memory

Run this from the `cli/` folder:

```powershell
node dist\index.js record --title "First PECS memory" --content "I initialized PECS Desktop, connected through the CLI, and recorded my first engineering memory." --type learning --tags onboarding,cli,first-run
```

Expected output:

```text
Memory recorded: "First PECS memory" (<generated-id>)
```

What happened:

- The CLI sent your memory to PECS Desktop.
- PECS Desktop stored it locally.
- The memory is now searchable.

## Step 5: Search the Memory

Run:

```powershell
node dist\index.js search "first PECS memory"
```

Expected output:

```text
1. [score%] First PECS memory  (memory-type · workspace-id)
   I initialized PECS Desktop, connected through the CLI...
```

Try a conceptual search too:

```powershell
node dist\index.js search "initialized the tool"
```

This is the core idea of PECS: capture engineering context now, retrieve it
later when you need it.

## Step 6: View the Raw API

The status route does not require a token:

```powershell
Invoke-RestMethod http://127.0.0.1:39457/api/v1/status
```

For protected API routes, read the token:

```powershell
$token = Get-Content "$env:USERPROFILE\.pecs\api-token"
```

Search through the API:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:39457/api/v1/memories/search?q=first%20PECS%20memory" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Step 7: Use the VS Code Extension

The VS Code extension is the editor interface for the same idea.

From the project root:

```powershell
cd extension
npm install
npm run build
npm run watch
```

Then:

1. Open the repo in VS Code.
2. Press `F5`.
3. A new Extension Development Host window opens.
4. Open the Command Palette.
5. Run `PECS: Record Engineering Memory`.
6. Run `PECS: Search Engineering Memory`.

Use the extension when you want PECS inside your coding workflow. Use the CLI
when you want fast terminal access.

## A Real Example Scenario

Imagine you debugged an authentication issue.

Record it:

```powershell
node dist\index.js record `
  --title "Auth token bug in local API" `
  --content "The CLI returned HTTP 401 because it could not find ~/.pecs/api-token. The fix was to start PECS Desktop first so the token file was created." `
  --type debug `
  --tags api,auth,cli,desktop
```

Later, search for it:

```powershell
node dist\index.js search "why did CLI return 401"
```

This is how PECS becomes useful: every debugging session becomes searchable
engineering memory.

## Common Problems

| Problem | Meaning | Fix |
| --- | --- | --- |
| `PECS Desktop is not running or unreachable` | The CLI cannot reach the local API. | Start `desktop` with `npm start`. |
| `HTTP 401` | The CLI token is missing or wrong. | Confirm `C:\Users\<your-user>\.pecs\api-token` exists. |
| Port already in use | Something else is using `39457`. | Set `PECS_PORT` consistently for desktop and CLI. |
| No search results | No matching memories exist yet. | Record a sample memory first. |
| AI commands fail | No AI provider is configured. | Start with memory record/search before AI features. |

## Mental Model

Think of PECS like this:

```text
You learn something while engineering
  -> record it as memory
  -> PECS stores it locally
  -> search retrieves it later
  -> workflows and reports turn repeated memory into engineering signal
```

Start small. Record one real debugging note today. Search it tomorrow. That is
the habit the tool is built around.

