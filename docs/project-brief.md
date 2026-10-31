# PROJECT: PREMIUM SAAS WEBSITE + SUBSCRIPTION MANAGEMENT SYSTEM

You are an expert full-stack developer, Odoo developer, UI/UX designer and software architect. I am participating in the **Odoo x Make-A-Ton 9.0 Hackathon 2026**.

Our problem statement is:

**Subscription Management System**

We are building a professional subscription management platform for a fictional B2B SaaS company. The company sells software products and recurring subscription plans to startups, small businesses and enterprises.

Your job is to inspect my CURRENT GitHub repository and develop this project inside that repository.

## 1. IMPORTANT: INSPECT BEFORE CODING

Before making changes:

- Inspect the complete existing repository structure.
- Identify the current programming languages, frameworks, dependencies and existing functionality.
- Check the Git branch, remote repository and existing commits.
- Preserve all existing working code and functionality.
- Do not delete or overwrite existing project files unnecessarily.
- Identify whether this repository already contains an Odoo custom module or another application.

Our hackathon environment is an Odoo-hosted website at https://mits-kochi.odoo.com/.

**Odoo compatibility is important.** Determine whether the target environment supports custom Python modules or only standard Odoo Online customization.

If custom modules are supported, prioritize a proper Odoo implementation using the Odoo ORM, Python models, XML views, menus, security rules and website templates.

If the environment is Odoo Online and does not support custom server-side modules, do not pretend that custom Python modules can be installed there. Explain the limitation and propose a compatible implementation using available Odoo applications and supported integrations.

Do not create a disconnected mock application and claim that it is integrated with Odoo.

## 2. DESIGN DIRECTION

Use the Odoo website shown in my reference screenshots as UI inspiration.

I like its:
- Minimal, spacious layout.
- Elegant navigation bar.
- Large hero section.
- Alternating image-and-text sections.
- Product/service cards.
- FAQ section.
- Strong call-to-action buttons.
- Professional footer.

However, I want our own distinctive SaaS identity, not a copy of the sample IT services website.

### Brand identity

Use the working company name **Berryloop** for now. Keep it easy to rename later.

The visual theme should be inspired by a sophisticated red velvet / berry / cream aesthetic.

Colour palette:
- Deep velvet burgundy: #641F32
- Berry red: #B93643
- Dusty rose: #D98D91
- Soft blush: #F3DAD5
- Warm cream: #FFF8F1
- Dark text: #242124

Design requirements:
- Premium, modern, minimal SaaS aesthetic.
- Clean typography, preferably Manrope or DM Sans.
- Soft rounded cards.
- Subtle shadows and borders.
- Beautiful spacing and alignment.
- Elegant hover interactions and transitions.
- Responsive desktop, tablet and mobile layouts.
- Avoid excessive gradients, excessive animations and generic AI-generated website styling.
- Use real, meaningful product content instead of Lorem Ipsum.
- Do not use unrelated stock imagery.

The final result should look like a polished commercial SaaS platform.

## 3. PUBLIC WEBSITE

Build a professional marketing website with the following sections.

### Navigation bar
- Berryloop logo.
- Home.
- Products.
- Pricing.
- About.
- Contact.
- Login.
- Get Started.

### Hero section

Headline:
"Business, beautifully connected."

Supporting text:
"Manage your business subscriptions, billing and payments through one intelligent platform."

Buttons:
- Explore Products.
- Get Started.

Use a visually appealing SaaS dashboard/product illustration.

### Software products

Show four example products:

1. Berryloop CRM — Customer relationship management.
2. Berryloop HR — Employee and workforce management.
3. Berryloop Analytics — Business intelligence and analytics.
4. Berryloop Flow — Workflow and task automation.

Each product should have:
- Product name.
- Short description.
- Features.
- Available subscription plans.
- View Details button.

### Pricing section

Show subscription plans with monthly and yearly billing options.

Include realistic example plans:
- Starter.
- Professional.
- Enterprise.

Prices and features must come from backend data, not hardcoded static frontend cards.

### Other sections
- Why Choose Berryloop?
- Key Features.
- How It Works.
- Customer testimonials (clearly identified as sample/demo content).
- Frequently Asked Questions.
- Contact section.
- Professional footer.

## 4. CUSTOMER AUTHENTICATION AND PORTAL

Implement proper authentication and authorization.

Requirements:
- Customer registration.
- Login and logout.
- Unique email validation.
- Strong password validation.
- Password reset workflow.
- Customer dashboard.
- Profile management.
- View own subscriptions.
- View subscription status and renewal dates.
- View invoices.
- View payment history.
- View outstanding balances.
- Manage permitted renewals, pauses and cancellations.

Customers must NEVER be able to access another customer's records.

## 5. SUBSCRIPTION MANAGEMENT

Implement the complete subscription lifecycle:

Draft → Quotation → Confirmed → Active → Closed.

Every subscription must have:
- Unique subscription number.
- Customer.
- Subscription plan.
- Start date.
- End date.
- Renewal date.
- Payment terms.
- Subscription products.
- Quantities.
- Unit prices.
- Applicable taxes.
- Total amount.
- Current status.

Support:
- Daily, weekly, monthly and yearly billing.
- Minimum quantities.
- Subscription renewal.
- Pause and resume where permitted.
- Early closure where permitted.
- Automatic closure on expiry where configured.
- Subscription history.

All transitions must be validated.

## 6. PRODUCTS AND PLANS

Administrators should be able to create and manage products and plans.

Product fields:
- Name.
- Description.
- Product type.
- Sales price.
- Cost price.
- Variants.
- Notes.
- Availability.

