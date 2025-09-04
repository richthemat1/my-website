// =========================
// Header scheme + frosted panel toggle
// =========================
(function () {
  const header = document.querySelector('header.header');
  if (!header) return;

  const getSchemeUnderHeader = () => {
    const rect = header.getBoundingClientRect();
    const sampleX = Math.min(Math.max(window.innerWidth / 2, 0), window.innerWidth - 1);
    const sampleY = Math.min(rect.bottom + 1, window.innerHeight - 1);
    const el = document.elementFromPoint(sampleX, sampleY);
    const sec = el && el.closest('[data-header-scheme]');
    return (sec && sec.getAttribute('data-header-scheme')) || 'dark';
  };

  let ticking = false;
  const onScrollOrResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scheme = getSchemeUnderHeader();
      if (scheme !== header.dataset.scheme) header.dataset.scheme = scheme;
      const y = window.pageYOffset
             || document.documentElement.scrollTop
             || document.body.scrollTop
             || 0;
      header.classList.toggle('with-panel', y > 8);
      ticking = false;
    });
  };

  onScrollOrResize();
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
})();

// =========================
// Account page: profile + prompts
// =========================
(function(){
  const nameInput = document.getElementById('acc-username');
  const nameDisplay = document.getElementById('acc-username-static');
  const subSelect = document.getElementById('acc-sub');
  const upgradeBtn = document.getElementById('acc-upgrade');
  const saveBtn   = document.getElementById('acc-save');
  const badge     = document.getElementById('acc-sub-badge');
  const list      = document.getElementById('my-prompts-list');
  const emptyMsg  = document.getElementById('my-prompts-empty');
  const savedList = document.getElementById('saved-prompts-list');
  const savedEmpty= document.getElementById('saved-prompts-empty');
  const account   = document.getElementById('account');
  const addForm   = document.getElementById('acc-add-form');
  const addToggle = document.getElementById('acc-add-toggle');
  const addBtn    = document.getElementById('acc-add');
  const addTitle  = document.getElementById('acc-new-title');
  const addCat    = document.getElementById('acc-new-category');
  const addText   = document.getElementById('acc-new-text');
  const cancelBtn = document.getElementById('acc-cancel');
  if (!account) return;

  // Enforce max length on account quick-add textarea
  const MAX_PROMPT_LEN = 300;
  // Auto-resize helper: grow textarea to fit content up to 50vh
  function autoResizeTextarea(el){
    if (!el) return;
    const maxH = Math.max(180, Math.round(window.innerHeight * 0.5)); // cap growth
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxH);
    el.style.height = next + 'px';
    el.style.overflowY = (el.scrollHeight > maxH) ? 'auto' : 'hidden';
  }

  if (addText) {
    try { addText.setAttribute('maxlength', String(MAX_PROMPT_LEN)); } catch {}
    // Initial sizing based on any prefilled value
    requestAnimationFrame(() => autoResizeTextarea(addText));
    addText.addEventListener('input', () => {
      if (addText.value.length > MAX_PROMPT_LEN) {
        addText.value = addText.value.slice(0, MAX_PROMPT_LEN);
      }
      autoResizeTextarea(addText);
    });
    window.addEventListener('resize', () => autoResizeTextarea(addText));
  }

  function loadProfile(){
    return {
      username: localStorage.getItem('pv_username') || 'User',
      sub: localStorage.getItem('pv_sub') || 'Free',
    };
  }
  function saveProfile(username, sub){
    localStorage.setItem('pv_username', username);
    localStorage.setItem('pv_sub', sub);
  }
  function renderProfile(){
    const { username, sub } = loadProfile();
    // Update runtime input if present
    const runtimeInput = document.getElementById('acc-username');
    if (runtimeInput) runtimeInput.value = username;
    // Legacy safety
    if (nameInput) nameInput.value = username;
    // Update static display
    if (nameDisplay) nameDisplay.textContent = username;
    if (subSelect) subSelect.value = sub;
    if (badge) { badge.textContent = sub; badge.classList.toggle('is-pro', sub === 'Pro'); }
    if (upgradeBtn) upgradeBtn.hidden = (sub === 'Pro');
    if (cancelBtn) cancelBtn.hidden = (sub !== 'Pro');
  }
  // Replace any legacy separator control chars with a visible middot
  function normalizeMetaSeparators(){
    try{
      document.querySelectorAll('.prompt-meta').forEach(el => {
        const txt = (el.textContent || '');
        // Replace actual BEL char and any literal "\u0007" sequences
        el.textContent = txt.replace(/\u0007/g, ' • ').replace(/\\u0007/g, ' • ');
      });
    }catch{}
  }
  // Safer variant: only normalize plain-text meta within Account and preserve links
  function normalizeMetaSeparatorsSafe(){
    try{
      const root = account || document;
      root.querySelectorAll('.prompt-meta').forEach(el => {
        if (el.querySelector('a')) return; // keep existing links intact
        const txt = (el.textContent || '');
        const cleaned = txt
          .replace(/\u0007/g, ' \u0007 ')
          .replace(/\\u0007/g, ' \u0007 ')
          .replace(/\s*\u0007\s*/g, ' \u0007 ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        el.textContent = cleaned;
      });
    }catch{}
  }
  function renderPrompts(){
    let items = [];
    try { items = JSON.parse(localStorage.getItem('pv_prompts') || '[]'); } catch {}
    if (!list || !emptyMsg) return;
    list.innerHTML = '';
    if (!items.length){
      // Hide the empty-state text while the quick-add form is visible
      const formOpen = !!(addForm && !addForm.hidden);
      emptyMsg.hidden = formOpen;
      list.hidden = true;
      return;
    }
    emptyMsg.hidden = true;
    list.hidden = false;
    items.slice(0, 20).forEach(p => {
      const li = document.createElement('li');
      const title = document.createElement('p');
      title.className = 'prompt-title';
      title.textContent = p.title || '(Untitled prompt)';
      const meta = document.createElement('p');
      meta.className = 'prompt-meta';
      const cat = p.category ? ` • ${p.category}` : '';
      const date = p.date ? new Date(p.date).toLocaleDateString() : '';
      meta.textContent = [date, cat].filter(Boolean).join('');
      // Normalize meta to 'date • category'
      {
        const __parts = [];
        if (p.date) __parts.push(new Date(p.date).toLocaleDateString());
        if (p.category) __parts.push(p.category);
        meta.textContent = __parts.join(' • ');
        if (p.author) meta.textContent += ` by ${p.author}`;
      }
      // Hidden body text, toggled on click
      const body = document.createElement('p');
      body.className = 'prompt-text';
      body.textContent = p.prompt || '';
      body.hidden = true;
      const actions = document.createElement('div');
      actions.className = 'prompt-actions';
      // Show/Hide button
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'prompt-toggle';
      toggle.textContent = 'Show text prompt';
      toggle.setAttribute('aria-expanded', 'false');
      // Edit button
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'prompt-edit';
      edit.textContent = 'Edit';
      edit.setAttribute('data-id', String(p.id));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'prompt-del';
      del.textContent = 'Delete';
      del.setAttribute('data-id', String(p.id));
      actions.appendChild(toggle);
      actions.appendChild(edit);
      actions.appendChild(del);
      li.appendChild(title);
      li.appendChild(meta);
      li.appendChild(body);
      li.appendChild(actions);
      list.appendChild(li);
    });
    normalizeMetaSeparatorsSafe();
  }

  function savePrompts(items){
    try{ localStorage.setItem('pv_prompts', JSON.stringify(items)); }catch{}
  }

  // Saved prompts helpers
  function loadSaved(){
    try { return JSON.parse(localStorage.getItem('pv_saved_prompts') || '[]'); } catch { return []; }
  }
  function saveSaved(items){
    try { localStorage.setItem('pv_saved_prompts', JSON.stringify(items)); } catch {}
  }

  function renderSavedPrompts(){
    if (!savedList || !savedEmpty) return;
    const items = loadSaved();
    savedList.innerHTML = '';
    if (!items.length){
      savedEmpty.hidden = false;
      savedList.hidden = true;
      return;
    }
    savedEmpty.hidden = true;
    savedList.hidden = false;

    // Try to backfill missing preview images by matching feed cards
    let updated = false;
    const feedCards = Array.from(document.querySelectorAll('.prompt-card'));

    items.slice(0,20).forEach(p => {
      if ((!p.img || !p.author) && feedCards.length){
        const match = feedCards.find(card => {
          const t = (card.querySelector('.prompt-title')?.textContent || '').trim();
          const raw = (card.querySelector('.prompt-text')?.textContent || '').trim();
          const body = raw.replace(/^\"|\"$/g, '');
          return t === (p.title||'').trim() && body === (p.prompt||'').trim();
        });
        if (match){
          const imgEl = match.querySelector('.prompt-card__media img');
          if (imgEl){
            p.img = imgEl.getAttribute('src') || '';
            p.alt = imgEl.getAttribute('alt') || '';
            updated = true;
          }
          if (!p.author){
            const mt = (match.querySelector('.prompt-meta')?.textContent || '').trim();
            const idx = mt.toLowerCase().lastIndexOf(' by ');
            if (idx !== -1){
              p.author = mt.slice(idx+4).trim()
                .replace(/\u0007/g,'')
                .replace(/[\u2022\u00B7]/g,'')
                .replace(/[\s\-\|]+$/g,'')
                .trim();
              updated = true;
            }
          }
        }
        if (!p.img || !p.author){
          const byTitle = feedCards.find(card => ((card.querySelector('.prompt-title')?.textContent || '').trim()) === (p.title||'').trim());
          if (byTitle){
            const imgEl = byTitle.querySelector('.prompt-card__media img');
            if (imgEl){
              p.img = imgEl.getAttribute('src') || '';
              p.alt = imgEl.getAttribute('alt') || '';
              updated = true;
            }
            if (!p.author){
              const mt = (byTitle.querySelector('.prompt-meta')?.textContent || '').trim();
              const idx = mt.toLowerCase().lastIndexOf(' by ');
              if (idx !== -1){
                p.author = mt.slice(idx+4).trim()
                  .replace(/\u0007/g,'')
                  .replace(/[\u2022\u00B7]/g,'')
                  .replace(/[\s\-\|]+$/g,'')
                  .trim();
                updated = true;
              }
            }
          }
        }
      }
      const li = document.createElement('li');
      const title = document.createElement('p');
      title.className = 'prompt-title';
      title.textContent = p.title || '(Untitled prompt)';
      const meta = document.createElement('p');
      meta.className = 'prompt-meta';
      const cat = p.category ? ` \u0007 ${p.category}` : '';
      const date = p.date ? new Date(p.date).toLocaleDateString() : '';
      meta.textContent = [date, cat].filter(Boolean).join('');
      // Normalize meta to 'date • category'
      {
        const __parts = [];
        if (p.date) __parts.push(new Date(p.date).toLocaleDateString());
        if (p.category) __parts.push(p.category);
        meta.textContent = __parts.join(' • ');
      }
      // Append author to meta (with link) if available
      if (p.author) {
        const author = String(p.author).trim();
        if (author) {
          const base = (meta.textContent || '').trim();
          const slug = 'u-' + author.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
          const link = `<a class=\"author-link\" href=\"#${slug}\" data-author=\"${author}\">${author}</a>`;
          // Insert a bullet between category/date and the author link
          meta.innerHTML = base ? `${base} • by ${link}` : `by ${link}`;
        }
      }
      // Build a saved card mirroring .prompt-card
      const card = document.createElement('article');
      card.className = 'prompt-card';
      // Media (left)
      if (p.img){
        const media = document.createElement('figure');
        media.className = 'prompt-card__media';
        const im = document.createElement('img');
        im.src = p.img; im.alt = (p.alt || p.title || 'Saved prompt preview');
        im.loading = 'lazy'; im.decoding = 'async';
        media.appendChild(im);
        card.appendChild(media);
      }
      // Header
      const header = document.createElement('header');
      header.className = 'prompt-card__header';
      const h3 = document.createElement('h3'); h3.className = 'prompt-title'; h3.textContent = title.textContent;
      header.appendChild(h3); header.appendChild(meta);
      card.appendChild(header);
      // Body (hidden by default)
      const body = document.createElement('p');
      body.className = 'prompt-text';
      body.textContent = p.prompt || '';
      body.hidden = true;
      card.appendChild(body);
      // Toggle under meta
      const toggleWrap = document.createElement('div');
      toggleWrap.className = 'prompt-card__toggle';
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'prompt-toggle';
      toggleBtn.textContent = 'Show text prompt';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleWrap.appendChild(toggleBtn);
      card.appendChild(toggleWrap);

      // Actions (right, bottom)
      const actions = document.createElement('div'); actions.className = 'prompt-card__actions';
      // Like button (inline SVG heart so it works offline/CDN-free)
      const likeBtn = document.createElement('button');
      likeBtn.type = 'button';
      likeBtn.className = 'prompt-like';
      likeBtn.setAttribute('aria-pressed', 'false');
      likeBtn.setAttribute('title', 'Like');
      likeBtn.innerHTML = '<svg class=\"icon-heart\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.01 4.01 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 17.99 4 20 6.01 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z\"/></svg><span class=\"like-count\" aria-hidden=\"true\"></span><span class=\"sr-only\">Like</span>';
      actions.appendChild(likeBtn);
      // Saved button
      const savedBtn = document.createElement('button');
      savedBtn.type = 'button';
      savedBtn.className = 'btn-secondary prompt-add is-saved';
      savedBtn.textContent = 'Saved';
      savedBtn.setAttribute('data-id', String(p.id));
      actions.appendChild(savedBtn);
      card.appendChild(actions);
      li.appendChild(card);
      savedList.appendChild(li);
    });
    if (updated){
      // Persist backfilled images so future renders show them immediately
      try { localStorage.setItem('pv_saved_prompts', JSON.stringify(items)); } catch {}
    }
    normalizeMetaSeparatorsSafe();
    // Sync likes state if Like system is present
    window.__pvLikesSync?.();
  }

  function addPromptFromAccount(){
    const title = (addTitle?.value || '').trim();
    let text  = (addText?.value || '').trim();
    if (text.length > MAX_PROMPT_LEN) {
      text = text.slice(0, MAX_PROMPT_LEN);
      if(addBtn){ const old=addBtn.textContent; addBtn.textContent='Max 300 characters'; addBtn.disabled=true; setTimeout(()=>{ addBtn.textContent=old; addBtn.disabled=false; }, 900); }
    }
    const category = (addCat?.value || '').trim();
    if(!title || !text){
      // simple inline feedback
      if(addBtn){ const old=addBtn.textContent; addBtn.textContent='Fill in required fields'; addBtn.disabled=true; setTimeout(()=>{ addBtn.textContent=old; addBtn.disabled=false; }, 1000); }
      return;
    }
    let items = [];
    try { items = JSON.parse(localStorage.getItem('pv_prompts') || '[]'); } catch {}
    // If editing, update in place; else add new
    const isEditing = addBtn?.dataset?.mode === 'edit';
    const editingId = addBtn?.dataset?.id;
    if (isEditing && editingId) {
      items = items.map(p => {
        if (String(p.id) === String(editingId)) {
          return { ...p, title, category, prompt: text };
        }
        return p;
      });
    } else {
      const entry = { id: Date.now(), title, category, prompt: text, date: new Date().toISOString() };
      items.unshift(entry);
    }
    savePrompts(items);
    if(addTitle) addTitle.value = '';
    if(addText) addText.value = '';
    renderPrompts();
    // Hide form after adding, show toggle button again
    if(addForm) addForm.hidden = true;
    if(addToggle) addToggle.hidden = false;
    // Reset button state
    if (addBtn){
      addBtn.textContent = 'Add prompt';
      delete addBtn.dataset.mode;
      delete addBtn.dataset.id;
    }
  }

  addBtn?.addEventListener('click', addPromptFromAccount);
  addToggle?.addEventListener('click', () => {
    if(addForm) addForm.hidden = false;
    if(addToggle) addToggle.hidden = true;
    // Hide empty message as soon as user opts to add a prompt
    if(emptyMsg) emptyMsg.hidden = true;
    addTitle?.focus();
    // Recompute textarea height when form becomes visible
    requestAnimationFrame(() => autoResizeTextarea(addText));
  });
  list?.addEventListener('click', (e) => {
    // Explicit toggle button
    const tBtn = e.target.closest('.prompt-toggle');
    if (tBtn) {
      const item = tBtn.closest('li');
      const body = item?.querySelector('.prompt-text');
      const thumb = item?.querySelector('.saved-thumb');
      if (body){
        body.hidden = !body.hidden;
        if (thumb) thumb.hidden = body.hidden; // sync with text visibility
        tBtn.textContent = body.hidden ? 'Show text prompt' : 'Hide';
        tBtn.setAttribute('aria-expanded', String(!body.hidden));
      }
      return;
    }
    // Removed wide-area toggle: only the explicit .prompt-toggle button controls visibility
    // Edit handler
    const editBtn = e.target.closest('.prompt-edit');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if(!id) return;
      let items = [];
      try { items = JSON.parse(localStorage.getItem('pv_prompts') || '[]'); } catch {}
      const target = items.find(p => String(p.id) === String(id));
      if (!target) return;
      if(addForm) addForm.hidden = false;
      if(addToggle) addToggle.hidden = true;
      if(emptyMsg) emptyMsg.hidden = true;
      if(addTitle) addTitle.value = target.title || '';
      if(addCat && target.category) addCat.value = target.category;
      if(addText) addText.value = target.prompt || '';
      if (addBtn){
        addBtn.textContent = 'Save changes';
        addBtn.dataset.mode = 'edit';
        addBtn.dataset.id = String(id);
      }
      addTitle?.focus();
      return;
    }

    // Delete handler
    const delBtn = e.target.closest('.prompt-del');
    if(!delBtn) return;
    const id = delBtn.getAttribute('data-id');
    if(!id) return;
    let items = [];
    try { items = JSON.parse(localStorage.getItem('pv_prompts') || '[]'); } catch {}
    const next = items.filter(p => String(p.id) !== String(id));
    savePrompts(next);
    renderPrompts();
  });

  // Saved prompts: toggle body or remove from saved
  savedList?.addEventListener('click', (e) => {
    // Remove by clicking the Saved pill
    const removeBtn = e.target.closest('.prompt-add.is-saved');
    if (removeBtn){
      const id = removeBtn.getAttribute('data-id');
      const items = loadSaved();
      const next = id ? items.filter(p => String(p.id) !== String(id)) : items;
      saveSaved(next);
      renderSavedPrompts();
      // Also update browse buttons to reflect removal
      window.__pvBrowseSync?.();
      return;
    }
    // Explicit toggle button
    const tBtn = e.target.closest('.prompt-toggle');
    if (tBtn) {
      const item = tBtn.closest('li');
      const body = item?.querySelector('.prompt-text');
      const thumb = item?.querySelector('.saved-thumb');
      if (body){
        body.hidden = !body.hidden;
        if (thumb) thumb.hidden = body.hidden;
        tBtn.textContent = body.hidden ? 'Show text prompt' : 'Hide';
        tBtn.setAttribute('aria-expanded', String(!body.hidden));
      }
      return;
    }
    // Removed wide-area toggle: only the explicit .prompt-toggle button controls visibility
    // Legacy remove button path kept for safety (no-op if absent)
    const delBtn = e.target.closest('.prompt-del');
    if(delBtn){
      const id = delBtn.getAttribute('data-id');
      if(!id) return;
      const items = loadSaved();
      const next = items.filter(p => String(p.id) !== String(id));
      saveSaved(next);
      renderSavedPrompts();
      window.__pvBrowseSync?.();
    }
  });

  // Hover: show "Remove" label on the Saved pill
  savedList?.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.prompt-add.is-saved');
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent || 'Saved';
    btn.textContent = 'Remove';
  });
  savedList?.addEventListener('mouseout', (e) => {
    const btn = e.target.closest('.prompt-add.is-saved');
    if (!btn) return;
    btn.textContent = btn.dataset.label || 'Saved';
  });

  // Toggle Edit / Save for username
  saveBtn?.addEventListener('click', () => {
    const current = loadProfile();
    const inputEl = document.getElementById('acc-username');
    const isEditing = !!inputEl;

    if (!isEditing) {
      // Enter edit mode: swap static span for input
      const span = document.getElementById('acc-username-static');
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'acc-username';
      input.name = 'username';
      input.placeholder = 'Your name';
      input.required = true;
      input.value = (span?.textContent || current.username || 'User');
      // Replace the static span with the input
      if (span) span.replaceWith(input);
      if (saveBtn) saveBtn.textContent = 'Save';
      input.focus();
      return;
    }

    // Save mode
    const nextName = (inputEl.value || '').trim() || current.username || 'User';
    const nextSub = subSelect ? subSelect.value : current.sub;
    saveProfile(nextName, nextSub);
    renderProfile();

    // Swap input back to static span
    const spanNew = document.createElement('span');
    spanNew.id = 'acc-username-static';
    spanNew.textContent = nextName;
    inputEl.replaceWith(spanNew);
    if (saveBtn) saveBtn.textContent = 'Edit';
  });

  // Live badge preview when changing plan
  subSelect?.addEventListener('change', () => {
    if (badge && subSelect) {
      badge.textContent = subSelect.value;
      badge.classList.toggle('is-pro', subSelect.value === 'Pro');
    }
    if (cancelBtn && subSelect) cancelBtn.hidden = (subSelect.value !== 'Pro');
  });

  // Upgrade to Pro button
  upgradeBtn?.addEventListener('click', () => {
    const current = loadProfile();
    const runtimeInput = document.getElementById('acc-username');
    const username = runtimeInput ? ((runtimeInput.value || '').trim() || current.username) : current.username;
    saveProfile(username, 'Pro');
    renderProfile();
    // small feedback pulse on badge
    if (badge) { badge.classList.add('is-pro'); }
  });

  // Cancel subscription -> Free
  cancelBtn?.addEventListener('click', () => {
    if (!confirm('Cancel your subscription and switch to Free?')) return;
    const current = loadProfile();
    const runtimeInput = document.getElementById('acc-username');
    const username = runtimeInput ? ((runtimeInput.value || '').trim() || current.username) : current.username;
    saveProfile(username, 'Free');
    renderProfile();
    if (cancelBtn){
      const old = cancelBtn.textContent;
      cancelBtn.textContent = 'Subscription cancelled';
      cancelBtn.disabled = true;
      setTimeout(() => { cancelBtn.textContent = old; cancelBtn.disabled = false; }, 1200);
    }
  });

  // Gentle attention pulse periodically if not Pro
  (function attentionPulse(){
    if (!upgradeBtn) return;
    let i = 0;
    setInterval(() => {
      // Only pulse when visible and still Free
      const sub = loadProfile().sub;
      if (upgradeBtn.hidden || sub === 'Pro') return;
      upgradeBtn.classList.add('pulse');
      setTimeout(() => upgradeBtn.classList.remove('pulse'), 900);
      i++;
    }, 12000);
  })();

  window.__pvAccount = { render: () => { renderProfile(); renderPrompts(); renderSavedPrompts(); normalizeMetaSeparatorsSafe(); } };
  // Initial render
  window.__pvAccount.render();
})();

