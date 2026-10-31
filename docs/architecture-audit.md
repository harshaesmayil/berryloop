# Berryloop: Repository Audit and Architecture Notes

Status: **Draft. Architecture is NOT final.** It depends on confirming the Odoo hosting restrictions (see section 5).

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
