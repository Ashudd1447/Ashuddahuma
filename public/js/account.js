/* Accounts: Firebase Authentication over its REST API, no SDK, as in IQRA.
   Signing in is optional and the whole site works signed out. For now an
   account only tells the admin apart, who gets the link to the admin pages;
   profiles for each child will build on it later. The session (a refresh
   token) lives in localStorage. Nothing here grants anything on a server:
   the admin pages only write files on the admin's own computer, and they
   ask the auth server whose token this is before showing themselves. */
const account = (() => {
  const API_KEY = 'AIzaSyDMr1pybxyrd84jthxj_TnqJZKGnpIs7RM';
  const ADMIN_EMAIL_HASH = '53afda5b3f5893822338ad2328d35e0e6ce9a1a71eb709d3304280d0b0b2eba3';
  const KEY = 'ashudd-session';
  const host = location.hostname;
  const LOCAL = host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]';
  /* The session also lives here, so a browser that blocks storage still
     stays signed in for the page. */
  let memory = null;

  async function sha256(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function session() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.idToken && s.refreshToken) return s;
    } catch {
      // Storage blocked: fall through to the copy in memory.
    }
    return memory;
  }

  function store(s) {
    memory = s;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // Storage blocked: the copy in memory serves this page.
    }
  }

  function signOut() {
    memory = null;
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem('pinHash'); // left by the PIN gate this replaced
    } catch {
      // Nothing stored.
    }
  }

  async function toolkit(method, body) {
    let response;
    try {
      response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('NETWORK');
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json.error && json.error.message) || 'NETWORK');
    return json;
  }

  /* The code at the front of an Identity Toolkit error, which sometimes
     carries a description after ' : '. */
  const codeOf = (message) => String(message || '').split(' : ')[0];

  function fromResponse(json, name) {
    const s = {
      uid: json.localId,
      email: json.email,
      name: json.displayName || name || '',
      idToken: json.idToken,
      refreshToken: json.refreshToken,
      expiresAt: Date.now() + Number(json.expiresIn) * 1000,
    };
    store(s);
    return s;
  }

  async function signIn(email, password) {
    return fromResponse(await toolkit('signInWithPassword', { email, password, returnSecureToken: true }));
  }

  async function signUp(email, password, name) {
    const s = fromResponse(await toolkit('signUp', { email, password, returnSecureToken: true }), name);
    if (name) {
      try {
        await toolkit('update', { idToken: s.idToken, displayName: name, returnSecureToken: false });
      } catch {
        // The name is kept locally either way.
      }
    }
    return s;
  }

  /* A valid ID token, refreshed when it is about to expire; null when signed
     out or offline. */
  async function idToken() {
    const s = session();
    if (!s) return null;
    if (Date.now() < s.expiresAt - 5 * 60 * 1000) return s.idToken;
    try {
      const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}`,
      });
      const json = await response.json();
      if (!response.ok) {
        // The server refused the session (expired, revoked, account gone):
        // forget it, so the home page offers signing in again.
        signOut();
        return null;
      }
      store({ ...s, idToken: json.id_token, refreshToken: json.refresh_token, expiresAt: Date.now() + Number(json.expires_in) * 1000 });
      return json.id_token;
    } catch {
      return null; // offline: keep the session for later
    }
  }

  async function isAdminEmail(email) {
    if (!email) return false;
    try {
      return (await sha256(email.trim().toLowerCase())) === ADMIN_EMAIL_HASH;
    } catch {
      return false;
    }
  }

  /* The admin pages ask the auth server who the token belongs to, so a
     session typed into localStorage opens nothing. On localhost, the admin's
     own computer, they open freely. */
  async function verifyAdmin() {
    if (LOCAL) return true;
    const token = await idToken();
    if (!token) return false;
    try {
      const json = await toolkit('lookup', { idToken: token });
      const user = json.users && json.users[0];
      return !!user && (await isAdminEmail(user.email));
    } catch (failure) {
      if (['INVALID_ID_TOKEN', 'USER_NOT_FOUND', 'USER_DISABLED'].includes(codeOf(failure.message))) signOut();
      return false;
    }
  }

  /* An Identity Toolkit error code, in words the parents can act on. */
  function message(raw) {
    const code = codeOf(raw);
    switch (code) {
      case 'INVALID_LOGIN_CREDENTIALS':
      case 'INVALID_PASSWORD':
      case 'EMAIL_NOT_FOUND':
        return 'الْبَرِيدُ أَوْ كَلِمَةُ الْمُرُورِ غَيْرُ صَحِيحَةٍ.';
      case 'EMAIL_EXISTS':
        return 'لِهَذَا الْبَرِيدِ حِسَابٌ؛ سَجِّلِ الدُّخُولَ.';
      case 'INVALID_EMAIL':
        return 'هَذَا لَيْسَ بَرِيدًا إِلِكْتُرُونِيًّا.';
      case 'TOO_MANY_ATTEMPTS_TRY_LATER':
        return 'مُحَاوَلَاتٌ كَثِيرَةٌ؛ انْتَظِرْ دَقِيقَةً.';
      case 'OPERATION_NOT_ALLOWED':
      case 'PASSWORD_LOGIN_DISABLED':
      case 'CONFIGURATION_NOT_FOUND':
        return 'تَسْجِيلُ الدُّخُولِ غَيْرُ مُفَعَّلٍ بَعْدُ.';
      case 'ADMIN_ONLY_OPERATION':
        return 'إِنْشَاءُ الْحِسَابَاتِ مُغْلَقٌ.';
      case 'USER_DISABLED':
        return 'هَذَا الْحِسَابُ مُوقَفٌ.';
      case 'WEAK_PASSWORD':
        return 'كَلِمَةُ الْمُرُورِ قَصِيرَةٌ.';
      case 'NETWORK':
        return 'تَعَذَّرَ الِاتِّصَالُ.';
      default:
        return 'لَمْ يَنْجَحْ ذَلِكَ؛ حَاوِلْ مَرَّةً أُخْرَى.';
    }
  }

  const escape = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* The optional sign-in button at the top of the home page, and its panel. */
  function build(root) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-button';
    button.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.className = 'account-panel';
    panel.hidden = true;
    root.append(button, panel);
    let creating = false;
    let busy = false;

    const render = async () => {
      const s = session();
      if (s) {
        button.innerHTML = `<span>${escape(s.name || s.email)}</span>`;
        const admin = await isAdminEmail(s.email);
        panel.innerHTML = `${s.name ? `<p class="account-name">${escape(s.name)}</p>` : ''}
          <p class="account-note" dir="ltr">${escape(s.email)}</p>
          ${admin ? '<a class="button" href="admin.html">صَفْحَةُ الْمُشْرِفِ</a>' : ''}
          <button class="button quiet" type="button" data-out>تَسْجِيلُ الْخُرُوجِ</button>`;
        return;
      }
      button.innerHTML = '<span>تَسْجِيلُ الدُّخُولِ</span><small>اِخْتِيَارِيٌّ</small>';
      panel.innerHTML = `<p class="account-note">التَّطْبِيقُ يَعْمَلُ كَامِلًا دُونَ تَسْجِيلٍ.</p>
        <form class="account-form">
          ${creating ? '<input name="name" type="text" placeholder="الِاسْمُ" autocomplete="name" required>' : ''}
          <input name="email" type="email" placeholder="الْبَرِيدُ الْإِلِكْتُرُونِيُّ" autocomplete="username" required>
          <input name="password" type="password" placeholder="كَلِمَةُ الْمُرُورِ" autocomplete="${creating ? 'new-password' : 'current-password'}"${creating ? ' minlength="8"' : ''} required>
          <button class="button" type="submit">${creating ? 'إِنْشَاءُ حِسَابٍ' : 'دُخُولٌ'}</button>
          <p class="account-error" aria-live="polite"></p>
        </form>
        <button class="account-link" type="button" data-switch>${creating ? 'لَدَيَّ حِسَابٌ' : 'حِسَابٌ جَدِيدٌ'}</button>`;
    };

    const open = (on) => {
      panel.hidden = !on;
      button.setAttribute('aria-expanded', String(on));
      if (on) {
        const field = panel.querySelector('input');
        if (field) field.focus();
      }
    };

    button.addEventListener('click', () => open(panel.hidden));
    panel.addEventListener('click', async (event) => {
      const target = event.target.closest('button');
      if (!target || busy) return;
      if (target.dataset.switch !== undefined) {
        // Keep what was typed across the switch.
        const form = panel.querySelector('form');
        const typed = { email: form.email.value, password: form.password.value };
        creating = !creating;
        await render();
        const next = panel.querySelector('form');
        next.email.value = typed.email;
        next.password.value = typed.password;
        open(true);
      } else if (target.dataset.out !== undefined) {
        signOut();
        await render();
        open(false);
        button.focus();
      }
    });
    panel.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const form = event.target;
      const error = form.querySelector('.account-error');
      const email = form.email.value.trim();
      const password = form.password.value;
      busy = true;
      form.querySelector('[type=submit]').disabled = true;
      try {
        if (creating) await signUp(email, password, form.name.value.trim());
        else await signIn(email, password);
        await render();
        open(false);
        button.focus();
      } catch (failure) {
        error.textContent = message(failure.message);
        form.querySelector('[type=submit]').disabled = false;
      } finally {
        busy = false;
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) open(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') open(false);
    });
    render();
  }

  const root = document.getElementById('account');
  if (root) build(root);

  return { session, signIn, signUp, signOut, idToken, isAdminEmail, verifyAdmin, message };
})();
