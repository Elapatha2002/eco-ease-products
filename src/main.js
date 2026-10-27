import './style.css';
import { auth, newSubmission, submitProduct } from './appwrite.js';
import { isConfigured } from './config.js';
import { MAX_IMAGES, MAX_VARIANTS, validateImages, validateProduct } from './catalog.js';

const app = document.querySelector('#app');
const blankProduct = () => ({
  sku: '', category: '', nameEn: '', nameSi: '', descriptionEn: '',
  descriptionSi: '', price: '', variants: [],
});

const state = {
  user: null,
  product: blankProduct(),
  images: [],
  submission: newSubmission(),
  busy: false,
  message: '',
  errors: {},
  result: null,
};

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

function shell(content, compact = false) {
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Eco Ease product intake home">
        <span>eco<span class="brand-light">ease</span><small>PRODUCT INTAKE</small></span>
      </a>
      ${state.user ? `<div class="account"><span class="account-name">${safe(state.user.email)}</span><button id="logout" class="text-button" type="button">Sign out</button></div>` : ''}
    </header>
    <main class="${compact ? 'narrow' : 'layout'}">${content}</main>
    <footer>Eco Ease · Product submissions are reviewed by the development team.</footer>`;
  document.querySelector('#logout')?.addEventListener('click', async () => {
    if (state.busy) return;
    try { await auth.logout(); } catch { /* Clear local state even if the session expired. */ }
    state.user = null;
    renderLogin();
  });
}

function renderSetup() {
  shell(`<section class="card notice"><div class="eyebrow">PORTAL SETUP</div>
    <h1>Almost ready.</h1>
    <p>This product intake portal is waiting for its Appwrite connection. Please contact the Eco Ease development team.</p>
    <div class="pill">No product information has been submitted yet</div></section>`, true);
}

function renderLogin(error = '') {
  shell(`<section class="card login-card">
    <div class="eyebrow">WELCOME TO ECO EASE</div>
    <h1>Add a product</h1>
    <p>Sign in with the account provided by the Eco Ease team to send product details and photos for review.</p>
    <form id="login-form" novalidate>
      <label for="email">Email address</label>
      <input id="email" name="email" type="email" autocomplete="username" required placeholder="you@example.com" />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="Your password" />
      ${error ? `<p class="alert" role="alert">${safe(error)}</p>` : ''}
      <button class="primary full" type="submit">Sign in <span aria-hidden="true">→</span></button>
    </form>
    <p class="login-foot"><button id="forgot-password" class="text-button" type="button">Set or reset your password</button></p>
    <p class="login-foot">Need access? Contact the Eco Ease development team.</p>
  </section>`, true);
  document.querySelector('#forgot-password').addEventListener('click', () => renderResetRequest());
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      await auth.login(form.elements.namedItem('email').value.trim(), form.elements.namedItem('password').value);
      state.user = await auth.current();
      renderForm();
    } catch (e) {
      renderLogin(e?.code === 401 ? 'Incorrect email or password.' : 'Sign-in failed. Please try again.');
    }
  });
}

function renderResetRequest(message = '', error = false) {
  shell(`<section class="card login-card">
    <div class="eyebrow">ACCOUNT ACCESS</div><h1>Set your password</h1>
    <p>Enter the email address the Eco Ease team added to the portal. We will send a link to set your password.</p>
    <form id="reset-request-form">
      <label for="reset-email">Email address</label>
      <input id="reset-email" type="email" autocomplete="email" required placeholder="you@example.com" />
      ${message ? `<p class="${error ? 'alert' : 'progress'}" role="status">${safe(message)}</p>` : ''}
      <button class="primary full" type="submit">Send password link</button>
    </form>
    <p class="login-foot"><button id="back-login" class="text-button" type="button">Back to sign in</button></p>
  </section>`, true);
  document.querySelector('#back-login').addEventListener('click', () => renderLogin());
  document.querySelector('#reset-request-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.querySelector('#reset-email').value.trim();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      await auth.requestPasswordReset(email);
      renderResetRequest('If this address has an account, check its inbox for the password link.');
    } catch {
      renderResetRequest('Could not send the link. Please check your address and try again.', true);
    }
  });
}

function renderResetComplete(userId, secret, message = '') {
  shell(`<section class="card login-card">
    <div class="eyebrow">ACCOUNT ACCESS</div><h1>Choose a password</h1>
    <form id="reset-complete-form">
      <label for="new-password">New password</label>
      <input id="new-password" type="password" autocomplete="new-password" minlength="8" required />
      <label for="confirm-password">Confirm password</label>
      <input id="confirm-password" type="password" autocomplete="new-password" minlength="8" required />
      ${message ? `<p class="alert" role="alert">${safe(message)}</p>` : ''}
      <button class="primary full" type="submit">Save password</button>
    </form>
  </section>`, true);
  document.querySelector('#reset-complete-form').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.querySelector('#new-password').value;
    if (password !== document.querySelector('#confirm-password').value) {
      renderResetComplete(userId, secret, 'The passwords do not match.');
      return;
    }
    event.currentTarget.querySelector('button').disabled = true;
    try {
      await auth.completePasswordReset(userId, secret, password);
      window.history.replaceState(null, '', window.location.pathname);
      renderLogin('Password saved. Sign in with your new password.');
    } catch {
      renderResetComplete(userId, secret, 'This link may have expired. Request a new password link from the sign-in page.');
    }
  });
}

function field(id, label, { required = false, hint = '', type = 'text', placeholder = '', value = '', inputmode = '' } = {}) {
  const error = state.errors[id];
  const maxLength = { sku: 40, category: 120, nameEn: 200, nameSi: 200 }[id];
  return `<div class="field"><label for="${id}">${label}${required ? ' <span class="required">*</span>' : ''}</label>
    <input id="${id}" name="${id}" type="${type}" ${inputmode ? `inputmode="${inputmode}"` : ''}
      value="${safe(value)}" placeholder="${safe(placeholder)}" ${required ? 'required' : ''} ${maxLength ? `maxlength="${maxLength}"` : ''}
      ${error ? `aria-invalid="true" aria-describedby="${id}-error"` : ''} />
    ${error ? `<span class="field-error" id="${id}-error">${safe(error)}</span>` : hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

function textarea(id, label, value, placeholder) {
  const error = state.errors[id];
  return `<div class="field"><label for="${id}">${label}</label>
    <textarea id="${id}" name="${id}" rows="4" maxlength="4000" placeholder="${safe(placeholder)}"
      ${error ? `aria-invalid="true" aria-describedby="${id}-error"` : ''}>${safe(value)}</textarea>
    ${error ? `<span class="field-error" id="${id}-error">${safe(error)}</span>` : ''}</div>`;
}

function variantMarkup(variant, index) {
  const error = state.errors[`variant-${index}`];
  return `<div class="variant-row" data-variant="${index}">
    <div class="variant-heading"><strong>Option ${index + 1}</strong><button type="button" class="text-button remove-variant" data-index="${index}">Remove</button></div>
    <div class="variant-fields">
      ${['sku', 'size', 'colour', 'price'].map((key) => `<div class="field"><label for="variant-${index}-${key}">${{
        sku: 'Option SKU', size: 'Size', colour: 'Colour', price: 'Price override (LKR)',
      }[key]}</label><input id="variant-${index}-${key}" data-variant-index="${index}" data-variant-key="${key}"
        type="text" maxlength="${key === 'sku' ? 40 : key === 'price' ? 12 : 80}" value="${safe(variant[key])}" placeholder="${{
          sku: 'EE-001-L', size: 'Large', colour: 'Natural', price: 'Only if different',
        }[key]}" /></div>`).join('')}
    </div>${error ? `<span class="field-error" role="alert">${safe(error)}</span>` : ''}
  </div>`;
}

function renderImageList() {
  const list = document.querySelector('#image-list');
  if (!list) return;
  list.innerHTML = '';
  state.images.forEach((image, index) => {
    const article = document.createElement('article');
    article.className = 'image-item';
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Preview of ${image.file.name}`;
    const body = document.createElement('div');
    body.className = 'image-content';
    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = image.file.name;
    const note = document.createElement('div');
    note.className = 'image-note';
    note.textContent = index === 0 ? 'Main image · first on the product page' : `Image ${index + 1}`;
    body.append(name, note);
    for (const [key, label] of [['altEn', 'Image description (English)'], ['altSi', 'Image description (Sinhala)']]) {
      const fieldWrap = document.createElement('div');
      fieldWrap.className = 'field image-alt';
      const fieldLabel = document.createElement('label');
      fieldLabel.textContent = label;
      fieldLabel.htmlFor = `image-${index}-${key}`;
      const input = document.createElement('input');
      input.id = fieldLabel.htmlFor;
      input.value = image[key];
      input.placeholder = label;
      input.maxLength = 200;
      input.disabled = state.busy;
      input.addEventListener('input', () => { image[key] = input.value; });
      fieldWrap.append(fieldLabel, input);
      body.append(fieldWrap);
    }
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    for (const [label, action, disabled] of [
      ['Move up', 'up', index === 0], ['Move down', 'down', index === state.images.length - 1], ['Remove', 'remove', false],
    ]) {
      const button = document.createElement('button');
      button.className = 'icon-button';
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled || state.busy;
      button.addEventListener('click', () => {
        if (action === 'remove') {
          URL.revokeObjectURL(image.url);
          state.images.splice(index, 1);
        } else {
          const to = index + (action === 'up' ? -1 : 1);
          [state.images[index], state.images[to]] = [state.images[to], state.images[index]];
        }
        renderImageList();
      });
      actions.append(button);
    }
    article.append(img, body, actions);
    list.append(article);
  });
  document.querySelector('#photo-count').textContent = `${state.images.length} of ${MAX_IMAGES} photos`;
}

