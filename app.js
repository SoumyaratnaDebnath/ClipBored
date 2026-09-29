const input = document.querySelector('#clip-input');
const list = document.querySelector('#clip-list');
const empty = document.querySelector('#empty-state');
const count = document.querySelector('#clip-count');
const charCount = document.querySelector('#char-count');
const syncLabel = document.querySelector('#sync-label');
const toast = document.querySelector('#toast');
let toastTimer;

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error((await response.json()).error || 'Something went wrong.');
  return response.json();
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
function dateLabel(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `Today · ${date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}`;
  return date.toLocaleDateString([], { month:'short', day:'numeric', year:date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}
function icon(name) {
  return name === 'copy'
    ? '<svg viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M10 5V3.8A1.8 1.8 0 0 0 8.2 2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/></svg>'
    : '<svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8m-3-3 3 3 3-3M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg>';
}
async function loadClips() {
  syncLabel.textContent = 'Syncing';
  try {
    const items = await request('/api/clips');
    render(items);
    syncLabel.textContent = 'Connected';
  } catch {
    syncLabel.textContent = 'Offline';
    notify('Could not connect. Try refreshing.');
  }
}
function render(items) {
  list.replaceChildren();
  count.textContent = items.length;
  empty.hidden = items.length > 0;
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'clip-card';
    const text = document.createElement('p');
    text.className = 'clip-text';
    text.textContent = item.text;
    const meta = document.createElement('div');
    meta.className = 'clip-meta';
    const date = document.createElement('span');
    date.className = 'clip-date';
    date.textContent = dateLabel(item.createdAt);
    const actions = document.createElement('div');
    actions.className = 'clip-actions';
    const copy = document.createElement('button');
    copy.className = 'action-button';
    copy.innerHTML = `${icon('copy')}<span>Copy</span>`;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(item.text); notify('Copied to your clipboard'); }
      catch { notify('Clipboard access needs a secure connection (HTTPS).'); }
    });
    const paste = document.createElement('button');
    paste.className = 'action-button';
    paste.innerHTML = `${icon('paste')}<span>Paste here</span>`;
    paste.title = 'Copy this clip, then paste it into the app you are using';
    paste.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(item.text); notify('Ready to paste on this device'); }
      catch { notify('Clipboard access needs a secure connection (HTTPS).'); }
    });
    const remove = document.createElement('button');
    remove.className = 'action-button delete';
    remove.setAttribute('aria-label', 'Delete clip');
    remove.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6 4.5V3h4v1.5m2 0-.5 9h-7l-.5-9m3 2.5v4m2-4v4"/></svg>';
    remove.addEventListener('click', async () => {
      try { await request(`/api/clips/${encodeURIComponent(item.id)}`, { method:'DELETE' }); loadClips(); notify('Clip deleted'); }
      catch (error) { notify(error.message); }
    });
    actions.append(copy, paste, remove);
    meta.append(date, actions);
    card.append(text, meta);
    list.append(card);
  }
}
async function saveClip() {
  const text = input.value.trim();
  if (!text) { input.focus(); notify('Write or paste something first'); return; }
  const button = document.querySelector('#save-button');
  button.disabled = true;
  try {
    await request('/api/clips', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ text }) });
    input.value = '';
    charCount.textContent = '0 / 10,000';
    await loadClips();
    notify('Saved and synced');
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
}
input.addEventListener('input', () => { charCount.textContent = `${input.value.length.toLocaleString()} / 10,000`; });
document.querySelector('#save-button').addEventListener('click', saveClip);
document.querySelector('#paste-device').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) { notify('Your device clipboard is empty'); return; }
    input.value = text.slice(0, 10000);
    charCount.textContent = `${input.value.length.toLocaleString()} / 10,000`;
    input.focus();
    notify('Pasted from this device');
  } catch { notify('Allow clipboard access in your browser to paste from this device.'); }
});
document.querySelector('#refresh-button').addEventListener('click', loadClips);
input.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') saveClip(); });
loadClips();
setInterval(loadClips, 15000);
