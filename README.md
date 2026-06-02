# Kaareke - Kindergarten Timetable & Daily Logs

Kaareke is a premium, high-performance TypeScript single-page web application designed to track your child's daily kindergarten schedule and log notes and milestones. It connects directly to a **Google Sheet** (or a local CSV backup) to display the timetable of the week and parses easily-editable **Markdown** files to display diary entries and informational pages.

---

## 🚀 Key Features

1. **Active Timetable Tracking:** Automatically detects the current time and highlights the ongoing activity (from 7:00 AM to 8:00 PM) with a glowing, pulsing active status.
2. **Weekly Matrix Grid:** A beautiful, interactive week-view matrix showing all slots from Monday to Sunday. The current day and time slot are highlighted dynamically.
3. **Google Sheets Sync:** Paste your published Google Sheet CSV URL into the app's settings. The app will cache it in `localStorage` and retrieve it dynamically, falling back to the local backup if offline.
4. **Markdown Diary Integration:** Keeps a text-based history of child logs (with picture support) in a single Markdown file (`content/logs.md`). Each entry is parsed on the fly and mapped to the dashboard based on date headers (`## YYYY-MM-DD`).
5. **Aesthetic Dark Mode:** A premium dark theme with custom scrollbars, animations, and fluid transitions.
6. **Robust Deployment Script:** Features a self-contained deployment script (`scripts/deploy.sh`) based on the `pom_tracker` worktree push mechanism.

---

## 📂 Project Structure

All files that you want to edit and update are consolidated inside the `content/` directory at the project root for ultimate convenience:

```text
kaareke/
├── content/                     <-- ALL YOUR INPUTS GO HERE!
│   ├── about.md                 # Description of the kindergarten, group teachers, contacts
│   ├── logs.md                  # Unified text file containing daily logs/diary entries
│   └── timetable.csv            # Default timetable (Monday-Sunday, 07:00-20:00)
├── scripts/
│   └── deploy.sh                # Deployment script (builds + pushes to gh-pages worktree)
├── src/                         # Application source code (TypeScript & CSS)
│   ├── main.ts
│   └── style.css
├── index.html                   # HTML Skeleton
└── tsconfig.json                # TypeScript Configuration
```

---

## 📑 How to Format the Markdown Inputs

The app acts as a viewer for your markdown files, rendering headings, lists, bold text, blockquotes, and images dynamically.

### 1. Daily Logs (`content/logs.md`)
To map a log to a specific date on the timeline and logs panel, use the `## YYYY-MM-DD` heading level 2 format:

```markdown
# Kaareke Daily Logs

Use this file to record what your child did at kindergarten, upload photos, and keep track of milestones!

## 2026-06-02
- **Drop-off:** 08:15 AM
- **Pick-up:** 04:30 PM by Dad
- **Activities:** Outdoor painting, sandbox play.
- **Notes:** He ate all of his lunch today. Was very excited to show the drawing of a tractor.
- **Photos:**
  ![Tractor Drawing](https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=60)

## 2026-06-01
- **Drop-off:** 08:30 AM
- **Activities:** Morning music class.
```

### 2. About Kaareke Info (`content/about.md`)
Write standard markdown about contacts, teachers, or groups:

```markdown
# About Kaareke Kindergarten

## Contact & Teachers
- **Group Teacher:** Maria Tamm (Group: Ladybugs)
- **Phone:** +372 555 1234
```

---

## 📊 How to Sync Google Sheets & Google Docs

To run the application dynamically from the cloud, you can connect your own Google Sheets (for the schedule) and Google Docs (for Markdown inputs).

### 1. Connect Google Sheets (Schedule)
1. Open Google Sheets and create a sheet.
2. Structure the sheet with columns starting with `Time` followed by the days of the week:
   `Time, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`.
3. Set the first column rows to hours (e.g., `07:00`, `08:00` ... `20:00`). Fill cell values with activities.
4. Go to **File** > **Share** > **Publish to web**.
5. Select the **Link** tab, choose your specific sheet, choose **Comma-separated values (.csv)**, and click **Publish**.
6. Copy the published link (e.g., `https://docs.google.com/spreadsheets/d/.../pub?output=csv`) and paste it into the **Google Sheets CSV URL** field in the Settings panel.

### 2. Connect Google Docs (About & Diary Logs)
1. Create a Google Doc for the **About** description (or use your existing one).
2. Create another Google Doc for your **Daily Logs** (you can write standard Markdown inside it, using `## YYYY-MM-DD` headers for entries).
3. In each Google Doc, click the **Share** button in the top right corner and set general access to **"Anyone with the link can view"** (this is required so the app can read it).
4. Copy the browser address link for each document (e.g., `https://docs.google.com/document/d/<DOC_ID>/edit`).
5. Open the Settings panel in the app (gear icon in the sidebar or bottom mobile nav), paste the document links into their respective fields (**Google Docs About URL** and **Google Docs Logs URL**), and click **Save Settings**.
6. The app will fetch the plain text markdown of the docs, render it, and display a green **Synced with Google Docs** badge. If offline or unconfigured, it falls back to your local `content/about.md` and `content/logs.md` files automatically.

---

## 🛠️ Local Development & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   *Note: This automatically copies root `content/` files to `public/content/` so they are accessible by Vite during development.*

3. **Compile for Production:**
   ```bash
   npm run build
   ```
   *Compiles TypeScript, packages assets, and outputs a static site to the `build/` folder.*

---

## 🚀 Deployment

The deployment script replicates the pipeline used in `pom_tracker`:
1. It builds the compiled static site into `/build`.
2. It fetches and checks out the `gh-pages` branch in a temporary git worktree folder.
3. It cleans the worktree, copies `/build` contents, commits the change, and pushes back to the remote `gh-pages` branch.

To deploy, simply run:
```bash
./scripts/deploy.sh
```
*(If no git remote `origin` is configured, it will commit locally to your local `gh-pages` branch for safe verification).*