function renderForm() {
  const p = state.product;
  // The intro clarifies that the form is for submissions only.
  shell(`<div class="intro">
    <div class="eyebrow">PRODUCT COLLECTION</div>
    <h1>Tell us about your product<span class="period">.</span></h1>
    <p>One product at a time. Add the details you want customers to see, then attach clear photos. Your submission goes to the Eco Ease development team for review.</p>
  </div>
  <form id="product-form" class="form-stack" novalidate>
    <section class="card form-section"><div class="section-number">01 / PRODUCT DETAILS</div>
      <h2>The essentials</h2><p>Use the product code from your catalogue. Fields marked * are required.</p>
      <div class="two-col">
        ${field('sku', 'Product code / SKU', { required: true, hint: 'A unique code, for example EE-001.', placeholder: 'EE-001', value: p.sku })}
        ${field('category', 'Category', { required: true, placeholder: 'Home & living', value: p.category })}
      </div>
      <div class="two-col">
        ${field('nameEn', 'Product name · English', { required: true, placeholder: 'Handwoven storage basket', value: p.nameEn })}
        ${field('nameSi', 'Product name · Sinhala', { required: true, placeholder: 'සිංහල නිෂ්පාදන නාමය', value: p.nameSi })}
      </div>
      <div class="two-col">
        ${textarea('descriptionEn', 'Description · English', p.descriptionEn, 'What is it made of? What makes it useful?')}
        ${textarea('descriptionSi', 'Description · Sinhala', p.descriptionSi, 'සිංහල විස්තරය')}
      </div>
      <div class="price-field">${field('price', 'Base price · LKR', { required: true, inputmode: 'decimal', placeholder: '2500.00', value: p.price })}</div>
    </section>
    <section class="card form-section"><div class="section-number">02 / OPTIONS</div>
      <div class="section-head"><div><h2>Sizes or colours</h2><p>Optional. Add an option only when the product has a separate SKU.</p></div>
      <button id="add-variant" type="button" class="secondary" ${p.variants.length >= MAX_VARIANTS ? 'disabled' : ''}>+ Add option</button></div>
      <div id="variant-list">${p.variants.map(variantMarkup).join('')}</div>
      ${state.errors.variants ? `<span class="field-error" role="alert">${safe(state.errors.variants)}</span>` : ''}
      ${p.variants.length ? '' : '<div class="empty-mini">No options added. That is fine for a product sold in one version.</div>'}
    </section>
    <section class="card form-section"><div class="section-number">03 / PHOTOS</div>
      <h2>Show the product clearly</h2><p>Add up to eight photos. The first photo is the main image; you can change the order below.</p>
      <label class="dropzone" for="photos"><span class="upload-symbol" aria-hidden="true">↑</span>
        <strong>Choose photos</strong><span>JPG, PNG or WebP · up to 8 MB each</span></label>
      <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" />
      <div class="photo-meta"><span id="photo-count"></span>${state.errors.images ? `<span class="field-error" role="alert">${safe(state.errors.images)}</span>` : ''}</div>
      <div id="image-list" class="image-list"></div>
    </section>
    <section class="submit-bar">
      <button id="submit-button" class="primary" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Submitting…' : 'Submit product'} <span aria-hidden="true">→</span></button>
    </section>
    <p id="form-message" class="${state.message ? 'alert' : 'sr-only'}" aria-live="polite">${safe(state.message)}</p>
  </form>`);

  document.querySelectorAll('#product-form [name]').forEach(input => {
    input.addEventListener('input', () => { state.product[input.name] = input.value; });
  });
  document.querySelectorAll('[data-variant-key]').forEach(input => {
    input.addEventListener('input', () => {
      state.product.variants[Number(input.dataset.variantIndex)][input.dataset.variantKey] = input.value;
    });
  });
  document.querySelector('#add-variant').addEventListener('click', () => {
    state.product.variants.push({ sku: '', size: '', colour: '', price: '' });
    renderForm();
  });
  document.querySelectorAll('.remove-variant').forEach(button => button.addEventListener('click', () => {
    state.product.variants.splice(Number(button.dataset.index), 1);
    renderForm();
  }));
  document.querySelector('#photos').addEventListener('change', event => {
    const additions = [...event.target.files];
    const check = validateImages([...state.images, ...additions.map(file => ({ file }))]);
    if (check) { state.errors.images = check; renderForm(); return; }
    delete state.errors.images;
    additions.forEach(file => state.images.push({ file, url: URL.createObjectURL(file), altEn: '', altSi: '' }));
    renderImageList();
    event.target.value = '';
  });
  document.querySelector('#product-form').addEventListener('submit', handleSubmit);
  renderImageList();
  if (state.busy) {
    const form = document.querySelector('#product-form');
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('input, textarea, button').forEach(control => { control.disabled = true; });
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.busy) return;
  const result = validateProduct(state.product, state.images);
  state.errors = result.errors;
  state.message = '';
  if (Object.keys(result.errors).length) {
    renderForm();
    document.querySelector('[aria-invalid="true"], .field-error, .dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  state.busy = true;
  renderForm();
  const progress = message => {
    const target = document.querySelector('#form-message');
    target.className = 'progress';
    target.textContent = message;
  };
  try {
    state.result = await submitProduct(state.product, state.images, state.user, progress, state.submission);
    state.busy = false;
    state.images.forEach(image => URL.revokeObjectURL(image.url));
    state.images = [];
    state.product = blankProduct();
    renderSuccess();
  } catch (error) {
    state.busy = false;
    state.message = error?.code === 409 ? 'This SKU was already submitted. Ask the team to check it before trying again.' :
      `We could not finish the submission. Your entries are still here. ${error?.message || 'Please try again.'}`;
    renderForm();
    document.querySelector('#form-message')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function renderSuccess() {
  shell(`<section class="card success-card"><div class="success-mark" aria-hidden="true">✓</div>
    <div class="eyebrow">SUBMISSION RECEIVED</div><h1>Product sent for review.</h1>
    <p>The Eco Ease development team can now review the details and photos. Your submission does not publish the product automatically.</p>
    <div class="reference"><span>Submission reference</span><strong>${safe(state.result.$id)}</strong></div>
    <button id="another" class="primary" type="button">Add another product <span aria-hidden="true">→</span></button>
  </section>`, true);
  document.querySelector('#another').addEventListener('click', () => {
    state.submission = newSubmission();
    state.result = null;
    state.errors = {};
    state.message = '';
    renderForm();
  });
}

if (!isConfigured) {
  renderSetup();
} else {
  shell('<section class="card notice"><p>Loading your workspace…</p></section>', true);
  const recovery = new URLSearchParams(window.location.search);
  if (recovery.has('userId') && recovery.has('secret')) {
    renderResetComplete(recovery.get('userId'), recovery.get('secret'));
  } else auth.current().then(user => {
    state.user = user;
    renderForm();
  }).catch(() => renderLogin());
}
