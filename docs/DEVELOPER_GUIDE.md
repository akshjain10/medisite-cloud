# Pharma Sites: Developer Guide

Nov 11, 2026 · @Akshat

## What this project is

One Next.js app serves many pharma catalogue websites (one per client, called a **tenant**) and one shared admin dashboard where every client edits only their own site. The website a visitor sees is chosen by the address they open: `acme.yourplatform.com` or a custom domain like `arihantmedigens.com` both load the same code with that tenant's products, colours and texts.

| Part | Technology | Where it lives |
| --- | --- | --- |
| Web framework | Next.js 16 (App Router, React 19, Turbopack in dev) | `src/app` |
| Admin dashboard, API, auth | Payload CMS 3 | `src/payload.config.ts`, `src/collections`, `src/app/(payload)` |
| Multi-tenancy | `@payloadcms/plugin-multi-tenant` | configured in `src/payload.config.ts` |
| Database | PostgreSQL via `@payloadcms/db-postgres` (Drizzle) | connection in `.env` |
| Styling | Tailwind CSS 4, per-tenant CSS variables | `src/app/(site)/globals.css`, `src/lib/site.ts` |
| Carousels, slider, toasts, icons | Swiper, Radix Slider, Sonner, Lucide + Font Awesome brands | `src/components` |
| Spreadsheet import | PapaParse (CSV), read-excel-file (.xlsx) | `src/components/admin/ImportClient.tsx` |

The public site design follows the reference project (Arihant Medigens): same header, footer, catalogue with filters, product page, cart and WhatsApp ordering, with each difference exposed as a per-tenant setting.

## Getting started

You need Node.js 20.9 or newer and a PostgreSQL 16 database (Docker, or a hosted one such as Neon or Supabase).

1. Copy the environment file: `cp .env.example .env`, then set `PAYLOAD_SECRET` to a long random string (`openssl rand -hex 32`). Never commit `.env`.
2. Start Postgres: `docker compose up -d`, or without Compose `docker run -d --name pharma-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pharma_sites -p 5432:5432 postgres:16`.
3. `npm install`, then `npm run dev`. On first start Payload creates all tables by itself.
4. In a second terminal: `npm run seed` for demo data (two tenants, products, one user per role).
5. Open `http://localhost:3000/admin` (dashboard) and `http://acme.localhost:3000` or `http://zenith.localhost:3000` (demo sites). Chrome and Firefox resolve `*.localhost` without setup.

| Variable in `.env` | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `PAYLOAD_SECRET` | Signs login tokens; changing it logs everyone out |
| `PLATFORM_DOMAIN` | Root domain; a tenant with slug `acme` answers on `acme.<PLATFORM_DOMAIN>` (`localhost` in development) |

Demo logins after `npm run seed`, all with password `change-me-now`:

| Email | Role |
| --- | --- |
| `admin@example.com` | Portal Super Owner |
| `editor@example.com` | Portal Editor |
| `owner@acme.example.com` | Tenant Super Owner (Acme) |
| `editor@acme.example.com` | Tenant Editor (Acme) |

| npm script | What it does |
| --- | --- |
| `dev` / `build` / `start` | Next.js development server, production build, production server |
| `typecheck` | `tsc --noEmit`; run before every commit |
| `generate:types` | Rewrites `src/payload-types.ts` after any collection or field change |
| `generate:importmap` | Rewrites `src/app/(payload)/admin/importMap.js` after adding or moving an admin component |
| `seed` | Demo tenants, products and users; safe to run twice |
| `make-admin -- you@example.com` | Makes an existing account Portal Super Owner |
| `upgrade-tenants` | Brings tenants saved by an old version up to date (also runs on every start) |

## Project map

All application code is under `src`. Two route groups in `src/app` split the app: `(site)` is the public client website, `(payload)` is the admin and API.

