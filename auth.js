/**
 * ResumeForge — Supabase & Email Authentication
 * Fully reliable authentication with persistent sessions and user dashboard integration.
 */

window.SUPABASE_URL = window.SUPABASE_URL || "https://znsgjsihddcnbxchgrot.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('sb_anon_key') || "";

let currentUser = null;
let pendingDownloadAction = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupAuthListeners();
});

async function initAuth() {
  if (typeof initSupabase === 'function') {
    initSupabase();
  }

  const sb = window.supabaseClient;
  if (sb && sb.auth) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        currentUser = {
          email: session.user.email,
          id: session.user.id,
          provider: 'supabase'
        };
      }
    } catch (e) {
      console.warn('Supabase session fetch notice:', e);
    }

    try {
      sb.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          currentUser = {
            email: session.user.email,
            id: session.user.id,
            provider: 'supabase'
          };
        } else {
          currentUser = null;
        }
        updateAuthUI(currentUser);
        if (typeof updateDashboardBadge === 'function') updateDashboardBadge();
        if (currentUser && pendingDownloadAction) {
          closeAuthModal();
          const action = pendingDownloadAction;
          pendingDownloadAction = null;
          action();
        }
      });
    } catch (e) {
      console.warn('Supabase listener notice:', e);
    }
  }

  // Fallback to local storage session
  if (!currentUser) {
    const localSession = localStorage.getItem('resumeforge_user');
    if (localSession) {
      try {
        currentUser = JSON.parse(localSession);
      } catch (e) {
        currentUser = null;
      }
    }
  }

  updateAuthUI(currentUser);
  if (typeof updateDashboardBadge === 'function') updateDashboardBadge();
}

function updateAuthUI(user) {
  const authContainer = document.getElementById('headerAuthSection');
  if (!authContainer) return;

  if (user) {
    const emailPrefix = user.email ? user.email.split('@')[0] : 'User';
    authContainer.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" id="btnOpenDashboard" title="View your saved resumes">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>My Resumes</span>
        <span class="badge-count" id="dashboardCountBadge" style="display:none;">0</span>
      </button>

      <div class="user-profile-badge" title="${escapeHtml(user.email)}">
        <div class="user-avatar">${emailPrefix.charAt(0).toUpperCase()}</div>
        <span class="user-email-label">${escapeHtml(emailPrefix)}</span>
        <button type="button" class="btn-signout" id="btnSignOut" title="Sign Out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    document.getElementById('btnSignOut')?.addEventListener('click', handleSignOut);
    document.getElementById('btnOpenDashboard')?.addEventListener('click', () => {
      if (typeof openDashboardModal === 'function') openDashboardModal();
    });

    if (typeof updateDashboardBadge === 'function') updateDashboardBadge();
  } else {
    authContainer.innerHTML = `
      <button type="button" class="btn btn-outline btn-sm" id="btnOpenAuthModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        Sign In
      </button>
    `;

    document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => openAuthModal('signin'));
  }
}

function setupAuthListeners() {
  document.getElementById('btnCloseAuthModal')?.addEventListener('click', closeAuthModal);
  document.getElementById('authModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'authModalOverlay') closeAuthModal();
  });

  document.getElementById('tabSignIn')?.addEventListener('click', () => switchAuthTab('signin'));
  document.getElementById('tabSignUp')?.addEventListener('click', () => switchAuthTab('signup'));

  document.getElementById('linkSwitchToSignUp')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('signup');
  });

  document.getElementById('linkSwitchToSignIn')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('signin');
  });

  // Password visibility toggle
  document.getElementById('btnTogglePassword')?.addEventListener('click', () => {
    const pwInput = document.getElementById('authPassword');
    if (pwInput) {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    }
  });

  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
}

function switchAuthTab(mode) {
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const submitBtn = document.getElementById('btnAuthSubmit');
  const authTitle = document.getElementById('authModalTitle');
  const authDesc = document.getElementById('authModalDesc');
  const errorBox = document.getElementById('authErrorBox');
  const footerSignIn = document.getElementById('authFooterSignIn');
  const footerSignUp = document.getElementById('authFooterSignUp');
  
  if (errorBox) errorBox.style.display = 'none';

  if (mode === 'signup') {
    tabSignIn?.classList.remove('active');
    tabSignUp?.classList.add('active');
    if (submitBtn) submitBtn.textContent = 'Create Account & Continue';
    if (authTitle) authTitle.textContent = 'Create your Free Account';
    if (authDesc) authDesc.textContent = 'Sign up to build, save, and download your resumes.';
    document.getElementById('authMode').value = 'signup';
    if (footerSignIn) footerSignIn.style.display = 'block';
    if (footerSignUp) footerSignUp.style.display = 'none';
  } else {
    tabSignUp?.classList.remove('active');
    tabSignIn?.classList.add('active');
    if (submitBtn) submitBtn.textContent = 'Sign In to Account';
    if (authTitle) authTitle.textContent = 'Welcome Back';
    if (authDesc) authDesc.textContent = 'Sign in to access and download your resumes.';
    document.getElementById('authMode').value = 'signin';
    if (footerSignIn) footerSignIn.style.display = 'none';
    if (footerSignUp) footerSignUp.style.display = 'block';
  }
}

