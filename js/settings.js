// ============================================================
// settings.js — Account Settings Modal
//
// Depends on: _supabase (config.js), SUPABASE_URL (config.js),
//             appState (state.js), logout (auth.js)
// Called by: openSettingsModal() (wired from sidebar profile row)
// ============================================================

// ── Open / Close ──────────────────────────────────────────────

function openSettingsModal() {
  if (!appState.currentUser) return;
  _populateSettingsProfile();
  switchSettingsTab('profile');
  // Clear all feedback messages
  ['settingsProfileError','settingsProfileSuccess',
   'settingsPasswordError','settingsPasswordSuccess',
   'settingsDangerError'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('open');
  // Reset danger zone
  var confirmInput = document.getElementById('settingsDeleteConfirmInput');
  var deleteBtn    = document.getElementById('settingsDeleteBtn');
  if (confirmInput) confirmInput.value = '';
  if (deleteBtn)    deleteBtn.disabled = true;
  // Clear password fields
  var np = document.getElementById('settingsNewPassword');
  var cp = document.getElementById('settingsConfirmPassword');
  if (np) np.value = '';
  if (cp) cp.value = '';
}

// ── Tab switching ─────────────────────────────────────────────

function switchSettingsTab(tab) {
  ['profile', 'danger'].forEach(function(t) {
    var tabBtn  = document.getElementById('settingsTab-' + t);
    var tabForm = document.getElementById('settingsForm-' + t);
    var active  = (t === tab);
    if (tabBtn) {
      tabBtn.style.borderBottomColor = active ? 'var(--accent)' : 'transparent';
      tabBtn.style.color             = active ? 'var(--accent)' : 'var(--text-muted)';
      tabBtn.style.fontWeight        = active ? '700' : '600';
    }
    if (tabForm) tabForm.style.display = active ? '' : 'none';
  });
}

// ── Populate profile form with current user data ──────────────

function _populateSettingsProfile() {
  var user = appState.currentUser;
  if (!user) return;
  var nameEl  = document.getElementById('settingsName');
  var emailEl = document.getElementById('settingsEmail');
  if (nameEl)  nameEl.value  = user.name  || '';
  if (emailEl) emailEl.value = user.email || '';
}

// ── Save profile (name + email) ───────────────────────────────

async function saveProfileSettings() {
  var user = appState.currentUser;
  if (!user) return;

  var newName  = (document.getElementById('settingsName').value  || '').trim();
  var newEmail = (document.getElementById('settingsEmail').value || '').trim();
  var errEl    = document.getElementById('settingsProfileError');
  var succEl   = document.getElementById('settingsProfileSuccess');
  var btn      = document.getElementById('settingsSaveProfileBtn');

  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!newName)  { _showSettingsMsg(errEl, 'Name cannot be empty.');  return; }
  if (!newEmail) { _showSettingsMsg(errEl, 'Email cannot be empty.'); return; }

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  var messages = [];
  var anyError = null;

  // Update display name in user_profiles
  if (newName !== user.name) {
    var { error: nameErr } = await _supabase
      .from('user_profiles')
      .update({ name: newName })
      .eq('id', user.id);
    if (nameErr) {
      anyError = nameErr.message;
    } else {
      appState.currentUser.name = newName;
      if (typeof _refreshSidebarProfile === 'function') _refreshSidebarProfile();
      messages.push('Name updated.');
    }
  }

  // Update email via Supabase auth (sends a confirmation email to the new address)
  if (!anyError && newEmail.toLowerCase() !== user.email.toLowerCase()) {
    var { error: emailErr } = await _supabase.auth.updateUser({ email: newEmail });
    if (emailErr) {
      anyError = emailErr.message;
    } else {
      messages.push('Confirmation email sent to ' + newEmail + '. Your email will update once confirmed.');
    }
  }

  btn.disabled    = false;
  btn.textContent = 'Save Changes';

  if (anyError) {
    _showSettingsMsg(errEl, anyError);
  } else if (messages.length > 0) {
    _showSettingsMsg(succEl, messages.join(' '));
  } else {
    _showSettingsMsg(succEl, 'No changes to save.');
  }
}

// ── Save password ─────────────────────────────────────────────

async function savePasswordSettings() {
  var newPass  = document.getElementById('settingsNewPassword').value  || '';
  var confPass = document.getElementById('settingsConfirmPassword').value || '';
  var errEl    = document.getElementById('settingsPasswordError');
  var succEl   = document.getElementById('settingsPasswordSuccess');
  var btn      = document.getElementById('settingsSavePasswordBtn');

  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!newPass)           { _showSettingsMsg(errEl, 'Please enter a new password.'); return; }
  if (newPass.length < 8) { _showSettingsMsg(errEl, 'Password must be at least 8 characters.'); return; }
  if (newPass !== confPass) { _showSettingsMsg(errEl, 'Passwords do not match.'); return; }

  btn.disabled    = true;
  btn.textContent = 'Updating…';

  var { error } = await _supabase.auth.updateUser({ password: newPass });

  btn.disabled    = false;
  btn.textContent = 'Update Password';

  if (error) {
    _showSettingsMsg(errEl, error.message);
  } else {
    document.getElementById('settingsNewPassword').value    = '';
    document.getElementById('settingsConfirmPassword').value = '';
    _showSettingsMsg(succEl, 'Password updated successfully.');
  }
}

// ── Delete account — confirmation input watcher ───────────────

function onDeleteConfirmInput() {
  var val = (document.getElementById('settingsDeleteConfirmInput').value || '').trim();
  var btn = document.getElementById('settingsDeleteBtn');
  if (btn) btn.disabled = (val !== 'DELETE');
}

// ── Delete account ────────────────────────────────────────────

async function deleteAccount() {
  var user = appState.currentUser;
  if (!user) return;

  var errEl = document.getElementById('settingsDangerError');
  var btn   = document.getElementById('settingsDeleteBtn');

  errEl.style.display = 'none';
  btn.disabled        = true;
  btn.textContent     = 'Deleting…';

  try {
    var { data: sessionData } = await _supabase.auth.getSession();
    if (!sessionData || !sessionData.session) throw new Error('No active session. Please log in and try again.');

    var response = await fetch(SUPABASE_URL + '/functions/v1/delete-account', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessionData.session.access_token,
        'Content-Type':  'application/json'
      }
    });

    var result = {};
    try { result = await response.json(); } catch(e) {}

    if (!response.ok) {
      throw new Error(result.error || 'Deletion failed (HTTP ' + response.status + '). Please try again.');
    }

    // Sign out client-side and scrub local storage
    await logout();
    try {
      Object.keys(localStorage)
        .filter(function(k) { return k.startsWith('sb-') || k.startsWith('cc_') || k === 'CC_TEMPLATES'; })
        .forEach(function(k) { localStorage.removeItem(k); });
    } catch(e) { /* ignore */ }

    closeSettingsModal();
    alert('Your account and all data have been permanently deleted.');
    window.location.reload();

  } catch(err) {
    btn.disabled    = false;
    btn.textContent = 'Permanently Delete My Account';
    _showSettingsMsg(errEl, err.message || 'An unexpected error occurred.');
  }
}

// ── Internal helpers ──────────────────────────────────────────

function _showSettingsMsg(el, msg) {
  if (!el) return;
  el.textContent   = msg;
  el.style.display = '';
}
