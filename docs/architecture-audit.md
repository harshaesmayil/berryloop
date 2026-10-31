# Berryloop: Repository Audit and Architecture Notes

Status: **Proposal, awaiting approval.** Section 7 is the current recommendation. Sections 3–6 are kept as earlier notes. Earlier assumption: Berryloop must be an Odoo custom module. **This is superseded:** the Make-A-Ton rules allow any programming language, and the Odoo site is an optional design reference only.

---

## 1. Repository audit (Stage 1)

| Item | Finding |
|---|---|
| Repository | `harshaesmayil/berryloop` (public) |
| Default branch | `main` (remote head `a1fdd52`) |
| Working branch | `feature/berryloop-rebrand` |
| Commits | 3 in total: the original project commit history on `main`, then `77c62fc` (rename to Berryloop), then `2e9e208` (rebrand fixes and project brief) |
| Files in repository | `README.md`, `docs/project-brief.md`, `docs/architecture-audit.md` (this file) |
| Programming language | None yet. No source code exists. |
| Framework / dependencies | None. No `requirements.txt`, `package.json`, or Odoo `__manifest__.py`. |
| Odoo custom module | **No.** The repository is not an Odoo module. |
| Other application | **No.** |

**In plain language:** the repository is documentation only. We have a README and the project brief. There is no working application yet, so nothing has to be preserved except the documentation and history.

---

## 2. What the Git check found

- **Local branch and GitHub branch are the same commit.** Both point to `2e9e2087762b173dec11bad5b9ff1c1aae2a37a4`.
- **No uncommitted changes.** The working folder is clean.
- **No unpushed commits.** Every local commit is already on GitHub.

### What the "missing remote-tracking reference" means

Think of GitHub as a photo album and your computer as a notebook. When you clone a repo, Git keeps a "bookmark" of where each GitHub branch was the last time it was checked. That bookmark is called a **remote-tracking reference** (`origin/...`).

For our branch, the bookmark was not created when we cloned (we used a shallow clone, which only downloads the latest commit). So Git says "I don't know where the GitHub branch is," even though GitHub actually has it. The stop hook reads that missing bookmark and reports "no remote branch."

**Important:** this is a *local* bookmark problem only. Nothing is wrong on GitHub, and nothing was lost. The commits are safe.

---

## 3. Standard Odoo apps vs. a custom Odoo module

Odoo is a business software platform made of "apps" (Sales, Invoicing, Subscriptions, Website, and so on). There are two ways to build our subscription system on top of it.

### Option A: Standard Odoo applications (configuration only)

- You use the ready-made apps: **Website**, **Subscriptions**, **Invoicing**, **Payments**, **Discounts** (via pricelists), **Dashboards/Reporting**, and the built-in user roles.
- You don't write Python code. You configure products, plans, and settings through the Odoo screens. Odoo does the billing automatically.
- **Works on:** Odoo Online, Odoo.sh, and self-hosted.
- **Pros:** fastest, most reliable, lowest risk for a hackathon, supported by Odoo.
- **Cons:** we can only change what Odoo's standard features allow. Some brief requirements (custom discount rules, custom pause/cancel permissions) may be hard or impossible.

### Option B: A custom Odoo module (code)

- We write our own Odoo "module": Python classes for the data, XML for the screens and menus, security rules for who can see what, and website templates for the public pages.
- **Works only on:** Odoo.sh, or self-hosted Odoo where we can install custom code. **It does NOT work on Odoo Online** (the standard hosted plan), because Odoo Online doesn't let you install custom Python code.
- **Pros:** can meet every requirement in the brief, including custom billing and permission rules.
- **Cons:** more work, more risk, and it must be installed on a server we're allowed to use.

### Option C (fallback): Website-only frontend

- Build only the public website pages inside Odoo's website builder, and use standard apps for the data.
- Works on Odoo Online. Still a valid hackathon submission if the backend is standard Odoo.

**Rule from our brief:** we must NOT build an app outside Odoo and claim it is integrated with Odoo. That would not be honest and would not work at the hackathon.

---

## 4. Proposed order of work (once hosting is confirmed)

1. Confirm the Odoo hosting type (see section 5).
2. Choose Option A, B, or C.
3. Build the public Berryloop website pages (home, products, pricing, FAQ, contact).
4. Build customer login and the subscription flow.
5. Add invoices, payments, discounts, and the admin dashboard.
6. Test, document, and commit.

---

## 5. Hosting: what we still need to confirm

We do **not** yet know how `https://mits-kochi.odoo.com/` is hosted. The address pattern `*.odoo.com` is used by Odoo Online, but this has not been verified.

### About the Odoo.sh security email

You received a GitHub notice that Odoo.sh was authorized to access your GitHub account with the permissions `read:user` and `user:email`.

**What this authorization MEANS:**
- Odoo.sh is an Odoo hosting service that can connect to GitHub.
- You (or someone on your account) allowed Odoo.sh to **read your basic GitHub profile** (`read:user`) and **read your email address** (`user:email`).
- This is typically used to log in or link a GitHub account to an Odoo.sh project.

