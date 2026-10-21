export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VARIANTS = 12;
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function moneyToCents(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function validateImages(files) {
  if (files.length < 1) return 'Add at least one product photo.';
  if (files.length > MAX_IMAGES) return `Choose no more than ${MAX_IMAGES} photos.`;
  for (const item of files) {
    if (!ALLOWED_IMAGE_TYPES.has(item.file.type)) return 'Photos must be JPG, PNG, or WebP.';
    if (item.file.size > MAX_IMAGE_BYTES) return 'Each photo must be 8 MB or smaller.';
  }
  return null;
}

export function validateProduct(data, images) {
  const errors = {};
  const sku = data.sku.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(sku))
    errors.sku = 'Use 2–40 letters, numbers, hyphens, or underscores.';
  if (!data.category.trim() || data.category.trim().length > 120) errors.category = 'Enter a category of up to 120 characters.';
  if (!data.nameEn.trim() || data.nameEn.trim().length > 200) errors.nameEn = 'Enter an English name of up to 200 characters.';
  if (!data.nameSi.trim() || data.nameSi.trim().length > 200) errors.nameSi = 'Enter a Sinhala name of up to 200 characters.';
  if ((data.descriptionEn || '').length > 4000) errors.descriptionEn = 'Use no more than 4,000 characters.';
  if ((data.descriptionSi || '').length > 4000) errors.descriptionSi = 'Use no more than 4,000 characters.';
  const priceCents = moneyToCents(data.price);
  if (priceCents === null || priceCents <= 0) errors.price = 'Enter a valid price above zero.';
  const imageError = validateImages(images);
  if (imageError) errors.images = imageError;
  if (data.variants.length > MAX_VARIANTS) errors.variants = `Add no more than ${MAX_VARIANTS} options.`;

  const seen = new Set([sku]);
  data.variants.forEach((variant, index) => {
    const code = variant.sku.trim().toUpperCase();
    const any = code || variant.size.trim() || variant.colour.trim() || variant.price.trim();
    if (!any) return;
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code))
      errors[`variant-${index}`] = 'Each option needs a valid, distinct SKU.';
    else if (seen.has(code)) errors[`variant-${index}`] = 'Option SKUs must be unique.';
    else seen.add(code);
    if (!variant.size.trim() && !variant.colour.trim())
      errors[`variant-${index}`] = 'Add a size or colour for this option.';
    if (variant.size.length > 80 || variant.colour.length > 80)
      errors[`variant-${index}`] = 'Keep size and colour to 80 characters each.';
    if (variant.price.trim() && moneyToCents(variant.price) === null)
      errors[`variant-${index}`] = 'Enter a valid option price or leave it blank.';
  });
  return { errors, sku, priceCents };
}

export function productRow(data, images, user, submissionId) {
  return {
    submission_id: submissionId,
    sku: data.sku.trim().toUpperCase(),
    category: data.category.trim(),
    name_en: data.nameEn.trim(),
    name_si: data.nameSi.trim(),
    description_en: data.descriptionEn.trim(),
    description_si: data.descriptionSi.trim(),
    base_price_cents: moneyToCents(data.price),
    variants_json: JSON.stringify(data.variants.filter(v =>
      v.sku.trim() || v.size.trim() || v.colour.trim() || v.price.trim()
    ).map(v => ({
      sku: v.sku.trim().toUpperCase(), size: v.size.trim(), colour: v.colour.trim(),
      price_override_cents: v.price.trim() ? moneyToCents(v.price) : null,
    }))),
    images_json: JSON.stringify(images.map((item, index) => ({
      file_id: item.uploadId,
      original_name: item.file.name,
      sort_order: index,
      alt_en: item.altEn.trim(),
      alt_si: item.altSi.trim(),
    }))),
    status: 'SUBMITTED',
    submitted_by: user.$id,
    submitted_email: user.email,
  };
}
