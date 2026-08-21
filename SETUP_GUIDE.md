# Setting Up the VS Code + Claude Code Workflow

**Who this is for:** LEEP research team members who have never used git, Claude Code, or SQL. You do **not** need any of those skills before starting. This guide gets your computer set up and walks you through making your first change safely.

**How long:** About 30-45 minutes the first time, most of it waiting for installs. Do it before Session 3. 

**The mental model, in one paragraph:** The pipeline is a set of instructions (written in a language called SQL) that turn our raw Google Sheets into the impact numbers on the dashboards. Those instructions live in a shared online folder on GitHub called `leep-dataform`. You'll copy that folder onto your laptop, open it in an editor called VS Code, and use an AI assistant called Claude Code to read and change the instructions. When you're done, you propose your change for review — nothing you do can affect the real numbers until it's reviewed and approved.

---

## Part 0 — What you're installing and why

You'll install six things. You don't need to understand them deeply; here's the one-line version of each.

| Tool | What it is | Why you need it |
|------|-----------|-----------------|
| **VS Code** | A text editor for code | Where you'll open and view the files |
| **Git** | Software that tracks changes to files | The system that lets many people edit safely without overwriting each other |
| **A GitHub account** | The website that stores the shared folder | Where the master copy of the code lives and where reviews happen |
| **Node.js** | A programming runtime | Needed to install the Dataform tool below |
| **Dataform CLI** | The tool that runs our pipeline | Lets you test that your change works |
| **Google Cloud CLI (`gcloud`)** | Google's command-line tool | Logs you in to BigQuery so you can run and check the pipeline |
| **Claude Code** | An AI coding assistant | Reads, explains, and writes the SQL for you |

A note on **"the terminal"**: several steps ask you to type a command into a terminal (a text window where you type instructions instead of clicking). On **Mac** this app is called **Terminal**. On **Windows** you'll use **Git Bash**, which gets installed with Git in Part 2. When a step says "in the terminal," open that app and type the command, then press Enter. Copy-paste is fine and encouraged.

---

## Part 1 — Install VS Code

**Mac and Windows are the same here.**

1. Go to <https://code.visualstudio.com>
2. Click the big download button (it detects your OS automatically).
3. Open the downloaded file and install:
   - **Mac:** drag the Visual Studio Code icon into your Applications folder.
   - **Windows:** run the installer. When it asks, **tick "Add to PATH"** and **"Open with Code"** options — leave the rest as default.
4. Open VS Code once to confirm it launches. You can close it again.

---

## Part 2 — Install Git

### Mac

1. Open **Terminal** (press `Cmd+Space`, type "Terminal", press Enter).
2. Type this and press Enter:
   ```bash
   git --version
   ```
3. If git is already installed you'll see a version number — skip to Part 3. If not, Mac will pop up a window offering to install the "command line developer tools." Click **Install** and wait.

### Windows

1. Go to <https://git-scm.com/download/win> and download the installer.
2. Run it. Accept the defaults on every screen **except**: when it asks about the default editor, you can leave it as-is, and make sure **"Git Bash"** is included (it is by default).
3. When finished, open **Git Bash** from the Start menu — this is your terminal for the rest of the guide.

**Set your name and email** (both OS — do this in Terminal / Git Bash). Use your LEEP email:
```bash
git config --global user.name "Your Name"
git config --global user.email "you@leadelimination.org"
```

---

## Part 3 — Get a GitHub account and repo access

1. If you don't have a GitHub account, create one free at <https://github.com/signup> using your LEEP email.
2. The repo is public, please let David know if you can't see/access it.

---

## Part 4 — Copy the repo onto your laptop ("cloning")

"Cloning" just means downloading your own copy of the shared folder, linked back to the original so you can sync changes.

1. In the terminal, move to where you want the folder to live (your home folder is fine):
   ```bash
   cd ~
   ```
2. Clone the repo:
   ```bash
   git clone https://github.com/david-leep/leep-dataform.git
   ```
   - The first time, GitHub may ask you to log in. Follow the browser prompt to authorize. If it asks for a password on the command line, that won't work — instead, when the browser window opens, click **Authorize**. (GitHub no longer accepts account passwords in the terminal; the browser login replaces it.)
3. Move into the folder:
   ```bash
   cd leep-dataform
   ```
4. Open it in VS Code:
   ```bash
   code .
   ```
   (That's `code` then a space then a dot. If `code .` doesn't work on Mac, open VS Code manually, then File → Open Folder → choose `leep-dataform`.)

You should now see the project's files in VS Code's left sidebar — `definitions/`, `README.md`, and so on.