**What this authorization does NOT prove:**
- It does **not** prove that our hackathon site (`mits-kochi.odoo.com`) runs on Odoo.sh.
- It does **not** give Odoo.sh access to our repository's code, because `read:user` and `user:email` are limited to profile and email. (Repository access would need separate permissions.)
- It does **not** tell us whether custom modules are allowed on the hackathon site.

**Next step:** the hosting question must be answered by checking the Odoo admin area of `mits-kochi.odoo.com` (for example, whether the Apps menu lets you install custom modules) or by asking the hackathon organizers.

---

## 6. Open questions for you

1. Is `mits-kochi.odoo.com` on Odoo Online, Odoo.sh, or a self-hosted server?
2. Can you install custom modules there (Apps → Import Module / developer mode)?
3. Who is the hackathon organizer contact who can confirm this?

Nothing in this document starts application development. Development stays paused until these are answered.

---

## 7. Updated architecture assessment (current recommendation)

### 7.1 Facts we are working from

- The hackathon account on `mits-kochi.odoo.com` was created by the team member on a free trial. The organizers did not provide it or require Odoo.
- Make-A-Ton 9.0 rules, as reported by the team: all programming languages are welcome. Mandatory: dynamic data, responsive UI, validation, intuitive navigation, proper Git use. Backend APIs and local databases are nice-to-haves.
- **Decision:** Berryloop is a standalone application. The Odoo site is only a design reference for layout ideas.

### 7.2 Option 1: Standalone full-stack app (React + Django + PostgreSQL)

**Plain-language parts:**
- **React:** the part the user sees (pages, buttons, forms, charts).
- **Django (Python 3.12):** the "brain" on the server. It stores data, checks rules, calculates invoices, and decides who can see what.
- **PostgreSQL:** the database where all records live.

**Advantages**
- Meets every mandatory requirement with real, dynamic data.
- Django has a built-in admin, user accounts, password reset, and an ORM (ready-made tools for storing and querying data). This saves a lot of time.
- Django's model system makes role permissions and date-based billing easier to test.
- Testing is strong (Django test runner, pytest).
- Works on any hosting, and can run on a laptop for the demo.
- React gives a polished, responsive UI, which judges will notice.

**Disadvantages**
- Two codebases to run (frontend and backend), plus a database. More setup for a beginner.
- Time-consuming to build a full app in a hackathon window.
- Needs careful handling of login between the React frontend and the Django backend.

### 7.3 Option 2: Single-framework app (Django templates only)

- Django renders the HTML pages itself, with a little JavaScript for charts.
- **Advantages:** one codebase, one language, easiest for a beginner, fastest to a working demo.
- **Disadvantages:** less flexible-looking UI than React; still needs careful design work for a "premium" look.

### 7.4 Option 3: Odoo-based implementation

- Use Odoo's built-in Website, Subscriptions, Invoicing and Payments apps on the trial account.
- **Advantages:** very fast billing, invoicing and payments already exist.
- **Disadvantages:**
  - Free trial may not include all apps, and paid apps may be required (to be checked on the Odoo site; not verified).
  - Custom rules (custom discount logic, custom pause/cancel permissions) are hard within standard Odoo.
  - The team's own account is not an organizer-provided environment, so judges may question whether it is "the official" build.
  - Hard to show our own code and architecture, which the brief asks us to document.

### 7.5 Comparison

| Area | React + Django + PostgreSQL | Django templates only | Odoo-based |
|---|---|---|---|
| Meets mandatory rules | Yes | Yes | Mostly |
| Custom billing rules | Full control | Full control | Limited |
| Shows our own code | Yes | Yes | Limited |
| Beginner friendly | Medium | High | Medium |
| Time to working demo | Longer | Shortest of the code options | Short, but unclear cost/limits |
| Responsive, premium UI | Strongest | Good with care | Limited by theme |

### 7.6 Recommendation

**Use Django (Python 3.12) + PostgreSQL for the backend, with a React frontend.**

Reasons:
1. It meets the full brief with real code, real data, and real rules.
2. Django already provides login, roles, admin screens, and database tools.
3. React gives the premium, responsive look the brief asks for.
4. It doesn't depend on a trial account or paid Odoo apps.

**Fallback, if time runs short:** keep Django and PostgreSQL but use Django templates instead of React for the frontend. The backend stays the same, so this is a small change.

**Demo plan:** PostgreSQL in Docker (or SQLite for a quick local demo), seeded sample data, and a single command to start the app.

### 7.7 Proposed design notes (for approval)

- **Billing:** a Django management command creates invoices for each subscription's next billing period, and a database check prevents duplicates for the same period.
- **Payments:** recorded manually by staff (no real payment gateway). Partial payments update the outstanding balance.
- **Roles:** Django groups for Admin, Staff and Customer, enforced on the server.
- **Public site data:** products and plans come from the database, not hardcoded in React.
- **Repository:** keep `main` stable. Build on `feature/berryloop-rebrand` or a new feature branch. Keep the existing README and docs.

### 7.8 What needs your approval

1. Standalone React + Django + PostgreSQL (recommended), or Django templates only.
2. Whether to keep the Odoo trial account as a design reference only.
3. Whether the demo can run locally with Docker.

No implementation will start until you approve.
