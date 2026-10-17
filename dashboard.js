/**
 * ResumeForge — User Dashboard & Saved Resumes Manager
 * Allows logged-in users to save, view, edit, and download multiple resumes.
 * Automatically syncs full form details and PDF content to Supabase database.
 */

function getDashboardStorageKey() {
  if (!currentUser || !currentUser.email) return null;
  return `resumeforge_resumes_${currentUser.email.toLowerCase()}`;
}

function getUserResumes() {
  const key = getDashboardStorageKey();
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
}

function saveUserResumes(resumes) {
  const key = getDashboardStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(resumes));
  updateDashboardBadge();
}

/**
 * Saves current resume state to user dashboard & syncs to Supabase
 */
function saveCurrentResume(isManual = false) {
  if (!currentUser) return null;

  readFormData();

  const resumes = getUserResumes();
  const name = state.personal.fullName || 'Untitled Resume';
  const role = state.personal.jobTitle || 'General';
  const title = `${name} — ${role}`;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' • ' + now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const resumeEntry = {
    id: 'res_' + Date.now(),
    title: title,
    candidateName: name,
    jobTitle: role,
    template: state.template,
    updatedAt: dateFormatted,
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(state))
  };

  // Prepend to list
  resumes.unshift(resumeEntry);

  // Keep up to 25 saved resumes per user
  if (resumes.length > 25) resumes.pop();

  saveUserResumes(resumes);

  if (isManual) {
    showToast('Resume saved to your Dashboard! 📁', 'success');
  }

  // Sync all form data and PDF layout to Supabase table 'resumes'
  syncResumeToSupabase(resumeEntry);

  return resumeEntry;
}

/**
 * Sends complete structured form data and PDF HTML content to Supabase database table `public.resumes`
 */