// =========================
// Global: normalize .prompt-meta separators across pages
// =========================
(function(){
  const normalize = () => {
    try{
      document.querySelectorAll('.prompt-meta').forEach(el => {
        const txt = el.textContent || '';
        // Replace ASCII control chars and any literal "\u0007" with middot
        let cleaned = txt.replace(/[\x00-\x1F\x7F]+/g, ' • ').replace(/\\u0007/g, ' • ');
        // Normalize spacing around the middot
        cleaned = cleaned.replace(/\s*•\s*/g, ' • ').replace(/\s{2,}/g, ' ').trim();
        el.textContent = cleaned;
        // Linkify trailing "by NAME" in prompt meta if not already linked
        if (!el.querySelector('a')){
          try {
            const m = cleaned.match(/\bby\s+([^\n\r]+)$/i);
            if (m && m[1]){
              const author = m[1].trim();
              const slug = 'u-' + author.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
              // Replace trailing author with a link, preserving any separators
              el.innerHTML = cleaned.replace(/by\s+([^\n\r]+)$/i, (m0, _name) => `by <a class="author-link" href="#${slug}" data-author="${author}">${author}</a>`);
            }
          } catch {}
        }
      });
    }catch{}
  };
  // Run on load and after DOM ready
  normalize();
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', normalize);
  }
})();

