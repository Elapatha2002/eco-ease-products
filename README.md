# Eco Ease Product Intake

A separate, submit-only web app for Eco Ease product details and photos. It uses Appwrite Cloud for login, a staging table, and private image storage. It does **not** write to the ecommerce database, publish products, or provide editing/deleting screens. Developers review and manage submissions in the Appwrite Console.

**Live portal:** https://eco-ease-product-intake.appwrite.network/ — the customer account is in the create-only Product submitters team. The customer must use **Set or reset your password** on the portal to receive a password setup link, then sign in. No password was created by the development team.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the five public Appwrite identifiers (the values are also in `.env.production`). Never put an API key in a `VITE_` variable.
3. Follow [APPWRITE_SETUP.md](APPWRITE_SETUP.md) to create the project resources and submitter account.
4. `npm run dev`

Run `npm test` and `npm run build` before deployment. The output is a static `dist/` directory. The initial Appwrite Site was deployed by uploading a source `.tar.gz` archive, with the Vite preset, `npm install`, `npm run build`, and `./dist` output. The deployed hostname is registered as an Appwrite Web platform. See the [setup guide](APPWRITE_SETUP.md) for updates.

## Data contract

One row is created for one product submission. Product fields and an optional array of variants are serialized in that row; image binaries are uploaded to Appwrite Storage first. `images_json` contains their file IDs in display order. All money values use **integer cents**. The table is intentionally a staging format, separate from Eco Ease's PostgreSQL commerce model.

| Intake field | Later ecommerce destination |
| --- | --- |
| `sku`, `category`, `base_price_cents` | `products`, `product_categories` |
| `name_en`, `name_si`, description fields | `product_i18n` |
| `variants_json` | `product_variants` |
| `images_json` and Storage files | `product_media` and permanent media storage |

Any future import should read only reviewed rows, map by SKU, copy the **actual image bytes** into permanent commerce storage, and record a stable import reference. The storefront should not hotlink to the intake bucket.

## Security and behavior

- Appwrite Team membership controls CREATE access to the table and bucket. A publicly registered Appwrite user should not gain submission access.
- No Appwrite API key is shipped to the browser. The app uses each customer's login session and Appwrite resource permissions.
- Rows and files are created with no customer read, update, or delete permissions. The Appwrite Console team can review and manage them.
- Accepted image types: JPG, PNG, WebP, at most eight files of 8 MB each. Set matching **server-side** bucket restrictions.
- If a network error happens after file upload, pressing Submit again reuses the uploaded file IDs while the tab remains open. A 409 means a product SKU or submission ID may already exist; check the Console before retrying. Failed submissions can leave unused image files for the team to clean up.
- Original images count against Appwrite's storage quota. Keep a separate export/backup routine if this is business-critical.

## GitHub

The source is in [`Elapatha2002/eco-ease-products`](https://github.com/Elapatha2002/eco-ease-products). Do not commit `.env`, API keys, customer passwords, or `node_modules`. The included GitHub Actions workflow checks tests and the production build on every push or pull request. **The live Site is a manual deployment; GitHub pushes do not update it.** Connect Appwrite's GitHub integration with repository-scoped access to enable automatic deployments later, or upload a fresh source archive after each code change.