---

## Part 5 — Install Node.js and the Dataform tool

1. Go to <https://nodejs.org> and download the **LTS** version (the left/green button). Install with all defaults.
2. **Close and reopen your terminal** (important — it needs to pick up the new install).
3. Confirm it worked:
   ```bash
   node --version
   ```
   You should see a version number like `v20.x.x`.
4. Install the Dataform tool. We pin the exact version the project uses:
   ```bash
   npm install -g @dataform/cli@3.0.42
   ```
5. Confirm:
   ```bash
   dataform compile
   ```
   Run this **from inside the `leep-dataform` folder**. "Compile" checks the code makes sense without running anything or touching any data — it's completely safe. If it prints a compilation summary with no errors, you're good. (If it complains it can't find the project, make sure you're inside the folder: `cd ~/leep-dataform`.)

---

## Part 6 — Connect to BigQuery (Google Cloud login)

This lets you actually **run** the pipeline and check the numbers, not just compile it.

You never run the pipeline as yourself. Your login lets you *borrow* a dedicated pipeline
identity called `dataform-sandbox`, which can write your own sandbox datasets but **cannot
write production** — so a mistyped command fails with a permission error instead of
overwriting the real dashboards. It also means you need no Google Drive setup: the source
spreadsheets are read by that identity, not by your account.

**Before you start:** ask David to add you to `research@leadelimination.org`. That group
grants both the permission to borrow the pipeline identity and read access to BigQuery.
Nothing below will work until you are in it.

1. **Install the Google Cloud CLI:**
   - **Mac:** easiest is via Homebrew if you have it (`brew install --cask google-cloud-sdk`). If you don't have Homebrew, follow the installer at <https://cloud.google.com/sdk/docs/install-sdk> (choose macOS).
   - **Windows:** download and run the installer at <https://cloud.google.com/sdk/docs/install-sdk> (choose Windows). Let it install and, when it offers, run `gcloud init` at the end.
2. **Close and reopen your terminal**, then confirm:
   ```bash
   gcloud --version
   ```
3. **Log in as yourself** (this identifies you to Google Cloud):
   ```bash
   gcloud auth login
   ```
   A browser window opens — log in with your **LEEP Google account**.
4. **Set the project:**
   ```bash
   gcloud config set project leep-data-system
   ```
5. **Set up the pipeline identity.** Copy this whole command:
   ```bash
   gcloud auth application-default login \
     --impersonate-service-account=dataform-sandbox@leep-data-system.iam.gserviceaccount.com
   ```
   Log in with the same LEEP account and click **Allow**. This is what lets tools on your
   machine act as `dataform-sandbox`. No password or key file is involved, and access is
   removed the moment you leave the group.
6. **Create the Dataform credentials file.** From inside `leep-dataform`, run:
   ```bash
   dataform init-creds
   ```
   When prompted, choose **BigQuery**, project `leep-data-system`, location **europe-west4** (this is the "EU" region our data lives in). This creates a `.df-credentials.json` file — it's already git-ignored, so it stays private on your machine and won't be shared.

**Test your very first pipeline run — into your own private sandbox, never production:**
```bash
dataform run --schema-suffix yourname --tags staging
```
Replace `yourname` with your first name. The `--schema-suffix` part writes the results into datasets named `paint_yourname` instead of the real `paint` dataset. Always use it — and if you forget, the run now fails with `Access Denied` rather than touching production, because the pipeline identity you borrowed has no write access there. (More on this in Session 3.)

---

## Part 7 — Install Claude Code

Claude Code is the AI assistant that reads and writes SQL so you don't have to. You'll
use it as a panel docked inside VS Code, right next to your files.

1. **Install the underlying tool, one time only** (in the terminal):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
   This doesn't open anything yet — it just puts the tool on your machine so the VS
   Code extension below has something to run.
