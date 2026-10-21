# Appwrite setup checklist

This setup belongs to the **Eco Ease Product Intake** Appwrite Cloud project in Singapore, separate from the ecommerce system. The five IDs/endpoint in `.env.production` are public browser configuration, not secrets.

**Created:** project `6ad8906d003972b6ef63`; TablesDB database `6ad890c50025549074d1`; table `6ad890f7001027a067e6`; image bucket `6ad895ce001da28bbe9c`; submitter team `6ad895350023d69c7e79`. The team currently needs the customer's email address before an account can be invited.

## 1. Create project and access

1. Create an Appwrite Cloud project named `Eco Ease Product Intake` and copy its region-specific API endpoint and project ID.
2. Add the eventual frontend hostname as a **Web platform** in the project. Add `localhost` while testing locally. Browser sessions depend on the configured platform hostname.
3. Under Auth, create or invite the customer's login account. Do not provide a self-registration page in the intake app.
4. Create a Team called `Product submitters` and add only the customer's Appwrite user(s) to it. Copy its team ID. The permission role is `team:<team-id>`.

Even if someone registers an account directly through an Appwrite API, it must **not** be able to submit unless it belongs to this Team.

## 2. Create the staging table

Create a TablesDB database `intake` and one table `product_submissions`. Create the following columns with these exact keys. Each string's size is the maximum length; choose `required` as shown. For an optional string, allow empty values.

| Key | Type | Size | Required |
| --- | --- | ---: | :---: |
| `submission_id` | string | 64 | Yes |
| `sku` | string | 40 | Yes |
| `category` | string | 120 | Yes |
| `name_en` | string | 200 | Yes |
| `name_si` | string | 200 | Yes |
| `description_en` | string | 4000 | No |
| `description_si` | string | 4000 | No |
| `base_price_cents` | integer | — | Yes |
| `variants_json` | text | 16383 maximum | Yes |
| `images_json` | text | 16383 maximum | Yes |
| `status` | string | 20 | Yes |
| `submitted_by` | string | 64 | Yes |
| `submitted_email` | string | 254 | Yes |

The `sku_unique` index is in place. Row-level security is enabled. The table grants **CREATE only** to `team:6ad895350023d69c7e79`; it does not grant the customer team table-level READ, UPDATE, or DELETE. The app creates rows with an empty permissions array. The project owner/development team can manage records in Appwrite Console.

## 3. Create a private image bucket

The Storage bucket `product-intake-images` has file-level security, allowed extensions `jpg`, `jpeg`, `png`, `webp`, and a maximum file size of 8 MB. It grants **CREATE only** to `team:6ad895350023d69c7e79`. No public READ, UPDATE, or DELETE permission is granted. The app uploads files with an empty permissions array.

Copy the bucket ID. The customer sees local previews before submitting; no public image URL is necessary.

## 4. Configure frontend

For local development, copy `.env.example` to `.env` and fill in the public values already included in `.env.production`:

```dotenv
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6ad8906d003972b6ef63
VITE_APPWRITE_DATABASE_ID=6ad890c50025549074d1
VITE_APPWRITE_TABLE_ID=6ad890f7001027a067e6
VITE_APPWRITE_BUCKET_ID=6ad895ce001da28bbe9c
```

All values are browser-visible project identifiers. **Do not use an API key here.** The checked-in `.env.production` supplies these values to the Vite production build. Build again after changing them.

## 5. Verify with a test account

Sign in as a team member. Submit one test product with two photos, then confirm in the Console that the row contains both file IDs in the right order and that the files exist in the bucket. Confirm a signed-in user **outside** the Product submitters team cannot create rows or files. Remove the test data in the Console afterward.

For a real catalogue, periodically export records and original photos. Appwrite is the collection store; publication and ecommerce data remain under the main system's control.

## 6. Deploy from GitHub

1. Put this source in a GitHub repository, excluding `.env` and `node_modules`.
2. In the same Appwrite project, create a **Site** connected to that GitHub repository. Select the Vite preset if offered. Set the build command to `npm run build` and the output directory to `dist`.
3. The five public `VITE_APPWRITE_*` values are already in `.env.production`. Do not add an API key. Deploy the selected branch.
4. Copy the Site's hostname and add it as a **Web platform** under the Appwrite project settings. Test sign-in and one submission on the actual deployed URL.

The Site and data resources should be in the same Appwrite project, but this project remains separate from the main ecommerce system.