// =========================
// Browse: add "Add prompt" buttons to feed cards
// =========================
(function(){
  const browse = document.querySelector('.browse');
  if (!browse) return;

  // Inject action buttons into each prompt-card
  const cards = browse.querySelectorAll('.prompt-card');
  cards.forEach(card => {
    if (card.querySelector('.prompt-add')) return;
    const actions = document.createElement('div');
    actions.className = 'prompt-card__actions';
    // Like button with inline SVG icon
    const like = document.createElement('button');
    like.type = 'button';
    like.className = 'prompt-like';
    like.setAttribute('aria-pressed', 'false');
    like.setAttribute('title', 'Like');
    like.innerHTML = '<svg class="icon-heart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.01 4.01 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 17.99 4 20 6.01 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class=\"like-count\" aria-hidden=\"true\"></span><span class=\"sr-only\">Like</span>';
    actions.appendChild(like);
    // Add/Saved button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-secondary prompt-add';
    btn.textContent = 'Add prompt';
    actions.appendChild(btn);
    card.appendChild(actions);
  });

  // Local helpers for saved prompts
  function loadSaved(){
    try { return JSON.parse(localStorage.getItem('pv_saved_prompts') || '[]'); } catch { return []; }
  }
  function saveSaved(items){
    try { localStorage.setItem('pv_saved_prompts', JSON.stringify(items)); } catch {}
  }

  // Reflect saved state on buttons
  function updateButtons(){
    const logged = !!(window.__pvAuth?.isLoggedIn && window.__pvAuth.isLoggedIn());
    const saved = logged ? loadSaved() : [];
    const cardsNow = browse.querySelectorAll('.prompt-card');
    cardsNow.forEach(card => {
      const btn = card.querySelector('.prompt-add');
      if (!btn) return;
      const title = (card.querySelector('.prompt-title')?.textContent || '').trim();
      const rawPrompt = (card.querySelector('.prompt-text')?.textContent || '').trim();
      const prompt = rawPrompt.replace(/^\"|\"$/g, '');
      // If not logged in, always show Add prompt
      if (!logged){
        btn.textContent = 'Add prompt';
        btn.classList.remove('is-saved');
        return;
      }
      const exists = saved.some(p => (p.title||'') === title && (p.prompt||'') === prompt);
      if (exists){
        btn.textContent = 'Saved';
        btn.classList.add('is-saved');
      } else {
        btn.textContent = 'Add prompt';
        btn.classList.remove('is-saved');
      }
    });
  }
  // expose for other modules to sync after changes
  window.__pvBrowseSync = updateButtons;

  // Likes: state and syncing
  function likeKeyFromCard(card){
    const title = (card.querySelector('.prompt-title')?.textContent || '').trim();
    const raw = (card.querySelector('.prompt-text')?.textContent || '').trim();
    const body = raw.replace(/^\"|\"$/g, '').replace(/^"|"$/g, '');
    return title + '||' + body;
  }
  function loadLikes(){
    try { return JSON.parse(localStorage.getItem('pv_likes') || '[]'); } catch { return []; }
  }
  function saveLikes(arr){
    try { localStorage.setItem('pv_likes', JSON.stringify(arr)); } catch {}
  }
  function loadLikeCounts(){
    try { return JSON.parse(localStorage.getItem('pv_like_counts') || '{}'); } catch { return {}; }
  }
  function saveLikeCounts(obj){
    try { localStorage.setItem('pv_like_counts', JSON.stringify(obj)); } catch {}
  }
  function isLikedKey(key){
    const likes = loadLikes();
    return likes.includes(key);
  }
  function setLiked(btn, liked){
    if (!btn) return;
    btn.classList.toggle('is-liked', liked);
    btn.setAttribute('aria-pressed', String(!!liked));
    btn.title = liked ? 'Unlike' : 'Like';
    const sr = btn.querySelector('.sr-only');
    if (sr) sr.textContent = liked ? 'Unlike' : 'Like';
  }
  function updateLikes(){
    const counts = loadLikeCounts();
    const logged = !!(window.__pvAuth?.isLoggedIn && window.__pvAuth.isLoggedIn());
    document.querySelectorAll('.prompt-card').forEach(card => {
      const key = likeKeyFromCard(card);
      // Only reflect personal like state when logged in
      const liked = logged && isLikedKey(key);
      const btn = card.querySelector('.prompt-like');
      if (btn) {
        setLiked(btn, liked);
        const cEl = btn.querySelector('.like-count');
        const n = Number(counts[key] || 0);
        if (cEl) {
          if (n > 0){
            cEl.textContent = String(n);
            cEl.classList.add('is-visible');
            cEl.setAttribute('aria-hidden', 'false');
            btn.classList.add('has-count');
          } else {
            cEl.textContent = '';
            cEl.classList.remove('is-visible');
            cEl.setAttribute('aria-hidden', 'true');
            btn.classList.remove('has-count');
          }
        }
      }
    });
  }
  window.__pvLikesSync = updateLikes;

  // Click handler to add to Saved
  browse.addEventListener('click', (e) => {
    const btn = e.target.closest('.prompt-add');
    if (!btn) return;
    // Require auth: if not logged in, send to Sign Up and remember intent
    if (!(window.__pvAuth?.isLoggedIn && window.__pvAuth.isLoggedIn())){
      window.__pvAuth?.setPending?.('#account');
      location.hash = '#signup';
      return;
    }
    const card = btn.closest('.prompt-card');
    if (!card) return;
    const title = (card.querySelector('.prompt-title')?.textContent || '').trim();
    const rawPrompt = (card.querySelector('.prompt-text')?.textContent || '').trim();
    // Remove wrapping quotes if present
    const prompt = rawPrompt.replace(/^"|"$/g, '');
    // Category from meta before " by " and without the bullet separator
    const metaText = (card.querySelector('.prompt-meta')?.textContent || '').trim();
    let category = (metaText.split(' by ')[0] || '')
      .replace(/\u0007/g, '') // literal sequence
      .replace(/\u2022|\u00B7/g, '') // encoded bullets if present
      .replace(/[\u0007\u2022\u00B7•·]/g, '') // actual chars: BEL, bullet, middot
      .trim();
    // Extract author name (text after the last ' by ')
    let author = '';
    {
      const idx = metaText.toLowerCase().lastIndexOf(' by ');
      if (idx !== -1){
        author = metaText.slice(idx + 4).trim()
          .replace(/\u0007/g, '')
          .replace(/[\u2022\u00B7]/g, '')
          .replace(/[\s\-\|]+$/g, '')
          .trim();
      }
    }

    if (!title || !prompt) {
      const old = btn.textContent; btn.textContent = 'Missing data'; btn.disabled = true;
      setTimeout(() => { btn.textContent = 'Add prompt'; btn.disabled = false; }, 900);
      return;
    }

    let saved = loadSaved();
    const exists = saved.some(p => (p.title||'') === title && (p.prompt||'') === prompt);
    if (!exists) {
      const imgEl = card.querySelector('.prompt-card__media img');
      const img = imgEl ? (imgEl.getAttribute('src') || '') : '';
      const alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
      const entry = { id: Date.now(), title, category, author, prompt, img, alt, date: new Date().toISOString() };
      saved.unshift(entry);
      saveSaved(saved);
    }

    // Persist button state as Saved
    btn.textContent = 'Saved';
    btn.classList.add('is-saved');

    // Update account view if present
    window.__pvAccount?.render();
    // Sync any other browse buttons
    updateButtons();
  });
  // Initial sync
  updateButtons();
  updateLikes();
})();

// [reverted] View-switch wiring removed per user request.

// Global like toggle (works in Browse and Account Saved)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.prompt-like');
  if (!btn) return;
  // Gate liking behind auth; show signup when logged out
  if (!(window.__pvAuth?.isLoggedIn && window.__pvAuth.isLoggedIn())){
    e.preventDefault();
    try { window.__pvAuth?.setPending?.(location.hash || '#browse'); } catch {}
    location.hash = '#signup';
    return;
  }
  const card = btn.closest('.prompt-card');
  if (!card) return;
  function likeKeyFromCard(card){
    const title = (card.querySelector('.prompt-title')?.textContent || '').trim();
    const raw = (card.querySelector('.prompt-text')?.textContent || '').trim();
    const body = raw.replace(/^\"|\"$/g, '').replace(/^"|"$/g, '');
    return title + '||' + body;
  }
  function loadLikes(){ try { return JSON.parse(localStorage.getItem('pv_likes') || '[]'); } catch { return []; } }
  function saveLikes(arr){ try { localStorage.setItem('pv_likes', JSON.stringify(arr)); } catch {} }
  const key = likeKeyFromCard(card);
  let likes = loadLikes();
  let counts;
  try { counts = JSON.parse(localStorage.getItem('pv_like_counts') || '{}'); } catch { counts = {}; }
  if (likes.includes(key)){
    likes = likes.filter(k => k !== key);
    counts[key] = Math.max(0, Number(counts[key] || 0) - 1);
  } else {
    likes.push(key);
    counts[key] = Number(counts[key] || 0) + 1;
  }
  const likedNow = likes.includes(key);
  saveLikes(likes);
  try { localStorage.setItem('pv_like_counts', JSON.stringify(counts)); } catch {}
  // Update clicked button immediately
  btn.classList.toggle('is-liked', likedNow);
  btn.setAttribute('aria-pressed', String(likedNow));
  btn.title = likedNow ? 'Unlike' : 'Like';
  const sr = btn.querySelector('.sr-only');
  if (sr) sr.textContent = likedNow ? 'Unlike' : 'Like';
  const cEl = btn.querySelector('.like-count');
  if (cEl) {
    const n = Number(counts[key] || 0);
    if (n > 0){
      cEl.textContent = String(n);
      cEl.classList.add('is-visible');
      cEl.setAttribute('aria-hidden', 'false');
      btn.classList.add('has-count');
    } else {
      cEl.textContent = '';
      cEl.classList.remove('is-visible');
      cEl.setAttribute('aria-hidden', 'true');
      btn.classList.remove('has-count');
    }
  }
  // Sync all like buttons if available
  window.__pvLikesSync?.();
});

// =========================
// Modal close: keep scroll position when closing via X/overlay
// =========================
(function(){
  const SCROLL_KEY = 'pv_scroll_before_modal';
  const HASH_KEY = 'pv_prev_hash';
  let lastHash = location.hash;

  function rememberStateForModal(newHash){
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      sessionStorage.setItem(HASH_KEY, lastHash || '');
    } catch {}
  }

  window.addEventListener('hashchange', () => {
    const h = location.hash;
    if (h === '#signup' || h === '#login' || h === '#submit'){
      rememberStateForModal(h);
    }
    lastHash = h;
  });

  // On next hashleave after a modal close click, restore scroll
  let restoreAfterClose = false;
  function restoreScrollIfNeeded(){
    if (!restoreAfterClose) return;
    const h = location.hash;
    if (h !== '#signup' && h !== '#login' && h !== '#submit'){
      let y = 0;
      try { y = parseInt(sessionStorage.getItem(SCROLL_KEY) || '0', 10) || 0; } catch {}
      requestAnimationFrame(() => window.scrollTo(0, y));
      restoreAfterClose = false;
    }
  }

  // Delegate: before default navigation clears the hash, remember scroll, then restore after hashchange
  document.addEventListener('click', (e) => {
    const inModal = e.target.closest('.modal');
    if (!inModal) return;
    const isTargetedModal = (inModal.id === 'signup' || inModal.id === 'login' || inModal.id === 'submit');
    if (!isTargetedModal) return;
    const closeLink = e.target.closest('a.modal__close, .modal__overlay');
    const cancelLink = e.target.closest('a.btn-secondary');
    const isCancel = !!(cancelLink && /\bcancel\b/i.test(cancelLink.textContent || ''));
    if (closeLink || isCancel){
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch {}
      restoreAfterClose = true;
      // allow default so :target closes via hash (closeLink) or href="#" (cancel)
    }
  });
  window.addEventListener('hashchange', restoreScrollIfNeeded);
})();

