# Berryloop Subscription Management System

Developed for Odoo x Make-A-Ton 9.0 Hackathon 2026.

## Project Overview
A subscription management system designed for Berryloop Software.

## Features
- User authentication and role-based access
- Product management
- Subscription plan management
- Subscription lifecycle tracking
- Automated invoice generation
- Discount and tax management
- Payment tracking
- Admin dashboard
- Customer portal

## Tech stack
- **Frontend:** React 18 + Vite (in `frontend/`)
- **Backend:** Django 5.2 + Django REST Framework on Python 3.12 (in `backend/`)
- **Database:** PostgreSQL
- **Charts (planned):** Chart.js

## Current status
Foundation only: project structure, custom user model with roles (admin, staff, customer),
register/login/logout/profile API, a login/register/dashboard frontend shell, and backend tests.
Products, plans, subscriptions, invoices, payments and reports are not built yet.

## Local setup (Windows PowerShell)

Prerequisites: Python 3.12, Node.js 20+ (LTS), PostgreSQL 16+.

### 1. Create the database
In a PowerShell window, open PostgreSQL's `psql` (installed with PostgreSQL) and run:

    CREATE USER berryloop WITH PASSWORD 'choose-a-password';
    CREATE DATABASE berryloop OWNER berryloop;

### 2. Backend
    cd "C:\Users\M S I\OneDrive\Desktop\berryloop\backend"
    py -3.12 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    copy .env.example .env
    # Open backend\.env and set POSTGRES_PASSWORD and DJANGO_SECRET_KEY
    python manage.py migrate
    python manage.py test
    python manage.py createsuperuser
    python manage.py runserver

The API runs at http://127.0.0.1:8000/api/health/ and the Django admin at http://127.0.0.1:8000/admin/.

### 3. Frontend (second PowerShell window)
    cd "C:\Users\M S I\OneDrive\Desktop\berryloop\frontend"
    npm install
    npm run dev

Open http://localhost:5173 in your browser.

If `Activate.ps1` is blocked, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Security notes
- Never commit `backend/.env` or real passwords. `.gitignore` excludes them.
- Role checks happen on the server (`accounts/permissions.py`), not only in the React app.