2. In VS Code, open the Extensions panel: `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows).
3. Search for **"Claude Code"** (published by Anthropic) and click **Install**.
4. Reload VS Code if it prompts you to.
5. Make sure the `leep-dataform` folder is open in VS Code (File → Open Folder, if it
   isn't already), then click the Claude Code icon in the left sidebar (or activity bar)
   to open the panel.
6. The first time, it'll ask you to log in with your Claude account in the browser.
   Follow the prompts.
7. You now have a chat panel **inside the project**, which means Claude Code can see all
   the files. Try asking it something real:
   > Explain what the file definitions/marts/paint_summary_by_country.sqlx does, in plain English.

   It'll read the file and explain. This is the core loop: you ask, it reads/explains/edits,
   you review. **Keep the `leep-dataform` folder open in VS Code every time** so the panel
   has the project's files in view.

**If the extension panel says it can't find Claude Code:** step 1 didn't finish. Open a
terminal and re-run the `npm install` command, then reload VS Code.

---

## Part 8 — Your first change, end to end

This is the whole loop in miniature. Don't worry about making a "real" change yet — just walk the path. Session 3 gives you a real task.

**Step 1 — Start from an up-to-date copy and make your own branch.**
A "branch" is your private workspace — a parallel copy where your edits are isolated until reviewed. Never edit on `main` (the shared copy).
```bash
git checkout main
git pull
git checkout -b yourname-first-change
```
The last command creates and switches to your branch. Name it after yourself and what you're doing, e.g. `sarah-add-note`.

**Step 2 — Make a change with Claude Code.** Open the Claude Code panel in VS Code and ask for something tiny and safe, like improving a description:
> In definitions/marts/paint_summary_by_country.sqlx, improve the comment at the top to describe what the table contains. Show me the change before saving.

Read what it proposes. If it looks right, let it make the edit.

**Step 3 — Check it compiles.** Always do this after any edit:
```bash
dataform compile
```
No errors = the code still makes sense. Ask Claude Code to fix any errors it reports.

**Step 4 — (When your change affects numbers) run it in your sandbox and check.** For a comment change you can skip this, but for real changes:
```bash
dataform run --schema-suffix yourname --actions paint_summary_by_country
```
Then ask Claude Code to help you check the result in BigQuery. Session 3 covers this "verification ladder" in full.

**Step 5 — Save your change to your branch ("commit").** A commit is a labeled snapshot of your edits.
```bash
git add -A
git commit -m "Improve description on paint_summary_by_country"
```
The `-m` message should say what you did, in a few words.

**Step 6 — Send your branch to GitHub ("push").**
```bash
git push -u origin yourname-first-change
```

**Step 7 — Open a pull request (PR).** A PR says "here's my proposed change, please review it." The push above prints a link — open it, or:
1. Go to <https://github.com/david-leep/leep-dataform>.
2. GitHub shows a banner for your just-pushed branch — click **Compare & pull request**.
3. Write one or two sentences on what you changed and why.
4. Click **Create pull request**, then request **David** as reviewer.

**Step 8 — Wait for review.** An automatic check (compile) runs on your PR, and David reviews the code. **You cannot merge it into the real pipeline yourself** — that's the safety guarantee. Once approved and merged, your change is live. To start your next piece of work, go back to Step 1.

---

## The golden rules (screenshot these)

1. **Never edit on `main`.** Always make a branch first (`git checkout -b yourname-thing`).
2. **Always `dataform compile` after an edit.** It's free and catches most mistakes.
3. **Always run with `--schema-suffix yourname`.** A plain `dataform run` targets production; it will fail on permissions, but don't rely on that — pass the flag.
4. **Never open a PR with a line you can't explain.** Claude Code will explain any line — ask it. If you can't explain it, you're not ready to propose it.

---

## Quick troubleshooting

| Symptom | Likely fix |
|--------|-----------|
| `command not found: git / node / gcloud / dataform` | Close and reopen the terminal after installing; that step's install didn't finish, or needs a fresh terminal. |
| `code .` doesn't open VS Code (Mac) | Open VS Code → `Cmd+Shift+P` → type "install code command in PATH" → run it. Then retry. |
| Cloning or pushing asks for a password and fails | GitHub dropped password login. Complete the login in the **browser** window that opens instead. |
| `dataform compile` says it can't find the project | You're not inside the folder. Run `cd ~/leep-dataform` first. |
| `Permission 'iam.serviceAccounts.getAccessToken' denied` | You're not in `research@leadelimination.org` yet, or Part 6 step 5 wasn't run. Ask David to add you, then redo step 5. |
| A `dataform run` fails on a `stg_` table with a Drive error | The source sheet isn't shared with the pipeline service account. Ask David — it isn't about your own access to the sheet. |
| `Access Denied` writing to `paint` or `core` | You left off `--schema-suffix yourname`. This is the guardrail working; add the flag and re-run. |
| Claude Code doesn't seem to know about our files | The `leep-dataform` folder isn't open in VS Code. File → Open Folder → choose `leep-dataform`, then reopen the Claude Code panel. |
| Claude Code extension panel says it can't find Claude Code | Part 7 step 1 (the `npm install`) didn't finish. Open a terminal, re-run it, then reload VS Code. |

---