Plan fields:
- Name.
- Price.
- Billing interval.
- Minimum quantity.
- Available from/to dates.
- Auto-close setting.
- Renewal permissions.
- Pause permissions.
- Early closure permissions.

Use actual database records.

## 7. QUOTATIONS AND INVOICES

Implement:
- Quotation creation from subscription templates.
- Quotation validity period.
- Product and plan lines.
- Automatic conversion to subscription after confirmation.
- Invoice generation according to the billing interval.
- Applicable taxes.
- Invoice numbering.
- Invoice statuses: Draft, Confirmed, Paid.
- Invoice confirmation, cancellation and sending.
- Printable invoices.

CRITICAL:
Prevent duplicate invoices and missed billing periods.

Billing logic must be date-aware, reliable and tested. Do not generate invoices repeatedly for the same billing period.

## 8. DISCOUNTS

Admin-only discount management.

Support:
- Fixed discounts.
- Percentage discounts.
- Minimum purchase amounts.
- Minimum quantities.
- Validity periods.
- Usage limits.
- Product-specific discounts.
- Subscription-specific discounts.

Automatically apply eligible discounts to the appropriate next invoice.

Expired or exhausted discounts must no longer apply.

## 9. PAYMENT MANAGEMENT

Allow recording payments against invoices.

Payment fields:
- Invoice.
- Customer.
- Payment method.
- Amount.
- Payment date.
- Reference or note.

Support:
- Partial payments.
- Full payments.
- Outstanding balance.
- Overdue status.
- Payment history.

Prevent payments exceeding the outstanding amount unless a deliberate overpayment workflow is implemented.

## 10. ADMIN AND STAFF ROLES

Implement role-based access control.

Admin:
- Full system access.
- Manage customers.
- Add and manage staff.
- Manage products and plans.
- Manage subscriptions.
- Manage invoices and payments.
- Configure discounts.
- View analytics.

Staff:
- Limited operational permissions.
- Manage permitted customer and subscription records.
- Access invoices and payments according to permissions.
- Cannot create administrators or other staff accounts unless explicitly authorized.

Customer:
- Access only their own account, subscriptions, invoices and payments.

Do not rely only on hiding frontend buttons. Enforce permissions on the backend.

## 11. ADMIN DASHBOARD

Create a premium, useful dashboard showing:

- Total customers.
- Active subscriptions.
- New subscriptions.
- Monthly recurring revenue (MRR).
- Annual recurring revenue (ARR).
- Total revenue.
- Payments received.
- Outstanding invoices.
- Overdue invoices.
- Subscription cancellations.

Include:
- Revenue charts.
- Subscription growth charts.
- Subscription status distribution.
- Recent transactions.
- Recent subscriptions.
- Date filters.
- Status filters.

All figures and charts must use actual database data.

## 12. PERFORMANCE AND QUALITY

The application must:
- Use a proper database and backend.
- Support dynamic data.
- Have robust validation.
- Handle errors gracefully.
- Avoid duplicate records.
- Use secure authentication.
- Enforce authorization.
- Avoid exposing sensitive information.
- Use pagination for large datasets.
- Be responsive.
- Have intuitive navigation.

Aim for dashboard and page response times below two seconds with thousands of subscription records, where the environment allows.

Do not use static JSON as the permanent data source.

## 13. GITHUB REQUIREMENTS

This project MUST be developed inside my existing GitHub repository.

- Preserve the existing Git history.
- Do not create a separate unrelated project.
- Keep the code organized and maintainable.
- Create a detailed README.md.
- Document installation and setup.
- Document the database.
- Document the application architecture.
- Document the roles and permissions.
- Include environment variable examples without real secrets.
- Add meaningful Git commits after logical milestones.
- Commit regularly, ideally at least once per hour.
- Keep the main branch stable.
- Do not commit passwords, API keys, database credentials or other secrets.
- Do not overwrite or force-push the remote repository.
- Push changes only when the Git remote and authentication are available and the operation is safe.

## 14. TESTING

Test the important workflows:

1. Customer registration and login.
2. Admin creating a product.
3. Admin creating a subscription plan.
4. Customer selecting a plan.
5. Subscription confirmation.
6. Subscription activation.
7. Automatic invoice generation.
8. Payment recording.
9. Partial payment and outstanding balance.
10. Discount application.
11. Subscription renewal.
12. Subscription cancellation.
13. Customer access restrictions.
14. Staff access restrictions.
15. Dashboard calculations.

Write automated tests for critical backend logic wherever the chosen framework supports it.

## 15. DEVELOPMENT APPROACH

Work in stages:

Stage 1: Repository audit and technical architecture.

Stage 2: Establish the application structure and design system.

Stage 3: Implement the public website.

Stage 4: Implement authentication and role permissions.

Stage 5: Implement products, plans and subscriptions.

Stage 6: Implement quotations, invoicing and billing automation.

Stage 7: Implement discounts and payments.

Stage 8: Implement dashboards and reporting.

Stage 9: Testing, bug fixing and performance improvements.

Stage 10: Documentation and GitHub commits.

Do not stop after generating a homepage or a static frontend.

Do not claim that a feature works unless it has actually been implemented and tested.

Prioritize a working end-to-end subscription workflow over unnecessary animations or decorative features.

**FINAL GOAL:** Build a complete, polished and demonstrable Subscription Management System suitable for the Odoo x Make-A-Ton 9.0 Hackathon, with a beautiful SaaS website inspired by the reference screenshots, genuine backend functionality, reliable subscription billing and a professional GitHub repository.

Start by auditing my repository and reporting the existing stack, Odoo compatibility and proposed architecture. Then proceed with implementation without destroying existing work.