// =========================
// Auth state (header + account section)
// =========================
(function(){
  const guest = document.querySelector('.auth-guest');
  const user = document.querySelector('.auth-user');
  const account = document.getElementById('account');
  const logoutButtons = document.querySelectorAll('#btn-logout, .btn-logout');

  const isLoggedIn = () => localStorage.getItem('pv_loggedIn') === '1';
  const pendingKey = 'pv_pending_target';
  const setPending = (hash) => { try { sessionStorage.setItem(pendingKey, hash); } catch {} };
  const getPending = () => { try { return sessionStorage.getItem(pendingKey) || ''; } catch { return ''; } };
  const consumePending = () => { const v = getPending(); try { sessionStorage.removeItem(pendingKey); } catch {} return v; };
  function update(){
    const logged = isLoggedIn();
    if (guest) guest.hidden = logged;
    if (user) user.hidden = !logged;
    if (account) account.hidden = !logged;
    // Keep browse buttons in sync with auth state
    window.__pvBrowseSync?.();
    // Also refresh likes so hearts don't appear liked when logged out
    window.__pvLikesSync?.();
  }
  function login(){ localStorage.setItem('pv_loggedIn','1'); update(); }
  function logout(){ localStorage.setItem('pv_loggedIn','0'); update(); }

  logoutButtons.forEach(btn => btn.addEventListener('click', () => { logout(); location.hash = '#home'; }));

  window.__pvAuth = { isLoggedIn, update, login, logout, setPending, getPending, consumePending };
  update();
})();