async function syncResumeToSupabase(resumeEntry) {
  const p = resumeEntry.data.personal || {};
  const email = (currentUser && currentUser.email) ? currentUser.email : (p.email || 'guest@example.com');
  const paperEl = document.getElementById('resumePaper');

  const payload = {
    user_email: email,
    candidate_name: p.fullName || resumeEntry.candidateName || '',
    job_title: p.jobTitle || resumeEntry.jobTitle || '',
    title: resumeEntry.title,
    phone: p.phone || '',
    location: p.location || '',
    website: p.website || '',
    linkedin: p.linkedin || '',
    github: p.github || '',
    summary: p.summary || '',
    skills: resumeEntry.data.skills || '',
    template: resumeEntry.template || 'modern',
    experience: resumeEntry.data.experience || [],
    education: resumeEntry.data.education || [],
    projects: resumeEntry.data.projects || [],
    certifications: resumeEntry.data.certifications || [],
    raw_form_data: resumeEntry.data,
    pdf_data: paperEl ? paperEl.innerHTML : ''
  };

  const key = window.SUPABASE_ANON_KEY;
  const url = window.SUPABASE_URL || "https://znsgjsihddcnbxchgrot.supabase.co";

  // 1. Try via Supabase JS client if available
  if (window.supabaseClient && key && key.length > 20) {
    try {
      const { error } = await window.supabaseClient.from('resumes').insert(payload);
      if (!error) {
        showToast('Saved to Supabase Cloud! ☁️', 'success');
        return;
      }
    } catch (e) {
      console.warn("Supabase client insert error:", e);
    }
  }

  // 2. Direct REST API fallback
  if (key && key.length > 20) {
    try {
      const resp = await fetch(`${url}/rest/v1/resumes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        showToast('Saved to Supabase Cloud! ☁️', 'success');
      }
    } catch (e) {
      console.warn("Direct REST insert notice:", e);
    }
  }
}

function updateDashboardBadge() {
  const badge = document.getElementById('dashboardCountBadge');
  if (badge && currentUser) {
    const list = getUserResumes();
    badge.textContent = list.length;
    badge.style.display = list.length > 0 ? 'inline-block' : 'none';
  }
}

function openDashboardModal() {
  if (!currentUser) {
    openAuthModal('signin');
    showToast('Please sign in to view your saved resumes', 'info');
    return;
  }

  renderDashboardList();
  renderCloudSyncStatus();
  const overlay = document.getElementById('dashboardModalOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeDashboardModal() {
  const overlay = document.getElementById('dashboardModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function renderCloudSyncStatus() {
  const container = document.getElementById('dashCloudStatus');
  if (!container) return;

  const key = window.SUPABASE_ANON_KEY;
  const isConnected = !!(key && key.length > 20);

  if (isConnected) {
    container.innerHTML = `
      <div class="cloud-status-banner cloud-connected">
        <div class="cloud-status-info">
          <span class="status-indicator-dot online"></span>
          <span>Connected to Supabase Project: <strong>Resume (znsgjsihddcnbxchgrot)</strong></span>
        </div>
        <button type="button" class="btn-cloud-settings" onclick="openKeyModal()">Update Key</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="cloud-status-banner cloud-pending">
        <div class="cloud-status-info">
          <span class="status-indicator-dot pending"></span>
          <span>Supabase Table <strong>resumes</strong> Ready. Connect your anon key for cloud sync.</span>
        </div>
        <button type="button" class="btn-cloud-connect" onclick="openKeyModal()">Connect Supabase</button>
      </div>
    `;
  }
}

function renderDashboardList() {
  const container = document.getElementById('dashboardResumesList');
  if (!container) return;

  const resumes = getUserResumes();

  if (resumes.length === 0) {
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <div class="empty-icon">📁</div>
        <h4>No Saved Resumes Yet</h4>
        <p>Your resume form data and PDF exports will automatically be saved here and synced to Supabase.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="closeDashboardModal()">
          Create Your First Resume
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = resumes.map(r => {
    const isModern = r.template === 'modern';
    const expCount = (r.data.experience || []).length;
    const eduCount = (r.data.education || []).length;

    return `
      <div class="dashboard-card" data-id="${r.id}">
        <div class="dash-card-header">
          <div class="dash-card-info">
            <h4 class="dash-card-title">${escapeHtml(r.title)}</h4>
            <div class="dash-card-meta">
              <span class="dash-card-badge ${isModern ? 'badge-modern' : 'badge-plain'}">
                ${isModern ? 'Modern Blue' : 'Plain Classic (B&W)'}
              </span>
              <span>Saved ${escapeHtml(r.updatedAt)}</span>
            </div>
          </div>
          <button type="button" class="btn-dash-delete" title="Delete Resume" onclick="deleteResume('${r.id}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>

        <div class="dash-card-summary">
          <span>💼 ${expCount} ${expCount === 1 ? 'Job' : 'Jobs'}</span>
          <span>🎓 ${eduCount} ${eduCount === 1 ? 'Degree' : 'Degrees'}</span>
          <span>📧 ${escapeHtml(r.data.personal?.email || '')}</span>
        </div>

        <div class="dash-card-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="loadResume('${r.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View / Edit
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="downloadSavedResume('${r.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function loadResume(id) {
  const resumes = getUserResumes();
  const resume = resumes.find(r => r.id === id);
  if (!resume) return;

  Object.assign(state, JSON.parse(JSON.stringify(resume.data)));

  document.getElementById('fullName').value = state.personal.fullName || '';
  document.getElementById('jobTitle').value = state.personal.jobTitle || '';
  document.getElementById('email').value = state.personal.email || '';
  document.getElementById('phone').value = state.personal.phone || '';
  document.getElementById('location').value = state.personal.location || '';
  document.getElementById('website').value = state.personal.website || '';
  document.getElementById('linkedin').value = state.personal.linkedin || '';
  document.getElementById('github').value = state.personal.github || '';
  document.getElementById('summary').value = state.personal.summary || '';
  document.getElementById('skills').value = state.skills || '';

  document.getElementById('experienceList').innerHTML = '';
  (state.experience || []).forEach(exp => addExperienceItem(exp));

  document.getElementById('educationList').innerHTML = '';
  (state.education || []).forEach(edu => addEducationItem(edu));

  document.getElementById('projectsList').innerHTML = '';
  (state.projects || []).forEach(proj => addProjectItem(proj));

  document.getElementById('certList').innerHTML = '';
  (state.certifications || []).forEach(cert => addCertItem(cert));

  setTemplate(state.template || 'modern');
  renderResume();

  closeDashboardModal();
  showToast(`Loaded "${resume.title}" into editor!`, 'success');
}

function downloadSavedResume(id) {
  loadResume(id);
  setTimeout(() => {
    downloadPDF();
  }, 250);
}

function deleteResume(id) {
  if (confirm('Are you sure you want to delete this resume from your dashboard?')) {
    let resumes = getUserResumes();
    resumes = resumes.filter(r => r.id !== id);
    saveUserResumes(resumes);
    renderDashboardList();
    showToast('Resume removed from dashboard', 'info');
  }
}

function openKeyModal() {
  const overlay = document.getElementById('supabaseKeyOverlay');
  if (overlay) {
    const input = document.getElementById('dashInputAnonKey');
    if (input) input.value = window.SUPABASE_ANON_KEY || '';
    overlay.classList.add('active');
  }
}

function closeKeyModal() {
  const overlay = document.getElementById('supabaseKeyOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Setup dashboard triggers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnOpenDashboard')?.addEventListener('click', openDashboardModal);
  document.getElementById('btnCloseDashboardModal')?.addEventListener('click', closeDashboardModal);
  document.getElementById('dashboardModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'dashboardModalOverlay') closeDashboardModal();
  });

  document.getElementById('btnSaveToDashboard')?.addEventListener('click', () => {
    if (!currentUser) {
      pendingDownloadAction = () => saveCurrentResume(true);
      openAuthModal('signin');
      showToast('Please sign in to save resumes to your dashboard', 'info');
    } else {
      saveCurrentResume(true);
    }
  });

  // Supabase Key Modal handlers
  document.getElementById('btnCloseKeyModal')?.addEventListener('click', closeKeyModal);
  document.getElementById('supabaseKeyOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'supabaseKeyOverlay') closeKeyModal();
  });
  document.getElementById('btnSaveKeyFromModal')?.addEventListener('click', () => {
    const input = document.getElementById('dashInputAnonKey');
    if (input && input.value.trim()) {
      if (typeof setSupabaseAnonKey === 'function') {
        setSupabaseAnonKey(input.value.trim());
      } else {
        window.SUPABASE_ANON_KEY = input.value.trim();
        localStorage.setItem('sb_anon_key', window.SUPABASE_ANON_KEY);
      }
      closeKeyModal();
      renderCloudSyncStatus();
      showToast('Supabase key saved! Cloud sync active.', 'success');

      // Sync currently loaded resume right away!
      const currentResumes = getUserResumes();
      if (currentResumes.length > 0) {
        syncResumeToSupabase(currentResumes[0]);
      }
    }
  });
});