```text
pharma-sites/
├── .env.example            Environment variables to copy into .env
├── docker-compose.yml      Local Postgres
├── next.config.mjs         Next.js config wrapped by withPayload()
├── package.json            Dependencies and npm scripts
├── README.md               Short overview, roles table, import notes
└── src/
    ├── payload.config.ts   Collections, database, multi-tenant plugin, admin components, onInit upgrade
    ├── payload-types.ts    GENERATED types for every collection (npm run generate:types)
    ├── seed.ts             Demo data
    ├── access/index.ts     The four roles and every access helper
    ├── collections/        One file per database collection (fields, access, hooks)
    ├── endpoints/          Custom REST endpoints (product import)
    ├── fields/             Shared admin field defaults (switches, hidden API tab)
    ├── lib/                Server and shared logic: tenant lookup, prices, catalogue, site settings
    ├── scripts/            One-off commands run with `payload run`
    ├── components/         React components
    │   ├── admin/          Admin dashboard: user menu, import page, custom fields
    │   ├── cart/           Cart state, cart window, checkout, order page
    │   └── catalogue/      Products page filters, product page actions, share menu
    └── app/
        ├── (site)/         Public website (layout, home, products, contact, order, privacy)
        └── (payload)/      Payload admin + REST API (generated boilerplate, rarely edited)
```

| File | Change it when you want to… |
| --- | --- |
| `src/payload.config.ts` | Add a collection, register an admin component, change plugin settings |
| `src/access/index.ts` | Change what a role may do |
| `src/collections/Tenants.ts` | Add or change a per-site setting (admin tabs: Site options, Branding, Home page, Contact & footer, Catalogue) |
| `src/collections/Products.ts` | Add or change a product field |
| `src/collections/Orders.ts` | Change what an order stores or its statuses |
| `src/collections/Users.ts` | Change user fields or who may manage whom |
| `src/lib/products.ts` | Price rules, catalogue query, similar products |
| `src/lib/price.ts` | Price types and `amountOf`, safe to import in the browser |
| `src/lib/site.ts` | Turn tenant settings into what the site uses (`siteConfig`), theme CSS variables (`themeStyle`) |
| `src/lib/tenant.ts` | How a web address maps to a tenant |
| `src/lib/productImport.ts` | Spreadsheet column names and how cells are read |
| `src/endpoints/importProducts.ts` | What the import does on the server |
| `src/components/sections.tsx` | Home page sections (hero, why choose us, new arrivals, brands, how to order, about, certifications, contact) |
| `src/app/(site)/layout.tsx` | Header, footer, floating button, cart, fonts on every public page |
| `src/app/(site)/globals.css` | Tailwind theme tokens (`bg-primary`, `bg-accent`), Swiper and splash styles |
| `src/components/ui.tsx` | Shared Button, Card, Input, Badge styles for the public site |

## How a request flows

Every request enters through one of three doors, and all three end in the same Postgres database.

```text
 Visitor's browser             Admin user's browser          Scripts / seed
 acme.localhost:3000           localhost:3000/admin          npm run seed
        |                              |                           |
        v                              v                           v
 src/app/(site) pages          Payload admin + REST API      Payload Local API
 getCurrentTenant() (Host)     multi-tenant plugin +         (no access rules)
 siteConfig(), resolvePrice()  collection access rules
        \                             |                          /
         \----------------------------+-------------------------/
                                      v
                     src/lib  (products, price, site, tenant)
                                      v
                               PostgreSQL database
```

The online version of this guide has the same diagram as a picture.

- **Public website.** `getCurrentTenant()` in `src/lib/tenant.ts` reads the `Host` header: a custom domain matches `tenant.domain`, `<slug>.<PLATFORM_DOMAIN>` matches `tenant.slug`. An unknown address shows "No website at this address".
- **Admin and REST API.** Payload handles the request with the logged-in user; the multi-tenant plugin and the collection access rules decide what that user may see and change.
- **Shared logic.** The site code calls Payload's Local API (which skips access rules, so it filters by tenant itself) and reads the catalogue with one direct SQL query.

## Data model