// Gate the Submit modal behind auth
(function(){
  const needsAuthHash = '#submit';
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#submit"]');
    if (!a) return;
    if (!window.__pvAuth?.isLoggedIn()){
      e.preventDefault();
      window.__pvAuth?.setPending(needsAuthHash);
      location.hash = '#signup';
    }
  });
  function guardHash(){
    if (location.hash === needsAuthHash && !window.__pvAuth?.isLoggedIn()){
      window.__pvAuth?.setPending(needsAuthHash);
      location.hash = '#signup';
    }
  }
  // Guard direct navigation
  window.addEventListener('hashchange', guardHash);
  // Initial guard
  guardHash();
})();

// =========================
// Submit form: validation + toast
// =========================
(function(){
  const form = document.querySelector('#submit .modal__form');
  if(!form) return;

  form.setAttribute('novalidate','');

  const toast = document.getElementById('submit-toast');
  const toastMsg = toast?.querySelector('.toast__msg');
  const MAX_PROMPT_LEN = 300;
  // Enforce maxlength on submit textarea as well
  const promptFieldInit = form.querySelector('textarea[name="prompt"]');
  if (promptFieldInit) {
    try { promptFieldInit.setAttribute('maxlength', String(MAX_PROMPT_LEN)); } catch {}
    promptFieldInit.addEventListener('input', () => {
      if (promptFieldInit.value.length > MAX_PROMPT_LEN) {
        promptFieldInit.value = promptFieldInit.value.slice(0, MAX_PROMPT_LEN);
      }
    });
  }

  function getErrorEl(field){
    const label = field.closest('label') || field.parentElement;
    let el = label.querySelector('.field-error');
    if(!el){ el = document.createElement('small'); el.className='field-error'; label.appendChild(el); }
    return el;
  }
  function setFieldError(field, msg){
    field.setAttribute('aria-invalid','true');
    field.closest('label')?.classList.add('input-error');
    getErrorEl(field).textContent = msg;
  }
  function clearFieldError(field){
    field.removeAttribute('aria-invalid');
    field.closest('label')?.classList.remove('input-error');
    const el = (field.closest('label') || field.parentElement)?.querySelector('.field-error');
    if(el) el.textContent = '';
  }
  function showToast(message){ if(!toast) return; if(message) toastMsg.textContent = message; toast.hidden = false; }
  function hideToast(){ if(!toast) return; toast.hidden = true; }

  form.addEventListener('input', e => {
    const t = e.target;
    if(t.matches('[required]')){
      if(t.value.trim() !== '' && (t.type !== 'email' || t.validity.valid)){
        clearFieldError(t);
      }
    }
  });

  form.addEventListener('submit', (e) => {
    hideToast();
    const requiredFields = Array.from(form.querySelectorAll('[required]'));
    const errors = [];
    requiredFields.forEach(f => {
      const value = f.value.trim();
      const isEmailInvalid = f.type === 'email' && value !== '' && !f.validity.valid;
      if(value === ''){ setFieldError(f, 'This field is required.'); errors.push(f); }
      else if(isEmailInvalid){ setFieldError(f, 'Please enter a valid email address.'); errors.push(f); }
      else { clearFieldError(f); }
    });
    // Additional max-length check for the prompt textarea
    const promptField = form.querySelector('textarea[name="prompt"]');
    if (promptField) {
      const v = (promptField.value || '').trim();
      if (v.length > MAX_PROMPT_LEN) {
        setFieldError(promptField, `Max ${MAX_PROMPT_LEN} characters.`);
        errors.push(promptField);
      }
    }

    if(errors.length){
      e.preventDefault();
      showToast(`Please complete ${errors.length} required field${errors.length>1?'s':''}.`);
      const first = errors[0];
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.focus({preventScroll:true});
      first.classList.add('shake');
      setTimeout(() => first.classList.remove('shake'), 400);
    } else {
      e.preventDefault();
      // Capture prompt into localStorage
      const title = form.querySelector('input[name="title"]').value.trim();
      const category = form.querySelector('select[name="category"]').value.trim();
      const prompt = form.querySelector('textarea[name="prompt"]').value.trim().slice(0, MAX_PROMPT_LEN);
      const entry = { id: Date.now(), title, category, prompt, date: new Date().toISOString() };
      try{
        const arr = JSON.parse(localStorage.getItem('pv_prompts')||'[]');
        arr.unshift(entry);
        localStorage.setItem('pv_prompts', JSON.stringify(arr));
      }catch{}

      window.__pvAuth?.login();
      location.hash = '#account';
      // If account module is loaded, re-render prompts
      window.__pvAccount?.render();
    }
  });

  toast?.querySelector('.toast__close')?.addEventListener('click', hideToast);
  toast?.querySelector('[data-toast-action="focus-errors"]')?.addEventListener('click', () => {
    const first = form.querySelector('[aria-invalid="true"]');
    if(first){
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.classList.add('shake');
      setTimeout(() => first.classList.remove('shake'), 400);
      first.focus({preventScroll:true});
    }
  });

  const submitModal = document.getElementById('submit');
  const submitOverlay = submitModal?.querySelector('.modal__overlay');
  const submitClose = submitModal?.querySelector('.modal__close');
  submitOverlay?.addEventListener('click', hideToast);
  submitClose?.addEventListener('click', hideToast);
  window.addEventListener('hashchange', () => { if (location.hash !== '#submit') hideToast(); });
})();