function openAuthModal(defaultMode = 'signin') {
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) {
    overlay.classList.add('active');
    const errorBox = document.getElementById('authErrorBox');
    if (errorBox) errorBox.style.display = 'none';
    
    // Clear password field for security
    const pwField = document.getElementById('authPassword');
    if (pwField) {
      pwField.value = '';
      pwField.type = 'password';
    }

    switchAuthTab(defaultMode);

    const emailField = document.getElementById('authEmail');
    if (emailField) {
      setTimeout(() => emailField.focus(), 80);
    }
  }
}

function closeAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('authMode').value;
  const rawEmail = document.getElementById('authEmail').value;
  const email = rawEmail ? rawEmail.trim().toLowerCase() : '';
  const password = document.getElementById('authPassword').value;
  const submitBtn = document.getElementById('btnAuthSubmit');
  const errorBox = document.getElementById('authErrorBox');

  if (errorBox) errorBox.style.display = 'none';

  if (!email || !password) {
    showAuthError('Please enter both your email and password.');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }

  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = mode === 'signup' ? 'Creating Account...' : 'Signing In...';

  try {
    const sb = window.supabaseClient;
    const key = window.SUPABASE_ANON_KEY;
    const hasLiveSupabase = !!(sb && sb.auth && key && key.length > 20);

    if (hasLiveSupabase) {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;

        currentUser = {
          email: data?.user?.email || email,
          id: data?.user?.id || 'sb_' + Date.now(),
          provider: 'supabase'
        };
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        currentUser = {
          email: data?.user?.email || email,
          id: data?.user?.id || 'sb_' + Date.now(),
          provider: 'supabase'
        };
      }
    } else {
      // Local Database Store
      let usersDb = {};
      try {
        usersDb = JSON.parse(localStorage.getItem('resumeforge_users_db') || '{}');
      } catch (err) {
        usersDb = {};
      }

      if (mode === 'signup') {
        if (usersDb[email]) {
          throw new Error('An account with this email already exists! Please click "Sign In".');
        }
        
        usersDb[email] = {
          email: email,
          password: password,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('resumeforge_users_db', JSON.stringify(usersDb));

        currentUser = {
          email: email,
          id: 'user_' + Date.now(),
          provider: 'email'
        };
      } else {
        // SIGN IN
        const userRecord = usersDb[email];

        if (!userRecord) {
          throw new Error('No account found with this email. Please check your spelling or switch to "Create Free Account".');
        }

        if (userRecord.password !== password) {
          throw new Error('Incorrect password! Please check your password and try again.');
        }

        currentUser = {
          email: email,
          id: 'user_' + Date.now(),
          provider: 'email'
        };
      }

      localStorage.setItem('resumeforge_user', JSON.stringify(currentUser));
    }

    // Success! Update UI
    updateAuthUI(currentUser);
    closeAuthModal();
    showToast(mode === 'signup' ? 'Account created successfully! Welcome.' : 'Signed in successfully! Welcome back.', 'success');

    // Auto-save current resume to their new/resumed dashboard
    if (typeof saveCurrentResume === 'function') {
      saveCurrentResume(false);
    }

    // Execute pending action (e.g. download)
    if (pendingDownloadAction) {
      const action = pendingDownloadAction;
      pendingDownloadAction = null;
      setTimeout(() => action(), 200);
    }
  } catch (err) {
    showAuthError(err.message || 'Authentication error. Please check your credentials.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function showAuthError(msg) {
  const errorBox = document.getElementById('authErrorBox');
  if (errorBox) {
    errorBox.className = 'auth-msg-box auth-msg-danger';
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
}

async function handleSignOut() {
  const sb = window.supabaseClient;
  if (sb && sb.auth) {
    try {
      await sb.auth.signOut();
    } catch (e) {}
  }
  localStorage.removeItem('resumeforge_user');
  currentUser = null;
  updateAuthUI(null);
  if (typeof updateDashboardBadge === 'function') updateDashboardBadge();
  if (typeof closeDashboardModal === 'function') closeDashboardModal();
  showToast('Signed out successfully', 'info');
}

/**
 * Download Gate:
 * Enforces email login before download. Automatically starts download after login.
 */
function guardDownload(downloadFn) {
  if (currentUser) {
    // If logged in, auto-save to dashboard and download
    if (typeof saveCurrentResume === 'function') {
      saveCurrentResume(false);
    }
    downloadFn();
  } else {
    pendingDownloadAction = downloadFn;
    openAuthModal('signin');
    showToast('Please sign in or create a free account to download PDF', 'info');
  }
}