Eight collections, each defined in one file in `src/collections`. Every collection except Users and Tenants carries a `tenant` field added by the multi-tenant plugin, so each row belongs to exactly one client site.

| Collection | File | Holds | Key fields |
| --- | --- | --- | --- |
| `tenants` | `Tenants.ts` | One client website and all its settings | `name`, `slug`, `domain`, `plan`, `priceMode`, `pricePassword`, `lockMrp`, `showCatalogues`, `enableCart`, `sections`, `upgradeLevel` (hidden), groups `theme.*`, `home.*`, `profile.*`, `catalogue.*` |
| `products` | `Products.ts` | Catalogue items (drafts and versions on) | `code` (the spreadsheet id), `name`, `composition` (Salt), `company`, `packSize` (Packing), `form`, `inBox`, `shipper`, `mrp`, `price`, `category`, `visible`, `isFeatured` (New Arrival), `division`, `image`, `description`, `priceOverride`, `slug` |
| `catalogues` | `Catalogues.ts` | Company-wise PDF catalogues for the public Catalogues page | `company`, `division`, `title`, `file` (a PDF in Media), `description`, `updatedLabel`, `sortOrder`, `visible` |
| `categories` | `Categories.ts` | Product categories, created by hand or by the import | `name`, `slug`, `sortOrder` |
| `orders` | `Orders.ts` | Orders placed from the site's cart | `orderNumber`, `status`, `customerName`, `phone`, `email`, `address`, `note`, `items[]`, `itemCount`, `total` |
| `enquiries` | `Enquiries.ts` | Contact form submissions | `name`, `phone`, `email`, `message`, `product`, `status` |
| `media` | `Media.ts` | Uploaded images and PDFs, resized to `thumbnail` and `card` | `alt`, file, sizes |
| `users` | `Users.ts` | Admin logins | `email`, `roles` (portal role), `tenants[]` (tenant + tenant role, added by the plugin) |

Things that are easy to get wrong:

- **Field names are not the labels.** The Salt field is `composition`, Packing is `packSize`, New Arrival is `isFeatured`. The labels match the spreadsheet; the names stay as they were so existing databases keep working.
- **Database columns are snake\_case of the field path:** `packSize` → `pack_size`, `theme.primaryColor` → `theme_primary_color`, `profile.mapUrl` → `profile_map_url`. The catalogue query in `src/lib/products.ts` uses these column names directly.
- **`dosageForm` is hidden but kept.** It is the old fixed list of forms; the free-text `form` replaced it. Do not delete it (see Database changes).
- **Tenant tabs are unnamed.** In `Tenants.ts` the tabs only arrange the admin screen; the stored paths stay `theme.*`, `home.*`, `profile.*`, `catalogue.*`, and the Site options fields stay at the top level.
- **After changing any field, run `npm run generate:types`** so `src/payload-types.ts` matches, then `npm run typecheck`.

## Users and permissions

There are four kinds of admin user. Portal roles are stored in `user.roles`; tenant roles in each row of `user.tenants` (one row per site the person belongs to). All the helpers that decide access are in `src/access/index.ts`.

|  | Portal Super Owner | Portal Editor | Tenant Super Owner | Tenant Editor |
| --- | --- | --- | --- | --- |
| Stored as | `roles: ['super-admin']` | `roles: ['portal-editor']` | `tenants[].role = 'owner'` | `tenants[].role = 'editor'` |
| Sees | every tenant | every tenant | own tenants only | own tenants only |
| Add or delete tenants | yes | no | no | no |
| Slug, domain, plan | yes | yes | no | no |
| Site options and all other site settings | yes | yes | yes | yes |
| Add or delete users | yes | no | own tenants only | no |
| Add or delete products | yes | yes | yes | no, edit only |
| Import products | yes | yes | yes | updates only |
| Delete orders (saved orders are off for now) | yes | yes | yes | no |

Where each rule is enforced, in order of how a request meets them:

1. **The multi-tenant plugin** (`src/payload.config.ts`) adds a tenant filter to every query from a user who is not a portal user (`userHasAccessToAllTenants: isPortalUser`). This is what hides other tenants everywhere, including the REST API.
2. **Collection access** (`access` in each collection file) decides create, read, update and delete, using helpers such as `portalOwnerOnly`, `portalOrAnyTenantOwner` and `deleteInOwnedTenants`.
3. **Field access** limits single fields, for example `slug`, `domain` and `plan` in `Tenants.ts` (`portalOnlyField`) and `roles` in `Users.ts` (Portal Super Owner only).
4. **Hooks** handle rules that depend on both people: `guardUserChanges` and `guardUserDelete` in `Users.ts` (tenant owners can only manage users of tenants they own; Portal Editors cannot edit the Super Owner), and `onlyOwnersAdd` in `Products.ts` (checks the tenant of a new product).

Rules worth knowing before you change anything:

- The Local API (`payload.find`, `payload.create` in server code) **skips access rules by default**. Public-site code therefore always filters by tenant itself. Keep doing that in every new query.
- The very first account created on an empty database becomes Portal Super Owner (`defaultValue` on `roles`).
- Nobody can delete their own account, and a tenant owner can only delete users whose every tenant they own.
- The header label ("Tenant Editor" and so on) comes from `roleLabel()` in `src/access/index.ts`.

## Prices and hidden prices

Every price shown on a public site passes through one function, `resolvePrice()` in `src/lib/products.ts`. A hidden price never leaves the server: not in the page HTML, the page data, the cart, a WhatsApp message, share text or any API response.

| Input | Where it is set | Effect |
| --- | --- | --- |
| `tenant.priceMode` | Site options tab | `visible` shows prices; `locked` hides them until the visitor enters the price password (see below); `hidden` shows none; `quote` shows a "Request a quote" link; `login` is reserved and behaves as hidden |
| `tenant.pricePassword`, `tenant.lockMrp` | Site options tab (only when locked) | the password visitors type; whether the MRP is locked too (default: only the selling price) |
| `product.priceOverride` | product, collapsed section | `show` or `hide` overrides the site setting for one product |
| `product.mrp`, `product.price` | product form or import | 0 or empty counts as "no price"; when `price` is lower than `mrp`, the MRP is shown crossed out with the % off |

What comes out is a `PublicPrice` (type in `src/lib/price.ts`): `{ kind: 'amount', mrp, price, locked? }`, `{ kind: 'quote' }` or `{ kind: 'none' }`. Components receive a `PublicProduct`, never the raw product document. `amountOf(price)` gives the amount a customer pays (selling price, else MRP; null while locked) and is used by the cart, filters and orders.

### Locked prices

With `priceMode: 'locked'`, `resolvePrice()` returns `{ kind: 'amount', price: null, mrp, locked: true }` (MRP null too if `lockMrp`), so the real selling price is never sent. The site shows "Unlock price" buttons and an "Unlock prices" button in the header.

| Piece | File | What it does |
| --- | --- | --- |
| Who may see prices | `src/lib/priceLock.ts` | `pricesUnlocked()` returns `'password'` when the visitor has a valid `price_unlock` cookie, `'login'` when they are logged in to the dashboard at this address as portal staff or a user of this site |
| Tenant lookup | `src/lib/tenant.ts` | `getCurrentTenant()` removes `pricePassword` and adds `priceUnlocked` / `priceUnlockedBy`, which `resolvePrice()` reads |
| Unlock / lock actions | `src/app/(site)/priceActions.ts` | `unlockPrices` accepts the price password, or a dashboard email + password ("Staff login" tab); sets the httpOnly cookie for 30 days. 10 wrong tries per visitor per 15 minutes. `lockPrices` deletes the cookie |
| Unlock window, buttons | `src/components/PriceLock.tsx` | `PriceLockProvider` (in the layout), `UnlockButton`, `PriceLockToggle` (header) |

The cookie is an HMAC of the tenant id and the current password, signed with `PAYLOAD_SECRET`: it cannot be forged, and changing the password locks everyone out again. The dashboard login cookie is per address, so a client logged in at `localhost:3000/admin` is not logged in on `acme.localhost:3000`; they use the "Staff login" tab instead.