// =========================
// Tile trays (init ALL trays): reveal + per-tray nav
// =========================
(function () {
  const trays = document.querySelectorAll('.tile-tray');
  if (!trays.length) return;

  trays.forEach(tray => {
    const row  = tray.querySelector('.tile-row');
    const prevBtn = tray.querySelector('.tray-btn.prev');
    const nextBtn = tray.querySelector('.tray-btn.next');
    if (!row || !prevBtn || !nextBtn) return;

    // Allow natural horizontal scrolling (scrollbars hidden via CSS)
    row.style.overflowX = 'auto';
    row.style.scrollSnapType = 'none';
    // Keep wheel/trackpad responsive (buttons still use smooth)
    row.style.scrollBehavior = 'auto';
    row.setAttribute('tabindex', '-1');

    // Reveal tiles for this tray (IO for visible trays)
    const tiles = Array.from(row.querySelectorAll('.tile'));
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      }, { root: row, threshold: 0.15 });
      tiles.forEach(t => io.observe(t));
    } else {
      tiles.forEach(t => t.classList.add('is-visible'));
    }

    // Button navigation
    function stepSize() {
      const first = row.querySelector('.tile');
      if (!first) return 0;
      const w = first.getBoundingClientRect().width;
      const cs = getComputedStyle(row);
      const gap = parseFloat(cs.columnGap || cs.gap || '0');
      return w + gap;
    }
    function scrollByCard(dir) {
      const amount = stepSize() || Math.round(row.clientWidth * 0.85);
      row.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }
    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));

    // Enable/disable buttons at ends
    function updateButtons() {
      const max = Math.max(0, row.scrollWidth - row.clientWidth);
      const x = row.scrollLeft;
      const atStart = x <= 0;
      const atEnd   = x >= max - 1;
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd;
      prevBtn.setAttribute('aria-disabled', String(atStart));
      nextBtn.setAttribute('aria-disabled', String(atEnd));
    }
    row.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    requestAnimationFrame(updateButtons);

    // Expose a way to force-reveal when a hidden tray becomes visible
    tray.__revealTilesNow = () => {
      tiles.forEach(t => t.classList.add('is-visible'));
      requestAnimationFrame(updateButtons);
    };

    // Let the browser handle wheel/scroll natively for best performance
  });
})();



