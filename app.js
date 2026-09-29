const SUPABASE_URL = 'https://nfgwvecwqctiqrarqiwm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_U3tkA1T8GZBi0or2EwrePg_v_L38yE4';
let supabase = null;
try {
  if (!window.supabase?.createClient) throw new Error('Supabase library did not load.');
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} catch (error) {
  console.error('Supabase initialization failed:', error);
}

const input = document.querySelector('#clip-input');
const list = document.querySelector('#clip-list');
const empty = document.querySelector('#empty-state');
const count = document.querySelector('#clip-count');
const charCount = document.querySelector('#char-count');
const syncLabel = document.querySelector('#sync-label');
const toast = document.querySelector('#toast');
const authPanel = document.querySelector('#auth-panel');
const clipboardUI = document.querySelector('#clipboard-ui');
const authForm = document.querySelector('#auth-form');
const authSwitch = document.querySelector('#auth-switch');
const authSubmit = document.querySelector('#auth-submit');
const signoutButton = document.querySelector('#signout-button');
let toastTimer;
let isSignUp = false;

if (!supabase) {
  authPanel.hidden = false;
  clipboardUI.hidden = true;
  syncLabel.textContent = 'Offline';
  authSubmit.disabled = true;
  authSwitch.disabled = true;
  notify('Could not start Supabase. Check your connection and reload.');
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
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
function setSignedIn(user) {
  const signedIn = Boolean(user);
  authPanel.hidden = signedIn;
  clipboardUI.hidden = !signedIn;
  signoutButton.hidden = !signedIn;
  syncLabel.textContent = signedIn ? 'Connected' : 'Sign in';
  if (signedIn) loadClips();
  else render([]);
}
async function loadClips() {
  syncLabel.textContent = 'Syncing';
  const { data, error } = await supabase.from('clips').select('id,text,created_at').order('created_at', { ascending:false });
  if (error) {
    syncLabel.textContent = 'Offline';
    notify(error.message);
    return;
  }
  render(data || []);
  syncLabel.textContent = 'Connected';
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
    date.textContent = dateLabel(item.created_at);
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
      const { error } = await supabase.from('clips').delete().eq('id', item.id);
      if (error) notify(error.message);
      else { await loadClips(); notify('Clip deleted'); }
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
  const { error } = await supabase.from('clips').insert({ text });
  button.disabled = false;
  if (error) { notify(error.message); return; }
  input.value = '';
  charCount.textContent = '0 / 10,000';
  await loadClips();
  notify('Saved and synced');
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
authSwitch.addEventListener('click', () => {
  isSignUp = !isSignUp;
  authSubmit.textContent = isSignUp ? 'Create account' : 'Sign in';
  authSwitch.textContent = isSignUp ? 'Back to sign in' : 'Create an account';
  document.querySelector('#auth-title').textContent = isSignUp ? 'Create your account' : 'Sign in to your clipboard';
  document.querySelector('#auth-password').autocomplete = isSignUp ? 'new-password' : 'current-password';
});
authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase) { notify('Supabase is unavailable. Reload the page and try again.'); return; }
  authSubmit.disabled = true;
  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  const result = isSignUp
    ? await supabase.auth.signUp({ email, password, options:{ emailRedirectTo:window.location.href.split('#')[0] } })
    : await supabase.auth.signInWithPassword({ email, password });
  authSubmit.disabled = false;
  if (result.error) { notify(result.error.message); return; }
  if (isSignUp && !result.data.session) notify('Check your email to confirm your account, then sign in.');
  else notify(isSignUp ? 'Account created' : 'Signed in');
});
signoutButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) notify(error.message);
  else notify('Signed out');
});
if (supabase) {
  syncLabel.textContent = 'Checking session';
  supabase.auth.onAuthStateChange((_event, session) => setSignedIn(session?.user || null));
  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      setSignedIn(data.session?.user || null);
    })
    .catch(error => {
      console.error('Could not restore session:', error);
      setSignedIn(null);
      notify('Could not check your sign-in session. Please sign in again.');
    });
}
setInterval(() => { if (!clipboardUI.hidden) loadClips(); }, 15000);