Rules for new code:

- Never pass a raw `Product` from Payload to a component or a client component. Map it with `toPublicProduct()` or use `getCatalogue()` / `getPublicProduct()`.
- The products REST API is closed to anonymous visitors on purpose (`read: loggedIn` in `Products.ts`). Do not open it.
- Browser code imports price helpers from `src/lib/price.ts`, never from `src/lib/products.ts` (that file pulls in the database and breaks the browser build).
- Display is in `src/components/PriceTag.tsx`; change the look there.

## Public site

Every public page lives in `src/app/(site)` and starts the same way: `getCurrentTenant()` finds the tenant from the address, then `siteConfig(tenant)` (in `src/lib/site.ts`) turns its settings into plain values with defaults. Pages are rendered on the server for every request (`dynamic = 'force-dynamic'` in the layout).

| Address | Page file | Main components |
| --- | --- | --- |
| every page | `layout.tsx` | `SiteHeader`, `SiteFooter`, `ContactButton`, `SplashScreen`, `CartProvider`, `CartDialog`, toasts |
| `/` | `page.tsx` | `components/sections.tsx` renders the tenant's `sections` list in order |
| `/products` | `products/page.tsx` | `catalogue/ProductsBrowser.tsx`: totals, "Products by company" chips with counts, filters (company counts; a **Divisions** sub-filter appears under each selected company), search, cards or table view (table has In Box and Shipper), pagination, all in the browser. `?company=` and `?category=` preselect a filter |
| `/products/<slug>` | `products/[slug]/page.tsx` | `catalogue/ProductActions.tsx`, `ShareMenu.tsx`, `BackButton.tsx`, similar products |
| `/catalogues` | `catalogues/page.tsx` | `catalogue/CataloguesBrowser.tsx`: PDFs grouped by company with View, Download, WhatsApp, Copy link and Share. Data from `src/lib/catalogues.ts`. 404 when switched off or nothing uploaded; the menu link and home card hide the same way (`hasCatalogues()`) |
| `/contact` | `contact/page.tsx` + `contact/actions.ts` | `ContactBlock.tsx`, `EnquiryForm.tsx` |
| `/order` | `order/page.tsx` + `order/actions.ts` | `cart/OrderClient.tsx`, `cart/Checkout.tsx` (404 when the cart is off) |
| `/privacy` | `privacy/page.tsx` | standard text from tenant details, or the tenant's own text |

**Theming.** `themeStyle()` in `src/lib/site.ts` puts the tenant's choices on `<body>` as CSS variables: `--primary`, `--accent`, `--radius-sm/md/lg/xl` and `fontFamily`. `globals.css` maps them to Tailwind colours, so in components you write `bg-primary`, `hover:bg-primary-dark`, `bg-primary-soft`, `text-primary-light`, `bg-accent`, and `rounded-lg` follows the corner setting. Never hard-code a brand colour such as `bg-blue-600` in public components. Fonts are self-hosted from `@fontsource` packages imported in `layout.tsx`; a browser downloads only the one font the tenant picked.

**Home sections.** Each section is a function in `sections.tsx`, listed in `SECTION_COMPONENTS` by key. The keys must match the `sections` options in `Tenants.ts`. A section with no content returns `null` and disappears. `stats` shows the number of products, companies and categories (from `getCatalogue()`); `explore` shows the Product Search and Product Catalogues cards.

**Division filter.** A division belongs to a company, so the filter stores keys made of company + division (`divKey()` in `ProductsBrowser.tsx`); two companies can both have a "Healthcare" division. A selected company with no ticked division shows all its products.

**Forms without redirects.** The enquiry and checkout forms are server actions that return a result instead of redirecting. A redirect would render the next page in an internal request that loses the original address, so the tenant could not be found. Keep new forms the same way.