// =========================
// Browse: Preview Grid shows a compact version of the Feed
// =========================
(function(){
  const browse = document.querySelector('.browse');
  if (!browse) return;

  const feed = document.getElementById('panel-feed');
  const explorer = document.getElementById('panel-explorer');
  if (!feed || !explorer) return;

  const chipGrid = browse.querySelector('.view-switch a[href="#panel-explorer"]');
  const chipFeed = browse.querySelector('.view-switch a[href="#panel-feed"]');
  const viewMenu = browse.querySelector('.view-switch.view-menu');
  const layoutBtn = document.getElementById('layout-trigger');
  const layoutPopover = document.getElementById('layout-menu');
  const layoutBox = browse.querySelector('.layout');
  const tabGrid  = browse.querySelector('.tab-nav a[href="#panel-explorer"]');
  const tabFeed  = browse.querySelector('.tab-nav a[href="#panel-feed"]');

  function gridEl(){
    let ul = explorer.querySelector('.prompt-grid');
    if (!ul){
      ul = document.createElement('ul');
      ul.className = 'prompt-grid is-compact';
      ul.setAttribute('role', 'list');
      explorer.appendChild(ul);
    } else {
      // ensure compact style is applied
      ul.classList.add('is-compact');
    }
    return ul;
  }

  function buildGridFromFeed(){
    const ul = gridEl();
    ul.innerHTML = '';
    const cards = Array.from(feed.querySelectorAll('.prompt-card'));
    cards.slice(0, 24).forEach((card, idx) => {
      const title = (card.querySelector('.prompt-title')?.textContent || '').trim();
      const imgEl = card.querySelector('.prompt-card__media img');
      const src = imgEl ? (imgEl.getAttribute('src') || '') : '';
      const alt = imgEl ? (imgEl.getAttribute('alt') || title || 'Preview') : (title || 'Preview');
      const metaHTML = (card.querySelector('.prompt-meta')?.innerHTML || '').trim();

      const li = document.createElement('li');
      li.className = 'prompt-grid__item';
      const a = document.createElement('a');
      a.className = 'prompt-thumb';
      // No href in Explorer mode so thumbs aren’t clickable
      a.setAttribute('aria-label', title ? `Open prompt: ${title}` : 'Open prompt');
      const im = document.createElement('img');
      if (src) im.src = src; else { /* no src; leave as is */ }
      im.alt = alt || '';
      im.loading = 'lazy';
      im.decoding = 'async';
      a.appendChild(im);
      li.appendChild(a);
      // Under image: meta then title (as requested)
      const metaEl = document.createElement('p');
      metaEl.className = 'prompt-meta';
      if (metaHTML) metaEl.innerHTML = metaHTML; else metaEl.textContent = '';
      const titleEl = document.createElement('p');
      titleEl.className = 'prompt-title';
      titleEl.textContent = title || 'Untitled';
      li.appendChild(metaEl);
      li.appendChild(titleEl);
      ul.appendChild(li);

      // Do not change panels when clicking a thumbnail
      // (keeps the user in Explorer)
    });
  }

  function updateSwitchUI(goExplorer){
    // Chips
    if (chipGrid){
      const active = !!goExplorer;
      chipGrid.classList.toggle('is-active', active);
      chipGrid.setAttribute('role','radio');
      chipGrid.setAttribute('aria-checked', String(active));
      if (active) chipGrid.setAttribute('aria-current', 'page'); else chipGrid.removeAttribute('aria-current');
    }
    if (chipFeed){
      const active = !goExplorer;
      chipFeed.classList.toggle('is-active', active);
      chipFeed.setAttribute('role','radio');
      chipFeed.setAttribute('aria-checked', String(active));
      if (active) chipFeed.setAttribute('aria-current', 'page'); else chipFeed.removeAttribute('aria-current');
    }
    // Tabs
    const tFeed = browse.querySelector('#tab-feed');
    const tExp  = browse.querySelector('#tab-explorer');
    if (tFeed && tExp){
      tExp.classList.toggle('is-active', !!goExplorer);
      tExp.setAttribute('aria-selected', String(!!goExplorer));
      tFeed.classList.toggle('is-active', !goExplorer);
      tFeed.setAttribute('aria-selected', String(!goExplorer));
    }
  }

  function showExplorer(e){
    if (e) e.preventDefault();
    buildGridFromFeed();
    explorer.hidden = false;
    feed.hidden = true;
    updateSwitchUI(true);
    try { history.replaceState(null, '', '#panel-explorer'); } catch {}
  }

  function showFeed(e){
    if (e) e.preventDefault();
    explorer.hidden = true;
    feed.hidden = false;
    updateSwitchUI(false);
    try { history.replaceState(null, '', '#panel-feed'); } catch {}
  }

  // Popover menu behavior for Layout button
  function openPopover(){
    if (!layoutPopover || !layoutBtn) return;
    // Apply the open styles first so the popover paints in its final state
    layoutBtn.setAttribute('aria-expanded','true');
    layoutBox?.classList.add('is-open');
    // Then reveal on the next frame to avoid a one-frame flash
    requestAnimationFrame(() => { layoutPopover.hidden = false; });
  }
  function closePopover(){
    if (!layoutPopover || !layoutBtn) return;
    layoutBtn.setAttribute('aria-expanded','false');
    // First hide the popover, then collapse the wrapper next frame
    layoutPopover.hidden = true;
    requestAnimationFrame(() => { layoutBox?.classList.remove('is-open'); });
  }
  function togglePopover(){ if (!layoutPopover) return; if (layoutPopover.hidden) openPopover(); else closePopover(); }

  layoutBtn?.addEventListener('click', (e) => { e.preventDefault(); togglePopover(); });

  // Selecting options closes the popover
  chipFeed?.addEventListener('click', (e) => { showFeed(e); closePopover(); });
  chipGrid?.addEventListener('click', (e) => { showExplorer(e); closePopover(); });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!layoutPopover) return;
    const inside = e.target.closest('.layout');
    if (!inside) closePopover();
  });
  // Escape closes
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });
  tabGrid?.addEventListener('click', showExplorer);
  tabFeed?.addEventListener('click', showFeed);

  // Initial state based on hash
  if (location.hash === '#panel-explorer') showExplorer(); else showFeed();
  // Ensure popover starts hidden
  closePopover();

  // Make Feed titles non-links: remove href from .prompt-title anchors
  try{
    const feedTitleLinks = feed.querySelectorAll('.prompt-title a[href]');
    feedTitleLinks.forEach(a => {
      a.removeAttribute('href');
      a.style.cursor = 'default';
      // Prevent residual click behavior in some browsers
      a.addEventListener('click', (e) => e.preventDefault());
    });
  }catch{}
})();
// =========================
// Sign-up form: strength meter, show/hide, validation + toast
// =========================
(function(){
  const form = document.querySelector('#signup .modal__form');
  if(!form) return;

  const pw  = form.querySelector('#pw');
  const pw2 = form.querySelector('#pw2');
  const toggleBtn = form.querySelector('[data-toggle="pw"]');
  const strengthEl = form.querySelector('#pw-strength');
  const formError = form.querySelector('.form-error');
  const toast = document.getElementById('form-toast');
  const toastMsg = toast?.querySelector('.toast__msg');

  function score(p){
    let s = 0;
    if(p.length >= 8) s++;
    if(/[A-Z]/.test(p)) s++;
    if(/[a-z]/.test(p)) s++;
    if(/\d/.test(p))   s++;
    if(/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function labelStrength(s){
    return ['Too short','Weak','Okay','Good','Strong','Excellent'][s] || 'Weak';
  }
  function updateStrength(){
    const s = score(pw.value);
    strengthEl.textContent = pw.value ? `Password strength: ${labelStrength(s)}` : '';
  }
  pw.addEventListener('input', updateStrength);

  toggleBtn.addEventListener('click', () => {
    const nextType = pw.type === 'password' ? 'text' : 'password';
    pw.type = nextType;
    toggleBtn.textContent = (nextType === 'password') ? 'Show' : 'Hide';
  });

  function getErrorEl(field){
    const label = field.closest('label') || field.parentElement;
    let el = label.querySelector('.field-error');
    if(!el){
      el = document.createElement('small');
      el.className = 'field-error';
      label.appendChild(el);
    }
    return el;
  }
  function setFieldError(field, msg){
    field.setAttribute('aria-invalid', 'true');
    field.closest('label')?.classList.add('input-error');
    getErrorEl(field).textContent = msg;
  }
  function clearFieldError(field){
    field.removeAttribute('aria-invalid');
    field.closest('label')?.classList.remove('input-error');
    const el = (field.closest('label') || field.parentElement)?.querySelector('.field-error');
    if(el) el.textContent = '';
  }

  form.addEventListener('input', e => {
    const t = e.target;
    if(t.matches('[required]')) {
      if(t.value.trim() !== '' && (t.type !== 'email' || t.validity.valid)){
        clearFieldError(t);
      }
    }
  });

  function showToast(message){
    if(!toast) return;
    toastMsg.textContent = message;
    toast.hidden = false;
  }
  function hideToast(){ if(!toast) return; toast.hidden = true; }
  toast?.querySelector('.toast__close')?.addEventListener('click', hideToast);
  toast?.querySelector('[data-toast-action="focus-errors"]')?.addEventListener('click', () => {
    const first = form.querySelector('[aria-invalid="true"]');
    if(first){
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.classList.add('shake');
      setTimeout(() => first.classList.remove('shake'), 400);
      first.focus({preventScroll:true});
    }
  });

  // Hide the error toast when the sign-up modal is closed
  const signupModal = document.getElementById('signup');
  const signupOverlay = signupModal?.querySelector('.modal__overlay');
  const signupClose = signupModal?.querySelector('.modal__close');
  signupOverlay?.addEventListener('click', hideToast);
  signupClose?.addEventListener('click', hideToast);
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#signup') hideToast();
  });

  form.addEventListener('submit', (e) => {
    hideToast();
    formError.hidden = true; formError.textContent = '';

    const requiredFields = Array.from(form.querySelectorAll('[required]'));
    const errors = [];

    requiredFields.forEach(f => {
      const value = f.value.trim();
      const isCheckbox = f.type === 'checkbox';
      const isEmailInvalid = f.type === 'email' && !f.validity.valid;

      if(isCheckbox){
        if(!f.checked){ setFieldError(f, 'This must be checked.'); errors.push(f); }
        else { clearFieldError(f); }
        return;
      }

      if(value === ''){ setFieldError(f, 'This field is required.'); errors.push(f); }
      else if(isEmailInvalid){ setFieldError(f, 'Please enter a valid email address.'); errors.push(f); }
      else { clearFieldError(f); }
    });

    if(pw && pw2 && pw.value !== pw2.value){
      setFieldError(pw2, 'Passwords do not match.');
      if(!errors.includes(pw2)) errors.push(pw2);
    }

    if(errors.length){
      e.preventDefault();
      showToast(`Please complete ${errors.length} required field${errors.length>1?'s':''}.`);
      const first = errors[0];
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.focus({preventScroll:true});
      first.classList.add('shake');
      setTimeout(() => first.classList.remove('shake'), 400);
    } else {
      e.preventDefault();
      window.__pvAuth?.login();
      const pending = window.__pvAuth?.consumePending();
      if (pending) {
        location.hash = pending;
      } else {
        location.hash = '#account';
        window.__pvAccount?.render();
      }
    }
  });
})();


