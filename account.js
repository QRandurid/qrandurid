/* Supabase owns passwords, email verification and session refresh. This module
   isolates guest/account saves and synchronizes private progress with CAS retries. */
window.Accounts = {
  client: null, user: null, busy: false, mode: 'signin', recovering: false,
  message: '', status: 'Salvestatud selles seadmes', view: '', generation: 0,
  changes: 0, syncing: false, timer: null, loading: false, freshAccount: false,
  storageKey() { return this.user ? `${KEY}:account:${this.user.id}` : KEY; },
  read(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { this.status = 'Brauseri salvestusruum pole saadaval'; return false; }
  },
  apply(progress) {
    state = normalizeProgress(progress);
    activePlace = state.scanned.includes(activePlace) ? activePlace : state.scanned[0] || null;
    this.write(this.storageKey(), state);
    renderAll();
  },
  changed() {
    if (!this.user) { this.status = 'Salvestatud selles seadmes'; this.render(); return; }
    this.changes++;
    this.write(`${this.storageKey()}:pending`, true);
    this.status = navigator.onLine ? 'Pilvesalvestus ootel…' : 'Võrguühenduseta · salvestatud seadmes';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 700);
    this.render();
  },
  async restore(session, recovery = false) {
    const next = session?.user || null;
    this.recovering = !!next && (recovery || this.recovering);
    if (next?.id === this.user?.id) { this.render(); return; }
    const generation = ++this.generation;
    if (document.getElementById('scannerOverlay').style.display === 'flex') closeScanner();
    closeSheet();
    clearTimeout(this.timer);
    this.user = next;
    this.loading = !!next;
    this.changes = 0;
    this.message = '';
    this.view = '';
    this.status = next ? 'Laen kontole salvestatud mängu…' : 'Salvestatud selles seadmes';
    const cached = this.read(this.storageKey());
    this.freshAccount = !!next && cached === null;
    this.apply(cached || defaults);
    if (next) {
      try { await this.sync(generation); }
      finally { if (generation === this.generation) { this.loading = false; this.render(); } }
    }
  },
  async sync(generation = this.generation) {
    if (!this.user || !this.client || this.syncing) return;
    if (!navigator.onLine) { this.status = 'Võrguühenduseta · salvestatud seadmes'; this.render(); return; }
    const userId = this.user.id, key = this.storageKey();
    this.syncing = true;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: row, error } = await this.client.from('qrandurid_progress')
          .select('progress,version').eq('user_id', userId).maybeSingle();
        if (generation !== this.generation) return;
        if (error) throw error;
        const pending = this.read(`${key}:pending`, false);
        const local = normalizeProgress(state);
        const next = row ? this.freshAccount && !pending ? normalizeProgress(row.progress) : mergeProgress(row.progress, local, pending) : local;
        const changeNumber = this.changes;
        const payload = { progress: next, version: row ? row.version + 1 : 1 };
        const query = row
          ? this.client.from('qrandurid_progress').update(payload).eq('user_id', userId).eq('version', row.version)
          : this.client.from('qrandurid_progress').insert({ user_id: userId, ...payload });
        const result = await query.select('progress,version').maybeSingle();
        if (generation !== this.generation) return;
        if (result.error?.code === '23505' || (!result.error && !result.data)) continue;
        if (result.error) throw result.error;
        if (this.changes !== changeNumber) continue;
        this.write(`${key}:pending`, false);
        this.freshAccount = false;
        this.status = 'Pilve salvestatud ✓';
        this.apply(result.data.progress);
        return;
      }
      throw new Error('concurrent_update');
    } catch (_) {
      if (generation === this.generation) {
        this.status = 'Pilveühendus ebaõnnestus · mäng on selles seadmes alles';
      }
    } finally {
      this.syncing = false;
      if (generation === this.generation) this.render();
      else if (this.user) this.sync();
    }
  },
  setMode(mode) { this.mode = mode; this.message = ''; this.view = ''; this.render(); },
  async submit(event) {
    event.preventDefault();
    if (this.busy || !this.client) return;
    const form = event.target;
    if (!form.reportValidity()) return;
    const email = form.elements.email?.value.trim();
    const password = form.elements.password?.value;
    const mode = this.recovering ? 'password' : this.mode;
    this.busy = true; this.message = ''; this.render();
    try {
      const redirectTo = new URL('.', location.href).href;
      let result;
      if (mode === 'signup') result = await this.client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      else if (mode === 'recover') result = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
      else if (mode === 'password') result = await this.client.auth.updateUser({ password });
      else result = await this.client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'recover') this.message = 'Kui selle e-postiga konto on olemas, saabub parooli muutmise link. Vaata ka rämpsposti.';
      else if (mode === 'signup' && !result.data.session) this.message = 'Vaata oma e-posti ja kinnita konto. Seejärel logi sisse.';
      else if (mode === 'password') { this.recovering = false; this.view = ''; this.message = 'Uus parool on salvestatud.'; }
      else { await this.restore(result.data.session); }
    } catch (_) {
      this.message = mode === 'signin' ? 'Sisselogimine ei õnnestunud. Kontrolli e-posti, parooli ja konto kinnitust.'
        : 'Toiming ei õnnestunud. Kontrolli andmeid ja võrguühendust ning proovi uuesti.';
    } finally {
      if (form.elements.password) form.elements.password.value = '';
      this.busy = false; this.render();
    }
  },
  importGuest() {
    if (!this.user || this.loading) return;
    const guest = this.read(KEY);
    if (!guest) { this.message = 'Selles brauseris pole külalisena salvestatud mängu.'; this.render(); return; }
    if (!confirm('Kas liidan selle brauseri külalisena kogutud kohad ja esemed sinu kontoga? Sinu konto senine edenemine jääb alles.')) return;
    this.apply(mergeProgress(state, guest, false));
    this.changed();
  },
  async logout() {
    if (this.busy || !this.client) return;
    this.busy = true; this.render();
    // Switch back to the guest only after the SDK confirms session removal.
    try { const { error } = await this.client.auth.signOut({ scope: 'local' }); if (error) throw error; await this.restore(null); }
    catch (_) { this.message = 'Väljalogimine ei õnnestunud. Proovi uuesti.'; }
    finally { this.busy = false; this.render(); }
  },
  render() {
    const panel = document.getElementById('accountPanel');
    if (!panel) return;
    const view = !this.client ? 'unconfigured' : this.recovering ? 'password' : this.user ? `user:${this.user.id}` : this.mode;
    document.getElementById('profileAccountLabel').textContent = this.user ? 'MINU KONTO' : 'KÜLALINE';
    document.getElementById('saveStatus').textContent = this.status;
    document.getElementById('resetDemoBtn').hidden = !!this.user;
    if (view !== this.view) {
      this.view = view;
      if (view === 'unconfigured') {
        panel.innerHTML = '<h3>Sinu mäng jääb alles</h3><p>Edenemine salvestub automaatselt selles brauseris. E-posti ja parooliga pilvesalvestus pole veel ühendatud.</p>';
      } else if (this.user && !this.recovering) {
        panel.innerHTML = `<h3>Minu konto</h3><p class="accountEmail">${esc(this.user.email || '')}</p><p>Kohad, XP, skinid, laulud ja raamid salvestatakse sinu kontole.</p><div class="miniActions"><button class="btn primary" onclick="Accounts.sync()">SALVESTA PILVE</button><button id="importGuestBtn" class="btn" onclick="Accounts.importGuest()">TOO KÜLALISE MÄNG KAASA</button><button class="btn" onclick="Accounts.logout()">LOGI VÄLJA</button></div><p id="accountMessage" role="status"></p>`;
      } else {
        const passwordOnly = view === 'password', recover = view === 'recover', signup = view === 'signup';
        panel.innerHTML = `<h3>${passwordOnly ? 'Vali uus parool' : recover ? 'Unustasid parooli?' : signup ? 'Loo oma konto' : 'Jätka oma seiklust'}</h3><p>${passwordOnly ? 'Uus parool peab sisaldama vähemalt 10 tähemärki.' : 'Logi sisse ja jätka sama mängu ka teises seadmes. Külalisena kogutu saad hiljem kontole kaasa tuua.'}</p><form id="accountForm" onsubmit="Accounts.submit(event)">${passwordOnly ? '' : '<label>E-post<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="sina@näide.ee"></label>'}${recover ? '' : `<label>Parool<input name="password" type="password" autocomplete="${signup || passwordOnly ? 'new-password' : 'current-password'}" required minlength="${signup || passwordOnly ? 10 : 1}" maxlength="128" ${signup || passwordOnly ? 'placeholder="Vähemalt 10 tähemärki"' : ''}></label>`}<button class="btn primary" type="submit">${passwordOnly ? 'SALVESTA UUS PAROOL' : recover ? 'SAADA TAASTAMISLINK' : signup ? 'LOO KONTO' : 'LOGI SISSE'}</button></form><div class="accountLinks">${passwordOnly ? '' : `<button onclick="Accounts.setMode('${signup || recover ? 'signin' : 'signup'}')">${signup || recover ? 'Tagasi sisselogimise juurde' : 'Loo uus konto'}</button>${recover ? '' : '<button onclick="Accounts.setMode(\'recover\')">Unustasin parooli</button>'}`}</div><p id="accountMessage" role="status"></p>`;
      }
    }
    const message = document.getElementById('accountMessage');
    if (message) message.textContent = this.message;
    for (const button of panel.querySelectorAll('button')) button.disabled = this.busy;
    const importButton = document.getElementById('importGuestBtn');
    if (importButton) importButton.disabled = this.busy || this.loading;
    const retry = document.getElementById('retrySync');
    retry.hidden = !this.user;
    retry.disabled = this.syncing;
  },
  async init() {
    const config = window.QRANDURID_ACCOUNT_CONFIG || {};
    try {
      const url = new URL(config.supabaseUrl);
      if (url.protocol !== 'https:' || !config.publishableKey || !window.supabase) throw new Error('not_configured');
      // Only the public publishable/anon key belongs in a static website.
      const key = config.publishableKey;
      if (!key.startsWith('sb_publishable_')) {
        const claims = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (claims.role !== 'anon') throw new Error('private_key');
      }
      this.client = window.supabase.createClient(url.href, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
          storageKey: 'qrandurid-auth-session' },
        global: { fetch: (url, options) => fetch(url, { ...options, signal: options?.signal || AbortSignal.timeout(15000) }) }
      });
      this.client.auth.onAuthStateChange((event, session) => {
        // Avoid calling other SDK operations inside its authentication lock.
        setTimeout(() => this.restore(session, event === 'PASSWORD_RECOVERY'), 0);
      });
      const { data } = await this.client.auth.getSession();
      await this.restore(data.session);
    } catch (_) { this.status = 'Salvestatud selles seadmes'; }
    this.render();
    window.addEventListener('online', () => this.sync());
    window.addEventListener('offline', () => { if (this.user) this.status = 'Võrguühenduseta · salvestatud seadmes'; this.render(); });
  }
};
Accounts.init();