**Shared look.** `src/components/ui.tsx` holds `Button`, `buttonClass()`, `Card`, `inputClass` and `Badge` in the reference project's style. Reuse them instead of new one-off classes.

## Admin dashboard customisations

The dashboard is Payload's own admin at `/admin`. Everything custom is a React component under `src/components/admin`, registered by a path string in the config, not by an import.

| What you see | Component | Registered in |
| --- | --- | --- |
| Email, role and Log out at the top right | `admin/UserMenu.tsx` | `admin.components.actions` in `payload.config.ts` |
| "Import products" in the side menu | `admin/ImportNavLink.tsx` | `admin.components.afterNavLinks` |
| The Import products page | `admin/ImportView.tsx` (server) + `ImportClient.tsx` (browser) + `import.module.css` | `admin.components.views.importProducts` |
| On/off switch for every yes/no field | `admin/fields/SwitchField.tsx` (uses `Switch.tsx`) | added to every checkbox by `withAdminDefaults()` in `src/fields/adminDefaults.ts` |
| Visible / New switches in the product list | `admin/fields/SwitchCell.tsx` | `admin.components.Cell` on `visible` and `isFeatured` in `Products.ts` |
| Colour palette for brand and accent colour | `admin/fields/ColorField.tsx` | `colorField()` in `Tenants.ts` |
| No "API" tab on documents | config only | `hideAPIURL: true`, also set by `withAdminDefaults()` |

Three rules for admin components:

1. **Register by path, then regenerate the import map.** Paths look like `'/components/admin/UserMenu#default'`, relative to `src`. After adding, moving or renaming one, run `npm run generate:importmap`; otherwise the admin shows an error where the component should be.
2. **Custom pages must pass the header actions themselves.** `ImportView.tsx` passes `viewActions={config.admin.components.actions}` to `DefaultTemplate`; without it the Log out button disappears on that page.
3. **Admin components may only use the admin theme.** Style with Payload's CSS variables (`var(--theme-elevation-150)`, `var(--theme-text)`) so light and dark mode both work; the public site's Tailwind classes do not exist inside the admin.

## Import, cart and orders, caching

### Product import

The browser reads the file and the server writes it, in batches of 250 rows.

1. `ImportClient.tsx` parses `.csv` with PapaParse or `.xlsx` with read-excel-file, then `rowsFromTable()` in `src/lib/productImport.ts` maps the header row to fields. Column names and their accepted alternatives are in the `COLUMNS` list there.
2. The preview drops rows that repeat an ID already used above (IDs are compared exactly, so `naproxen-500` and `NAPROXEN-500` are different products).
3. Each batch is POSTed to `/api/products/import`, handled by `src/endpoints/importProducts.ts`, registered in `Products.ts` under `endpoints`.
4. The endpoint checks the user and tenant, loads the tenant's existing products and categories once, creates missing categories, then creates or updates products five at a time. It changes **only the columns present in the file**, so a file without a Price column never wipes prices. Tenant Editors get updates only; new rows are reported as skipped.
5. It then calls `refreshCatalogue(tenant)` once. About 6,400 rows take a little over 2 minutes the first time and under a minute when re-run.

### Cart and orders

- The cart lives in the visitor's browser (`localStorage`, key `cart:<tenant slug>`), managed by `src/components/cart/CartProvider.tsx`. It is on when `tenant.enableCart` is not false (Site options → "Cart and online ordering").
- **Ordering is WhatsApp-only right now.** The cart window and the `/order` page show a "Send order on WhatsApp" button (`SendOrderOnWhatsapp` in `src/components/cart/Checkout.tsx`). It opens WhatsApp with the cart as a message, built in the browser by `cartWhatsappText()`; prices are included only if the site shows them. Without a WhatsApp number the button becomes "Contact us to order". Orders sent this way are **not** saved in the dashboard's Orders list.
- **Saved orders are switched off but kept in the code.** The "Place your order" step and the "Your details" form (`CheckoutForm` and `OrderPlaced` in `Checkout.tsx`, the server action `placeOrder` in `src/app/(site)/order/actions.ts`) are commented out in `CartDialog.tsx` and `OrderClient.tsx`. To bring them back, follow the "To bring back" notes in those two files. `placeOrder` only reads product ids and quantities from the browser; names, codes and prices come from the database, limited to that tenant's published, visible products.