// =========================
// Footer year
// =========================
(function(){ 
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();


// =========================
// Hero title entrance animation
// =========================
(function() {
  const title = document.querySelector('.hero-title');
  if (!title) return;

  title.style.background = "linear-gradient(270deg, var(--grad-1), var(--grad-2), var(--grad-3))";
  title.style.backgroundSize = "600% 600%";
  title.style.webkitBackgroundClip = "text";
  title.style.webkitTextFillColor = "transparent";
  title.style.display = "inline-block";
  title.style.opacity = "0";
  title.style.transform = "translateY(30px)";
  title.style.transition = "opacity 0.8s ease-out, transform 0.8s ease-out";

  window.addEventListener('load', () => {
    requestAnimationFrame(() => {
      title.style.opacity = "1";
      title.style.transform = "translateY(0)";
      title.style.animation = "heroGradient 6s ease infinite";
    });
  });
})();


// =========================
// Smooth-scroll (skip modals/forms/mode pills)
// =========================
(function () {
  const header = document.querySelector('header.header');
  const headerH = () => (header ? header.getBoundingClientRect().height : 0);

  function isModifiedClick(e) {
    return e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  }

  function shouldSkip(link, target) {
    if (!target) return true;
    if (target.classList.contains('modal')) return true;
    if (link.closest('form')) return true;
    if (link.dataset.noSmooth === 'true') return true;
    if (link.closest('.pill-list')) return true; // pills handled below
    return false;
  }

  function smoothScrollTo(target) {
    const y = window.pageYOffset + target.getBoundingClientRect().top - headerH() - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || isModifiedClick(e)) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.getElementById(href.slice(1));
    if (shouldSkip(a, target)) return;

    e.preventDefault();
    smoothScrollTo(target);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.pushState(null, '', href);
  });
})();


// =========================
// Log-in form: show/hide password + simple validation
// =========================
(function(){
  const form = document.querySelector('#login .modal__form');
  if(!form) return;

  const pw = form.querySelector('#login-pw');
  const toggleBtn = form.querySelector('[data-toggle="login-pw"]');
  const formError = form.querySelector('.form-error');

  toggleBtn.addEventListener('click', () => {
    const nextType = pw.type === 'password' ? 'text' : 'password';
    pw.type = nextType;
    toggleBtn.textContent = (nextType === 'password') ? 'Show' : 'Hide';
  });

  form.addEventListener('submit', (e) => {
    formError.hidden = true; formError.textContent = '';

    const email = form.querySelector('input[type="email"]');
    let ok = true;
    if(!email.value.trim() || !email.validity.valid){
      e.preventDefault();
      formError.textContent = "Please enter a valid email.";
      formError.hidden = false;
      email.focus();
      ok = false;
      return;
    }

    if(!pw.value.trim()){
      e.preventDefault();
      formError.textContent = "Password is required.";
      formError.hidden = false;
      pw.focus();
      ok = false;
      return;
    }

    if (ok) {
      e.preventDefault();
      window.__pvAuth?.login();
      const pending = window.__pvAuth?.consumePending();
      if (pending) {
        location.hash = pending;
      } else {
        location.hash = '#account';
        window.__pvAccount?.render();
      }
    }
  });
})();


// =========================
// Mode switcher (Studio / Lab / Lightning)
// =========================
(function () {
  const pills = document.querySelectorAll('.pill-list a');
  const panels = document.querySelectorAll('.mode-panel');
  if (!pills.length || !panels.length) return;

  function showPanel(targetId) {
    panels.forEach(panel => {
      const isTarget = panel.id === targetId;
      panel.hidden = !isTarget;

      // If the Lightning panel just became visible, force-reveal its tiles
      if (isTarget && targetId === 'mode-lightning') {
        const tray = panel.querySelector('.tile-tray');
        if (tray && typeof tray.__revealTilesNow === 'function') {
          tray.__revealTilesNow();
        } else {
          // Fallback: reveal tiles directly
          panel.querySelectorAll('.tile').forEach(t => t.classList.add('is-visible'));
        }
        // Nudge arrow state after layout paints
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      }
    });

    pills.forEach(pill => {
      const active = pill.getAttribute('href') === `#${targetId}`;
      pill.classList.toggle('is-active', active);
      pill.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = pill.getAttribute('href').slice(1);
      showPanel(targetId);
      history.replaceState(null, '', `#${targetId}`);
    });
  });

  // Honor initial hash (e.g., #mode-lightning) or default to Studio
  const initialId = (location.hash && location.hash.startsWith('#mode-'))
    ? location.hash.slice(1)
    : 'mode-studio';
  showPanel(initialId);
})();

