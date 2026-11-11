# Pharma Sites: multi-client website platform (skeleton)

> New to the code? Start with **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**: where every file lives and how to make common changes.

One codebase, one database, one dashboard. Each client is a **tenant** with its own domain,
theme, products and enquiries. Clients log in and edit only their own content.

Stack: Next.js 16 + Payload CMS 3 (admin + API) + PostgreSQL.

## Run it

```bash
cp .env.example .env            # then set PAYLOAD_SECRET (openssl rand -hex 32)
docker compose up -d            # Postgres
npm install
npm run dev                     # creates tables automatically in development
npm run seed                    # in a second terminal: demo admin + 2 demo tenants
```

| URL | What you see |
|---|---|
| http://localhost:3000/admin | Dashboard. Super admin: `admin@example.com` / `change-me-now` |
| http://acme.localhost:3000 | Demo client, prices **shown** |
| http://zenith.localhost:3000 | Demo client, prices **hidden** |

Client logins from the seed: `owner@acme.example.com` and `owner@zenith.example.com`
(password `change-me-now`). Change all of these before deploying.

## How it fits together

```
src/
  payload.config.ts        Plugins, database, collection list
  access/                  Role helpers (super admin vs everyone else)
  collections/
    Tenants.ts             Client sites. Platform fields are super-admin only
    Users.ts               Roles + (plugin) which tenants a user belongs to
    Products.ts            Draft/publish enabled, per-product price override
    Categories.ts  Media.ts  Enquiries.ts
  lib/
    tenant.ts              Host header -> tenant (custom domain or <slug>.PLATFORM_DOMAIN)
    products.ts            THE price rules. Public pages only ever see PublicProduct
  components/sections.tsx  Home page sections (hero, about, products, certifications, contact)
  app/(site)/              Public client website
  app/(payload)/           Admin panel and API (Payload boilerplate)
```

## Client site features (matching the reference design)

- Header with logo and company name, icon navigation, cart button; footer with contact,
  address (opens Google Maps) and Privacy Policy; floating call / WhatsApp button.
- Home page counts (products, companies, categories) and "Product Search / Product Catalogues" cards.
- Products page with totals and products-per-company chips, category, company (with a Division
  sub-filter per company) and form filters, price slider (only when prices are shown), search,
  cards or table view (with In Box and Shipper), 25/50/100 per page and pagination.
- Catalogues page: company-wise PDFs to view, download and share (WhatsApp, copy link). Upload them
  under **Catalogues**; switch the page per site under Site options.
- Product page with Back, Share (WhatsApp, Telegram, Email, Facebook, X, Pinterest, copy link),
  quantity, Add to Cart, Enquire via WhatsApp, and similar products (same salt, then same category).
- Cart and Order page; customers send the order on WhatsApp. (The saved-order checkout with
  name, phone and address is kept in the code, commented out.) Switch it per site under
  Site options > "Cart and online ordering".
- Prices: MRP and an optional selling Price. When the Price is lower, the MRP is shown crossed out
  with the % off. Filters: category, company, form, and a price range you can drag or type.

## What each client can customise (admin > Tenants > their site)

| Tab | Settings |
|---|---|
| Site options | Price display, cart and online ordering, home page sections |
| Branding | Logo, brand colour and accent colour (palette picker with preview), font (7 choices), corners, footer style, name next to logo, splash screen |
| Home page | Hero text, images, darkness, slide speed; all section headings and texts; features; brands; steps |
| Contact & footer | Phone + note, email + note, WhatsApp, address, map link, hours, licence, GSTIN, footer text, WhatsApp hand-off after enquiries, Privacy Policy text |
| Catalogue | Products per page, company / packing on cards, Share button, similar products |

Prices are never sent to the browser for clients who hide them: not in pages, the cart,
WhatsApp messages or share text (see `src/lib/products.ts`).

## Who can do what (admin users)

| | Portal Super Owner | Portal Editor | Tenant Super Owner | Tenant Editor |
|---|---|---|---|---|
| Sees | every tenant | every tenant | own tenant(s) only | own tenant(s) only |
| Add / delete tenants | yes | no | no | no |
| Platform settings (slug, domain, plan) | yes | yes | no | no |
| Site options, branding, home page, contact, catalogue | yes | yes | yes | yes |
| Add / delete users | yes, anyone | no | yes, for own tenant | no |
| Add / delete products | yes | yes | yes | no (edit only) |
| Import products | yes | yes | yes | updates only |

Portal roles are set on the user ("Portal role"). Tenant roles are set per tenant in the user's
"Tenants" list. Every admin page shows who is logged in and a **Log out** button (top right).

Demo logins from `npm run seed` (password `change-me-now`): `admin@example.com` (Portal Super Owner),
`editor@example.com` (Portal Editor), `owner@acme.example.com` (Tenant Super Owner),
`editor@acme.example.com` (Tenant Editor).

## Importing products from CSV / Excel

Admin > **Import products** (side menu). Choose the tenant and a `.csv` or `.xlsx` file with the columns
`id, Name, Salt, Company, Packing, MRP, Category, visibility, Division, newArrivals`, plus optional
`Form` and `Price` (a template is on the page).

- Products are matched by `id` exactly (capital letters count): existing ones are updated, new ones added.
  Products missing from the file are left alone. Re-running the same file changes nothing.
- Categories are created automatically from the Category column.
- Only the columns in the file are changed, so a file without e.g. Price never wipes prices typed in by hand.
- `visibility` false hides the product from the website; MRP 0 or empty shows no price.
- A report of skipped or failed rows can be downloaded at the end.
- About 6,400 rows take a little over 2 minutes the first time and under a minute after that.

## Price modes (set per tenant by you, overridable per product)

`visible` | `locked` (visitors enter the price password; dashboard users always see prices) |
`hidden` | `quote` ("Request a quote") | `login` (placeholder, behaves as hidden for now)

The rule is enforced on the server in `src/lib/products.ts`. A hidden price is never included in
the page HTML, the page data, or the API. The products REST API is also closed to anonymous users.

## Security notes already built in

- Per-tenant data isolation and per-tenant roles come from the multi-tenant plugin.
- Clients cannot change `slug`, `domain`, `plan`, `priceMode` or `sections` (field-level access).
- Enquiries can only be created through the website's server action (not over the REST API).
- Theme colour is validated as `#rrggbb` so clients cannot inject CSS.
- The tenant for an enquiry always comes from the request host, never from a form field.

## Not built yet (next tabs)

1. Invite flow: email invite + password setup for client users (needs an email adapter such as Resend)
2. Production storage: swap local `media/` for S3 / Cloudflare R2
3. Migrations instead of dev auto-sync (`payload migrate:create`, `payload migrate`)
4. Excel/CSV bulk product import with preview, and export
5. Enquiry emails to the client, rate limiting, Turnstile CAPTCHA
6. Distributor login for `priceMode: login`
7. Custom domain automation (Vercel domains API or Caddy on-demand TLS)
8. Plan limits (product counts, editors), version history UI polish, audit log
9. Second public template; per-tenant SEO fields; catalogue PDF

## Admin conveniences

- Every yes/no setting is an on/off switch. In the product list, **Visibility** and **New Arrival** can be
  switched directly in each row, as in the reference admin.
- The "API" tab is hidden on all documents.