### Catalogue cache

`getCatalogue()` in `src/lib/products.ts` loads a tenant's whole published catalogue with one SQL query (`loadCatalogue`) and keeps it in server memory for 5 minutes. The products page and the order page filter it in the browser, as the reference project does. Edits clear it at once: `refreshCatalogue()` in `src/lib/revalidate.ts` is called from the `afterChange` and `afterDelete` hooks of products, categories and media. The store sits on `globalThis` because Next.js bundles the admin API and the public pages separately. A product changed directly in the database (SQL) shows on the site only after a restart or 5 minutes.

## How do I…

Each recipe ends with the same check: `npm run typecheck`, restart `npm run dev`, look at the admin and at `http://acme.localhost:3000`.

### Add a product field (example: "Stock available")

1. `src/collections/Products.ts`: add the field where it belongs in the form. A `checkbox` becomes a switch automatically.
2. `npm run generate:types`.
3. To show it on the site: add it to `PublicProduct` and `toPublicProduct()` in `src/lib/products.ts`, and to the SQL in `loadCatalogue()` using the snake\_case column (`stock_available`). Then display it in `ProductCard.tsx` or `products/[slug]/page.tsx`.
4. To import it: in `src/lib/productImport.ts` add it to `ImportRow`, `COLUMNS` (with name alternatives) and `rowsFromTable()`; in `src/endpoints/importProducts.ts` add it to `sanitize()`, the `select` list, and the `all` and `from` maps.

### Add a setting to each client site

1. `src/collections/Tenants.ts`: add the field inside the right tab's group (`theme`, `home`, `profile` or `catalogue`), with a sensible `defaultValue`.
2. `npm run generate:types`.
3. `src/lib/site.ts`: add it to `SiteConfig` and `siteConfig()` with the same default, so old tenants without a value behave correctly.
4. Use `site.<name>` in the component. Platform-only settings go in the "Platform settings" collapsible with `access: { update: portalOnlyField }`.

### Add a one-time upgrade for existing clients

`src/lib/upgradeTenants.ts` runs on every start. Add a step guarded by `(t.upgradeLevel ?? 0) < N`, set `upgradeLevel: N` when it is done, and raise `LATEST_LEVEL` to `N`. New clients start at `LATEST_LEVEL` (hook in `Tenants.ts`), so they never get the step.

### Add a home page section

1. `Tenants.ts`: add an option to `sections`, and any content fields to the `home` group.
2. `src/components/sections.tsx`: write a function taking `{ tenant }` that returns `null` when it has nothing to show, and add it to `SECTION_COMPONENTS` under the same key.
3. Existing tenants do not get the new section until someone adds it to their Sections list (or you extend `src/lib/upgradeTenants.ts`).

### Add a public page

1. Create `src/app/(site)/<name>/page.tsx`: `const tenant = await getCurrentTenant(); if (!tenant) return null`, then wrap content in `<PageShell>`.
2. Every database query must filter by `tenant.id`.
3. Add a link in `links` in `SiteHeader.tsx` and, if needed, in `SiteFooter.tsx`.

### Add a collection (example: "Offers")

1. Create `src/collections/Offers.ts` with `access` built from the helpers in `src/access/index.ts`.
2. In `src/payload.config.ts`: add it to `collections`, and to the plugin's `collections` (`offers: {}`) so every row belongs to a tenant.
3. `npm run generate:types`; restart dev to create the table.

### Change what a role can do

