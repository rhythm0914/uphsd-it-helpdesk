# UPHSD IT Help Desk

A full-stack IT help desk application for the University of Perpetual Help System Dalta (UPHSD), built with Next.js 16, TypeScript, Tailwind CSS v4, Supabase, and deployed on Cloudflare Workers via vinext.

## Features

- **Student/Employee Portal**: Submit and track IT support requests
- **IT Staff Queue**: Manage, assign, and process support tickets
- **Admin Dashboard**: User management, services/categories, reports, import/export
- **Authentication**: Supabase Auth with UPHSD institutional email validation
- **Role-Based Access**: student, employee, it_staff, admin, manager
- **Service-Category Relationships**: Dynamic category filtering based on selected service
- **Import/Export**: CSV/JSON export with duplicate detection and controlled import

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Cloudflare Workers via vinext
- **Development**: TypeScript, ESLint

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account with project configured
- Cloudflare account (for deployment)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_KEY` — Your Supabase publishable key
- `NEXT_PUBLIC_BASE_URL` — Application base URL (e.g., `http://localhost:3000` for local development)

### Development

```bash
# Standard Next.js development
npm run dev

# Vinext development server (Cloudflare-compatible)
npm run dev:vinext
```

### Build

```bash
# Standard Next.js build
npm run build

# Vinext build for Cloudflare Workers
npm run build:vinext
```

### Local Production Testing

```bash
# Start local Worker server
npm run start:vinext
```

## Database Setup

The Supabase database schema is defined in `supabase/schema.sql`. To initialize:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Execute the script

This creates all required tables, enums, indexes, RLS policies, triggers, and seed data.

## Production Deployment

Production deployment uses GitHub as the single source of truth.

### Normal Workflow

1. Commit your changes:
   ```bash
   git add .
   git commit -m "description"
   ```

2. Push to `main`:
   ```bash
   git push origin main
   ```

3. Cloudflare automatically builds and deploys the Worker.

4. Verify the production deployment.

### Cloudflare Git Integration

The repository should be connected to Cloudflare for automatic deployments. In the Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select the `uphsd-it-helpdesk` Worker
3. Ensure Git integration is enabled for the GitHub repository
4. Configure the build command if needed: `npm run build:vinext`

### Manual/Emergency Deployment

If automatic deployment is unavailable, you can deploy manually:

```bash
npm run build:vinext
npm run deploy:vinext
```

This requires `CLOUDFLARE_API_TOKEN` to be set in your environment.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for standard Next.js deployment |
| `npm run lint` | Run ESLint |
| `npm run dev:vinext` | Start vinext development server |
| `npm run build:vinext` | Build for Cloudflare Workers |
| `npm run start:vinext` | Start local Worker server |
| `npm run deploy:vinext` | Manual deployment to Cloudflare (emergency only) |

## Project Structure

```
app/
  auth/                    # Authentication pages and actions
  login/                   # Legacy login redirect
  signup/                  # Legacy signup redirect
  portal/                  # Protected portal
    layout.tsx             # Portal layout with navigation
    page.tsx               # Student/Employee dashboard
    request/               # Ticket creation form
    queue/                 # IT staff queue
    tickets/               # Ticket detail views
    admin/                 # Admin dashboard
      layout.tsx           # Admin layout with sidebar
      page.tsx             # Admin dashboard home
      users/               # User management
      services/            # Services & categories management
      reports/             # Reports & analytics
      archive/             # Archive & export
      import/              # Import management
utils/
  supabase/                # Supabase client helpers
public/
  branding/                # UPHSD logos and assets
supabase/
  schema.sql               # Database schema and seed data
```

## License

Private — University of Perpetual Help System Dalta
