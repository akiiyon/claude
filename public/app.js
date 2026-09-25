(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const state = { conversationId: null, busy: false, voice: false, scope: null, docs: [], token: localStorage.getItem('appToken') || '' };

  // ---------- API ----------
  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (state.token) headers['x-app-token'] = state.token;
    if (opts.json) { headers['content-type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) {
      const t = prompt('Access token required');
      if (t) { state.token = t; localStorage.setItem('appToken', t); return api(path, opts); }
    }
    if (!res.ok && !opts.raw) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return opts.raw ? res : res.json();
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 3200);
  }

  // ---------- Avatar ----------
  const avatar = $('#avatar'), status = $('#status');
  function mood(m, text) {
    avatar.classList.toggle('thinking', m === 'thinking');
    avatar.classList.toggle('speaking', m === 'speaking');
    status.textContent = text || 'Ready to consult · IS codes & project documents';
  }

  // ---------- Voice (browser TTS, no cost) ----------
  $('#voiceToggle').onclick = (e) => {
    state.voice = !state.voice;
    e.currentTarget.setAttribute('aria-pressed', state.voice);
    e.currentTarget.textContent = state.voice ? '🔊' : '🔈';
    if (!state.voice) speechSynthesis.cancel();
  };
  function speak(md) {
    if (!state.voice || !('speechSynthesis' in window)) return;
    const plain = md.replace(/\[S\d+\]/g, '').replace(/[#*_`|>-]/g, ' ').replace(/\n+/g, '. ').slice(0, 1800);
    const u = new SpeechSynthesisUtterance(plain);
    u.rate = 1.03;
    u.onstart = () => mood('speaking', 'Speaking…');
    u.onend = () => mood('idle');
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // ---------- Messages ----------
  const messagesEl = $('#messages'), chatEl = $('#chat');
  const scrollDown = () => { chatEl.scrollTop = chatEl.scrollHeight; };

  function addUser(text) {
    $('#welcome').hidden = true;
    const m = el('div', 'msg user'); m.append(el('div', 'bubble', text)); messagesEl.append(m); scrollDown();
  }

  function addAssistant() {
    $('#welcome').hidden = true;
    const m = el('div', 'msg assistant');
    const bubble = el('div', 'bubble');
    const body = el('div', 'md'); body.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    bubble.append(body); m.append(el('div', 'mini-avatar', 'A'), bubble); messagesEl.append(m); scrollDown();
    return { m, bubble, body };
  }

  function renderSources(view, sources) {
    view.bubble.querySelector('.sources')?.remove();
    if (!sources?.length) return;
    const box = el('div', 'sources');
    box.append(el('div', 'sources-title', 'Sources consulted'));
    const chips = el('div', 'src-chips');
    const preview = el('div', 'src-preview'); preview.hidden = true;
    for (const s of sources) {
      const label = [s.code || s.title, s.clause ? `Cl. ${s.clause}` : s.section, s.page ? `p.${s.page}` : null].filter(Boolean).join(' · ');
      const chip = el('button', 'src'); chip.type = 'button'; chip.dataset.n = s.n;
      chip.append(el('b', null, `S${s.n} `), document.createTextNode(label));
      chip.title = s.title;
      chip.onclick = () => {
        const same = !preview.hidden && preview.dataset.n === String(s.n);
        preview.hidden = same; preview.dataset.n = s.n;
        preview.textContent = `${s.title}${s.project ? ` — ${s.project}` : ''}\n\n${s.preview || ''}${s.preview?.length >= 400 ? '…' : ''}`;
      };
      chips.append(chip);
    }
    box.append(chips, preview);
    view.bubble.append(box);
    view.body.onclick = (e) => {
      const c = e.target.closest('.cite'); if (!c) return;
      const chip = chips.querySelector(`[data-n="${c.dataset.cite.slice(1)}"]`);
      if (chip) { chip.click(); chip.classList.add('flash'); setTimeout(() => chip.classList.remove('flash'), 900); }
    };
  }

  function renderActions(view, messageId, rating, usage) {
    const bar = el('div', 'msg-actions');
    const up = el('button', rating === 'up' ? 'on' : '', '👍'); up.title = 'Good answer — remember it';
    const down = el('button', rating === 'down' ? 'on' : '', '👎'); down.title = 'Wrong or weak — teach a correction';
    const copy = el('button', '', 'Copy');
    up.onclick = () => feedback(messageId, 'up', null, up, down);
    down.onclick = () => {
      const c = prompt('What was wrong? Your correction will be remembered for future answers (optional):');
      if (c !== null) feedback(messageId, 'down', c, down, up);
    };
    copy.onclick = () => navigator.clipboard.writeText(view.raw || '').then(() => toast('Copied'));
    bar.append(up, down, copy);
    if (usage) {
      const u = el('span', 'usage', `${usage.input ?? '?'} in · ${usage.output ?? '?'} out${usage.cacheRead ? ` · ${usage.cacheRead} cached` : ''}`);
      bar.append(u);
    }
    view.bubble.append(bar);
  }

  async function feedback(messageId, rating, comment, on, off) {
    try {
      await api('/api/feedback', { method: 'POST', json: { conversationId: state.conversationId, messageId, rating, comment } });
      on.classList.add('on'); off.classList.remove('on');
      toast(rating === 'up' ? 'Saved as validated knowledge' : 'Thanks — correction noted');
      refreshStats();
    } catch (e) { toast(e.message); }
  }

  // ---------- Ask ----------
  async function ask(question) {
    if (state.busy || !question.trim()) return;
    state.busy = true; $('#send').disabled = true;
    addUser(question);
    const view = addAssistant();
    mood('thinking', 'Reviewing codes and your documents…');
    let raw = '', frame = 0, messageId = null, usage = null;

    const paint = () => { frame = 0; view.body.innerHTML = renderMarkdown(raw); scrollDown(); };
    try {
      const res = await api('/api/chat', {
        method: 'POST', raw: true,
        json: { question, conversationId: state.conversationId, docIds: state.scope ? [state.scope.id] : undefined },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          const ev = block.match(/^event: (.*)$/m)?.[1]; const data = JSON.parse(block.match(/^data: (.*)$/m)?.[1] || 'null');
          if (ev === 'conversation') { if (state.conversationId !== data.id) { state.conversationId = data.id; loadConversations(); } }
          else if (ev === 'sources') { renderSources(view, data); mood('thinking', `Analysing ${data.length} source excerpts…`); }
          else if (ev === 'delta') { if (!raw) mood('speaking', 'Answering…'); raw += data; if (!frame) frame = requestAnimationFrame(paint); }
          else if (ev === 'done') { messageId = data.messageId; usage = data.usage; }
          else if (ev === 'error') throw new Error(data.message);
        }
      }
      paint();
      view.raw = raw;
      const src = view.bubble.querySelector('.sources'); if (src) view.bubble.append(src);
      if (messageId) renderActions(view, messageId, null, usage);
      mood('idle'); speak(raw);
      refreshStats();
    } catch (e) {
      view.body.innerHTML = '';
      view.body.append(el('p', 'muted', `⚠ ${e.message}`));
      mood('idle', 'Something went wrong — see message');
    } finally {
      state.busy = false; $('#send').disabled = false; $('#input').focus();
    }
  }

  const input = $('#input');
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); } });
  $('#composer').onsubmit = (e) => { e.preventDefault(); const q = input.value; input.value = ''; input.style.height = 'auto'; ask(q); };
  document.querySelectorAll('.suggest').forEach((b) => (b.onclick = () => ask(b.textContent)));

  // ---------- Conversations ----------
  async function loadConversations() {
    const list = await api('/api/conversations');
    const nav = $('#convList'); nav.innerHTML = '';
    for (const c of list) {
      const row = el('div', `conv${c.id === state.conversationId ? ' active' : ''}`);
      row.append(el('span', null, c.title));
      const del = el('button', 'del', '✕'); del.title = 'Delete';
      del.onclick = async (e) => { e.stopPropagation(); if (!confirm('Delete this consultation?')) return; await api(`/api/conversations/${c.id}`, { method: 'DELETE' }); if (c.id === state.conversationId) newChat(); loadConversations(); refreshStats(); };
      row.append(del);
      row.onclick = () => openConversation(c.id);
      nav.append(row);
    }
  }

  async function openConversation(id) {
    const c = await api(`/api/conversations/${id}`);
    state.conversationId = id; messagesEl.innerHTML = ''; $('#welcome').hidden = true;
    for (const m of c.messages) {
      if (m.role === 'user') addUser(m.content);
      else {
        const v = addAssistant(); v.raw = m.content; v.body.innerHTML = renderMarkdown(m.content);
        renderSources(v, (m.sources || []).map((s) => ({ ...s, preview: s.preview || '' })));
        renderActions(v, m.id, m.rating);
      }
    }
    loadConversations(); $('#sidebar').classList.remove('open');
  }

  function newChat() {
    state.conversationId = null; messagesEl.innerHTML = ''; $('#welcome').hidden = false; loadConversations(); input.focus();
  }
  $('#newChat').onclick = newChat;
  $('#toggleSidebar').onclick = () => $('#sidebar').classList.toggle('open');

  // ---------- Knowledge base drawer ----------
  const openKb = (tab = 'docs') => { $('#kb').hidden = false; $('#kbBackdrop').hidden = false; showTab(tab); };
  const closeKb = () => { $('#kb').hidden = true; $('#kbBackdrop').hidden = true; };
  $('#openKb').onclick = () => openKb();
  $('#closeKb').onclick = closeKb; $('#kbBackdrop').onclick = closeKb;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeKb(); });

  function showTab(tab) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.dataset.panel !== tab));
    if (tab === 'docs') loadDocs();
    if (tab === 'learned') loadMemories();
  }
  document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));

  const TYPE_LABEL = { code: 'Code', design: 'Design doc', note: 'Note' };
  async function loadDocs() {
    state.docs = await api('/api/documents');
    renderDocs();
  }
  function renderDocs() {
    const f = $('#docFilter').value.toLowerCase();
    const list = $('#docList'); list.innerHTML = '';
    for (const d of state.docs.filter((d) => !f || [d.title, d.code, d.project, d.component].join(' ').toLowerCase().includes(f))) {
      const item = el('div', 'item'); const body = el('div', 'item-body');
      body.append(el('div', 'item-title', d.title));
      const meta = el('div', 'item-meta');
      meta.append(el('span', `tag${d.source === 'seed' ? ' warn' : ''}`, d.source === 'seed' ? 'Starter summary' : TYPE_LABEL[d.type] || d.type));
      meta.append(document.createTextNode([d.code, d.project, d.component, `${d.chunkCount} chunks`, d.pages ? `${d.pages} pages` : null].filter(Boolean).join(' · ')));
      body.append(meta);
      const actions = el('div', 'item-actions');
      const scope = el('button', null, 'Ask about'); scope.title = 'Restrict answers to this document';
      scope.onclick = () => { state.scope = d; $('#scope').hidden = false; $('#scopeName').textContent = d.title; closeKb(); input.focus(); };
      const del = el('button', null, 'Delete');
      del.onclick = async () => { if (!confirm(`Delete "${d.title}" from the knowledge base?`)) return; await api(`/api/documents/${d.id}`, { method: 'DELETE' }); loadDocs(); refreshStats(); };
      actions.append(scope, del);
      item.append(body, actions); list.append(item);
    }
    if (!list.children.length) list.append(el('p', 'muted', 'No documents yet.'));
  }
  $('#docFilter').oninput = renderDocs;
  $('#clearScope').onclick = () => { state.scope = null; $('#scope').hidden = true; };

  // Upload
  const drop = $('#drop'), files = $('#files');
  const showNames = () => { $('#fileNames').textContent = [...files.files].map((f) => f.name).join(', '); };
  files.onchange = showNames;
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { files.files = e.dataTransfer.files; showNames(); });

  $('#uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!files.files.length) return toast('Choose at least one file');
    const btn = $('#uploadBtn'); btn.disabled = true; btn.textContent = 'Reading & indexing…';
    const out = $('#uploadResult'); out.innerHTML = '';
    try {
      const results = await api('/api/documents', { method: 'POST', body: new FormData(e.target) });
      for (const r of results) {
        out.append(r.ok
          ? el('div', 'ok', `✓ ${r.doc.title} — ${r.doc.chunkCount} chunks${r.doc.code ? ` · detected ${r.doc.code}` : ''}`)
          : el('div', 'err', `✗ ${r.filename}: ${r.error}`));
      }
      e.target.reset(); $('#fileNames').textContent = ''; refreshStats();
    } catch (err) { out.append(el('div', 'err', err.message)); }
    btn.disabled = false; btn.textContent = 'Upload & index';
  };

  // Learned memories
  const KIND = { project_context: 'Project', preference: 'Preference', correction: 'Correction', fact: 'Fact', validated_answer: 'Validated answer' };
  async function loadMemories() {
    const mems = await api('/api/memories');
    const list = $('#memList'); list.innerHTML = '';
    for (const m of mems) {
      const item = el('div', 'item'); const body = el('div', 'item-body');
      const meta = el('div', 'item-meta'); meta.append(el('span', 'tag', KIND[m.kind] || m.kind), document.createTextNode(`${m.origin || ''} · ${new Date(m.createdAt).toLocaleDateString()}`));
      body.append(meta, el('div', 'item-text', m.text));
      const del = el('button', null, 'Forget');
      del.onclick = async () => { await api(`/api/memories/${m.id}`, { method: 'DELETE' }); loadMemories(); refreshStats(); };
      const actions = el('div', 'item-actions'); actions.append(del);
      item.append(body, actions); list.append(item);
    }
    if (!mems.length) list.append(el('p', 'muted', 'Nothing learned yet — it grows as you consult.'));
  }
  $('#teachForm').onsubmit = async (e) => {
    e.preventDefault();
    const t = $('#teachText'); if (!t.value.trim()) return;
    await api('/api/memories', { method: 'POST', json: { text: t.value, kind: 'fact' } });
    t.value = ''; loadMemories(); refreshStats(); toast('Learned');
  };

  async function refreshStats() {
    try {
      const s = await api('/api/stats');
      $('#kbCount').textContent = s.documents;
      $('#stats').textContent = `${s.chunks} indexed passages · ${s.memories} learned notes · ${s.semantic ? 'hybrid search' : 'keyword search'}`;
    } catch { /* ignore */ }
  }

  loadConversations().catch((e) => toast(e.message));
  refreshStats();
})();