Edit the helper in `src/access/index.ts` or the `access` block of the collection. Then test with all four demo logins, including the REST API (`/api/<collection>` with each user's token), because the admin hides buttons that the API would still allow.

### Add an admin component

Write it in `src/components/admin` (start with `'use client'` if it uses hooks such as `useField` or `useAuth` from `@payloadcms/ui`), register its path in the config or the field's `admin.components`, then `npm run generate:importmap`.

### Offer more fonts or colours

- Fonts: add the option to `fontPreset` in `Tenants.ts`, its family to `FONTS` in `src/lib/site.ts`, and `import '@fontsource-variable/<font>'` in `src/app/(site)/layout.tsx` (after `npm install` of that package).
- Colours: edit the `BRAND` and `ACCENT` lists in `src/components/admin/fields/ColorField.tsx`.

### Accept another spreadsheet column name

Add the spelling, lower-case and without spaces or symbols, to that field's `aliases` in `COLUMNS` in `src/lib/productImport.ts`.

## Database changes, gotchas and testing

### Changing the database

In development, Payload compares the collections with the database each time `npm run dev` starts and changes the database to match. **Adding** fields, options or collections happens silently. **Removing or renaming** a field, removing a select option, or changing a field's type asks a yes/no question in the terminal ("Accept warnings and push schema to database?"); answering no stops the server, and answering yes deletes that data.

- Prefer additive changes: add a new field and hide the old one (`admin: { hidden: true }`), as was done with `dosageForm`.
- Change a label freely; never change a field's `name` on a live database.
- Data that must be updated for existing tenants goes in `src/lib/upgradeTenants.ts`, which runs on every start (`onInit` in `payload.config.ts`) and must be safe to run any number of times.
- **Before production**, switch from automatic syncing to migrations: `npx payload migrate:create`, commit the file, and run `npx payload migrate` on deploy.

### Gotchas

- `AGENTS.md` is written by `next dev`; leave it.
- A browser component that imports `src/lib/products.ts`, `payload.ts` or `tenant.ts` crashes the dev server with "Can't resolve 'child\_process'". Import types with `import type`, and shared helpers from `src/lib/price.ts`.
- A missing `.env` shows as "missing secret key" on `/admin`.
- `*.localhost` subdomains need Chrome or Firefox; otherwise add them to `/etc/hosts`.
- The Next.js data cache refuses items over 2 MB, which is why the catalogue cache is in memory, not `unstable_cache`.
- Theme colours are validated as `#rrggbb` and map links must start with `http`; both values are written into the page, so keep those checks.

### Testing checklist

There are no automated tests yet. Before each release, check:

- [ ] `npm run typecheck` and `npm run build` pass
- [ ] Start against a copy of the production database: no schema questions, `upgrade-tenants` log lines look right
- [ ] A site with prices hidden: no ₹, MRP or % off anywhere, including the cart and WhatsApp text
- [ ] A site with prices locked: the page source contains no selling price until the password is entered; a wrong password is refused; "Lock prices" locks again; a dashboard user sees prices
- [ ] Catalogues: View opens the PDF, Download saves it, WhatsApp and Copy link share the full address
- [ ] Each of the four demo logins: sees only what the permissions table says, in the admin and over `/api`
- [ ] Import the real product file twice: the second run reports everything unchanged
- [ ] Send an order from the cart: WhatsApp opens with the right items, and no prices on a hidden-price site
- [ ] Phone width (390 px): no sideways scrolling on home, products, product page and cart

### Not built yet

| Feature | Where it would go |
| --- | --- |
| Email invites and password set-up for new users | email adapter in `payload.config.ts`, a hook on `Users` |
| Email or WhatsApp alerts to the client for new enquiries and orders | `afterChange` hooks on `Enquiries` and `Orders` |
| Image storage in the cloud (S3 / Cloudflare R2) | storage plugin in `payload.config.ts`; today files sit in `media/` on the server |
| Product export to Excel | another endpoint beside `importProducts.ts` |
| Distributor login for `priceMode: login` | `resolvePrice()` in `src/lib/products.ts` |
| Rate limiting and CAPTCHA on forms | the server actions in `contact/actions.ts` and `order/actions.ts` |
| Custom domain automation and plan limits | `Tenants.ts`, hosting provider API |
