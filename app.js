/**
 * ResumeForge — App Logic & PDF Generation
 * Space-Optimized & Collapsible UI
 */

// Application State
const state = {
  template: 'modern', // 'plain' or 'modern'
  personal: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: ''
  },
  experience: [],
  education: [],
  skills: '',
  projects: [],
  certifications: []
};

// Sample data for quick testing
const sampleData = {
  template: 'modern',
  personal: {
    fullName: 'Alex Morgan',
    jobTitle: 'Senior Full Stack Engineer',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    website: 'alexmorgan.dev',
    linkedin: 'linkedin.com/in/alexmorgan',
    github: 'github.com/alexm',
    summary: 'Results-driven Senior Software Engineer with 6+ years of expertise in architecting scalable web applications and cloud infrastructure. Proven track record of improving application performance by 40% and leading cross-functional engineering teams to deliver high-impact digital products.'
  },
  experience: [
    {
      id: 1,
      role: 'Lead Full Stack Developer',
      company: 'Apex Cloud Solutions',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      description: '• Architected resilient microservices handling 25M+ daily requests using Node.js and AWS.\n• Spearheaded migration from legacy monolith to React & TypeScript, boosting load speeds by 45%.\n• Mentored 8 junior and mid-level engineers in clean code and CI/CD best practices.'
    },
    {
      id: 2,
      role: 'Software Engineer',
      company: 'Nexis Digital',
      location: 'San Jose, CA',
      startDate: '2019',
      endDate: '2022',
      description: '• Engineered interactive dashboards with Vue.js, TailwindCSS, and GraphQL.\n• Designed and automated comprehensive end-to-end testing pipelines reducing regressions by 30%.\n• Integrated Stripe payment gateways and webhook handling for global subscriptions.'
    }
  ],
  education: [
    {
      id: 1,
      degree: 'B.S. in Computer Science',
      school: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      year: '2019',
      score: 'GPA 3.8 / 4.0'
    }
  ],
  skills: 'JavaScript, TypeScript, React.js, Node.js, Python, PostgreSQL, Docker, AWS, GraphQL, REST APIs, Git, Tailwind CSS, Next.js',
  projects: [
    {
      id: 1,
      name: 'OmniFlow Task Management',
      tech: 'React, Node.js, Socket.io, Redis',
      link: 'github.com/alexm/omniflow',
      description: 'A real-time collaborative workspace with Kanban boards, live presence, and automated webhooks.'
    },
    {
      id: 2,
      name: 'DataPulse Analytics Engine',
      tech: 'Python, FastAPI, TimescaleDB',
      link: 'datapulse.io',
      description: 'High-throughput telemetry ingestion platform processing real-time metrics with sub-second queries.'
    }
  ],
  certifications: [
    {
      id: 1,
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      year: '2023'
    },
    {
      id: 2,
      name: 'Meta Certified Front-End Developer',
      issuer: 'Coursera / Meta',
      year: '2021'
    }
  ]
};

// DOM Elements
const resumePaper = document.getElementById('resumePaper');
const activeTemplateName = document.getElementById('activeTemplateName');

// Global accordion toggle
window.toggleSection = function(headerEl) {
  const section = headerEl.closest('.form-section');
  if (section) {
    section.classList.toggle('collapsed');
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSampleData();
});

function setupEventListeners() {
  // Template Switcher (Pill buttons & legacy cards)
  const templateButtons = document.querySelectorAll('.tpl-pill-btn, .template-card-option');
  templateButtons.forEach(opt => {
    opt.addEventListener('click', () => {
      const selected = opt.getAttribute('data-template');
      setTemplate(selected);
    });
  });

  // Toggle All Sections Button
  const toggleAllBtn = document.getElementById('btnToggleAllSections');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const allSections = document.querySelectorAll('.form-section');
      const hasCollapsed = Array.from(allSections).some(s => s.classList.contains('collapsed'));
      allSections.forEach(s => {
        if (hasCollapsed) {
          s.classList.remove('collapsed');
        } else {
          s.classList.add('collapsed');
        }
      });
    });
  }

  // Add Item Buttons
  document.getElementById('btnAddExp').addEventListener('click', () => addExperienceItem());
  document.getElementById('btnAddEdu').addEventListener('click', () => addEducationItem());
  document.getElementById('btnAddProj').addEventListener('click', () => addProjectItem());
  document.getElementById('btnAddCert').addEventListener('click', () => addCertItem());

  // Action Buttons
  document.getElementById('btnGenerate').addEventListener('click', () => {
    readFormData();
    renderResume();
    showToast('Resume generated!', 'success');
    
    // Auto-save to user dashboard if signed in
    if (typeof saveCurrentResume === 'function' && typeof currentUser !== 'undefined' && currentUser) {
      saveCurrentResume(false);
    }

    if (window.innerWidth < 1100) {
      document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.getElementById('btnDownloadPdf').addEventListener('click', () => {
    if (typeof guardDownload === 'function') {
      guardDownload(downloadPDF);
    } else {
      downloadPDF();
    }
  });
  document.getElementById('btnPrintResume').addEventListener('click', () => {
    if (typeof guardDownload === 'function') {
      guardDownload(() => window.print());
    } else {
      window.print();
    }
  });
  document.getElementById('btnLoadSample').addEventListener('click', loadSampleData);
  document.getElementById('btnClearForm').addEventListener('click', clearForm);

  // Live input sync
  document.getElementById('resumeForm').addEventListener('input', () => {
    readFormData();
    renderResume();
  });
}

function setTemplate(tpl) {
  state.template = tpl;
  
  const templateButtons = document.querySelectorAll('.tpl-pill-btn, .template-card-option');
  templateButtons.forEach(opt => {
    if (opt.getAttribute('data-template') === tpl) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  if (activeTemplateName) {
    activeTemplateName.textContent = tpl === 'plain' ? 'Plain Classic (B&W)' : 'Modern Blue';
  }

  renderResume();
}

function readFormData() {
  state.personal.fullName = document.getElementById('fullName').value.trim();
  state.personal.jobTitle = document.getElementById('jobTitle').value.trim();
  state.personal.email = document.getElementById('email').value.trim();
  state.personal.phone = document.getElementById('phone').value.trim();
  state.personal.location = document.getElementById('location').value.trim();
  state.personal.website = document.getElementById('website').value.trim();
  state.personal.linkedin = document.getElementById('linkedin').value.trim();
  state.personal.github = document.getElementById('github').value.trim();
  state.personal.summary = document.getElementById('summary').value.trim();

  state.skills = document.getElementById('skills').value.trim();

  // Read Experience
  state.experience = [];
  document.querySelectorAll('.exp-item').forEach(el => {
    state.experience.push({
      role: el.querySelector('.exp-role').value.trim(),
      company: el.querySelector('.exp-company').value.trim(),
      location: el.querySelector('.exp-location').value.trim(),
      startDate: el.querySelector('.exp-start').value.trim(),
      endDate: el.querySelector('.exp-end').value.trim(),
      description: el.querySelector('.exp-desc').value.trim()
    });
  });

  // Read Education
  state.education = [];
  document.querySelectorAll('.edu-item').forEach(el => {
    state.education.push({
      degree: el.querySelector('.edu-degree').value.trim(),
      school: el.querySelector('.edu-school').value.trim(),
      location: el.querySelector('.edu-location').value.trim(),
      year: el.querySelector('.edu-year').value.trim(),
      score: el.querySelector('.edu-score').value.trim()
    });
  });

  // Read Projects
  state.projects = [];
  document.querySelectorAll('.proj-item').forEach(el => {
    state.projects.push({
      name: el.querySelector('.proj-name').value.trim(),
      tech: el.querySelector('.proj-tech').value.trim(),
      link: el.querySelector('.proj-link').value.trim(),
      description: el.querySelector('.proj-desc').value.trim()
    });
  });

  // Read Certifications
  state.certifications = [];
  document.querySelectorAll('.cert-item').forEach(el => {
    state.certifications.push({
      name: el.querySelector('.cert-name').value.trim(),
      issuer: el.querySelector('.cert-issuer').value.trim(),
      year: el.querySelector('.cert-year').value.trim()
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// Resume Rendering Functions
// -------------------------------------------------------------
function renderResume() {
  if (state.template === 'plain') {
    renderPlainTemplate();
  } else {
    renderModernTemplate();
  }
}

// TEMPLATE 1: PLAIN (ATS Classic Black & White)
function renderPlainTemplate() {
  const p = state.personal;
  const name = escapeHtml(p.fullName) || 'YOUR NAME';
  const title = escapeHtml(p.jobTitle) || 'Professional Title';

  const contacts = [];
  if (p.email) contacts.push(`<span>✉ ${escapeHtml(p.email)}</span>`);
  if (p.phone) contacts.push(`<span>☎ ${escapeHtml(p.phone)}</span>`);
  if (p.location) contacts.push(`<span>📍 ${escapeHtml(p.location)}</span>`);
  if (p.website) contacts.push(`<span>🌐 ${escapeHtml(p.website)}</span>`);
  if (p.linkedin) contacts.push(`<span>🔗 ${escapeHtml(p.linkedin)}</span>`);
  if (p.github) contacts.push(`<span>💻 ${escapeHtml(p.github)}</span>`);

  let expHtml = '';
  if (state.experience.length > 0) {
    const items = state.experience.map(item => {
      const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
      return `
        <div class="plain-item">
          <div class="plain-item-head">
            <span class="plain-role">${escapeHtml(item.role || 'Role Title')}</span>
            <span class="plain-dates">${escapeHtml(dates)}</span>
          </div>
          <div class="plain-item-head">
            <span class="plain-company">${escapeHtml(item.company)}${item.location ? ` — ${escapeHtml(item.location)}` : ''}</span>
          </div>
          ${item.description ? `<div class="plain-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      `;
    }).join('');

    expHtml = `
      <div class="plain-section">
        <div class="plain-sec-title">Work Experience</div>
        ${items}
      </div>
    `;
  }

  let eduHtml = '';
  if (state.education.length > 0) {
    const items = state.education.map(item => {
      return `
        <div class="plain-item">
          <div class="plain-item-head">
            <span class="plain-role">${escapeHtml(item.degree || 'Degree')}</span>
            <span class="plain-dates">${escapeHtml(item.year)}</span>
          </div>
          <div class="plain-item-head">
            <span class="plain-company">${escapeHtml(item.school)}${item.location ? ` — ${escapeHtml(item.location)}` : ''}</span>
            ${item.score ? `<span class="plain-dates">${escapeHtml(item.score)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    eduHtml = `
      <div class="plain-section">
        <div class="plain-sec-title">Education</div>
        ${items}
      </div>
    `;
  }

  let skillsHtml = '';
  if (state.skills) {
    const skillList = state.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      skillsHtml = `
        <div class="plain-section">
          <div class="plain-sec-title">Skills &amp; Competencies</div>
          <div class="plain-skills-list">
            ${skillList.map(s => `<span class="plain-skill-pill">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }

  let projHtml = '';
  if (state.projects.length > 0) {
    const items = state.projects.map(item => {
      return `
        <div class="plain-item">
          <div class="plain-item-head">
            <span class="plain-role">${escapeHtml(item.name || 'Project Name')}</span>
            ${item.link ? `<span class="plain-dates">${escapeHtml(item.link)}</span>` : ''}
          </div>
          ${item.tech ? `<div class="plain-company">Technologies: ${escapeHtml(item.tech)}</div>` : ''}
          ${item.description ? `<div class="plain-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      `;
    }).join('');

    projHtml = `
      <div class="plain-section">
        <div class="plain-sec-title">Key Projects</div>
        ${items}
      </div>
    `;
  }

  let certHtml = '';
  if (state.certifications.length > 0) {
    const items = state.certifications.map(item => {
      return `
        <div class="plain-item">
          <div class="plain-item-head">
            <span class="plain-role">${escapeHtml(item.name)}</span>
            <span class="plain-dates">${escapeHtml(item.year)}</span>
          </div>
          ${item.issuer ? `<div class="plain-company">${escapeHtml(item.issuer)}</div>` : ''}
        </div>
      `;
    }).join('');

    certHtml = `
      <div class="plain-section">
        <div class="plain-sec-title">Certifications &amp; Honors</div>
        ${items}
      </div>
    `;
  }

  resumePaper.className = 'resume-paper tpl-plain';
  resumePaper.innerHTML = `
    <div class="plain-header">
      <h1 class="plain-name">${name}</h1>
      <div class="plain-title">${title}</div>
      <div class="plain-contacts">
        ${contacts.join('')}
      </div>
    </div>

    ${p.summary ? `
      <div class="plain-section">
        <div class="plain-sec-title">Executive Summary</div>
        <div class="plain-summary">${escapeHtml(p.summary)}</div>
      </div>
    ` : ''}

    ${expHtml}
    ${projHtml}
    ${eduHtml}
    ${skillsHtml}
    ${certHtml}
  `;
}

// TEMPLATE 2: MODERN BLUE (Vibrant & Stylish)
function renderModernTemplate() {
  const p = state.personal;
  const name = escapeHtml(p.fullName) || 'YOUR NAME';
  const title = escapeHtml(p.jobTitle) || 'Professional Title';

  const contacts = [];
  if (p.email) contacts.push(`<span>✉ ${escapeHtml(p.email)}</span>`);
  if (p.phone) contacts.push(`<span>☎ ${escapeHtml(p.phone)}</span>`);
  if (p.location) contacts.push(`<span>📍 ${escapeHtml(p.location)}</span>`);
  if (p.website) contacts.push(`<span>🌐 ${escapeHtml(p.website)}</span>`);
  if (p.linkedin) contacts.push(`<span>🔗 ${escapeHtml(p.linkedin)}</span>`);
  if (p.github) contacts.push(`<span>💻 ${escapeHtml(p.github)}</span>`);

  let expHtml = '';
  if (state.experience.length > 0) {
    const items = state.experience.map(item => {
      const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
      return `
        <div class="modern-timeline-item">
          <div class="modern-item-role">${escapeHtml(item.role || 'Role Title')}</div>
          <div class="modern-item-sub">
            <span>${escapeHtml(item.company)}${item.location ? ` | ${escapeHtml(item.location)}` : ''}</span>
            <span class="modern-item-dates">${escapeHtml(dates)}</span>
          </div>
          ${item.description ? `<div class="modern-item-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      `;
    }).join('');

    expHtml = `
      <div class="modern-section">
        <div class="modern-sec-title">Experience</div>
        ${items}
      </div>
    `;
  }

  let projHtml = '';
  if (state.projects.length > 0) {
    const items = state.projects.map(item => {
      return `
        <div class="modern-timeline-item">
          <div class="modern-item-role">${escapeHtml(item.name || 'Project Name')}</div>
          <div class="modern-item-sub">
            <span>${escapeHtml(item.tech || '')}</span>
            ${item.link ? `<span class="modern-item-dates">${escapeHtml(item.link)}</span>` : ''}
          </div>
          ${item.description ? `<div class="modern-item-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      `;
    }).join('');

    projHtml = `
      <div class="modern-section">
        <div class="modern-sec-title">Featured Projects</div>
        ${items}
      </div>
    `;
  }

  let skillsHtml = '';
  if (state.skills) {
    const skillList = state.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillList.length > 0) {
      skillsHtml = `
        <div class="modern-section">
          <div class="modern-sec-title">Skills &amp; Tools</div>
          <div class="modern-skill-badges">
            ${skillList.map(s => `<span class="modern-badge">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }

  let eduHtml = '';
  if (state.education.length > 0) {
    const items = state.education.map(item => {
      return `
        <div class="modern-edu-item">
          <div class="modern-edu-degree">${escapeHtml(item.degree || 'Degree')}</div>
          <div class="modern-edu-school">${escapeHtml(item.school)}</div>
          <div class="modern-edu-year">${escapeHtml(item.year)}${item.score ? ` • ${escapeHtml(item.score)}` : ''}</div>
        </div>
      `;
    }).join('');

    eduHtml = `
      <div class="modern-section">
        <div class="modern-sec-title">Education</div>
        ${items}
      </div>
    `;
  }

  let certHtml = '';
  if (state.certifications.length > 0) {
    const items = state.certifications.map(item => {
      return `
        <div class="modern-edu-item">
          <div class="modern-edu-degree">${escapeHtml(item.name)}</div>
          <div class="modern-edu-school">${escapeHtml(item.issuer || '')}</div>
          <div class="modern-edu-year">${escapeHtml(item.year || '')}</div>
        </div>
      `;
    }).join('');

    certHtml = `
      <div class="modern-section">
        <div class="modern-sec-title">Certificates</div>
        ${items}
      </div>
    `;
  }

  resumePaper.className = 'resume-paper tpl-modern';
  resumePaper.innerHTML = `
    <header class="modern-header">
      <h1 class="modern-name">${name}</h1>
      <div class="modern-title">${title}</div>
      <div class="modern-contacts">
        ${contacts.join('')}
      </div>
    </header>

    <div class="modern-body">
      <div class="modern-main">
        ${p.summary ? `
          <div class="modern-section">
            <div class="modern-sec-title">About Me</div>
            <div class="modern-summary">${escapeHtml(p.summary)}</div>
          </div>
        ` : ''}

        ${expHtml}
        ${projHtml}
      </div>

      <aside class="modern-sidebar">
        ${skillsHtml}
        ${eduHtml}
        ${certHtml}
      </aside>
    </div>
  `;
}

// -------------------------------------------------------------
// Dynamic Field Item Helpers (Compact)
// -------------------------------------------------------------
function addExperienceItem(data = {}) {
  const container = document.getElementById('experienceList');
  const count = container.querySelectorAll('.exp-item').length + 1;
  const div = document.createElement('div');
  div.className = 'dynamic-item exp-item';
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="item-counter">#${count}</span>
      <button type="button" class="btn-remove-item">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" class="input-control exp-role" placeholder="e.g. Lead Developer" value="${escapeHtml(data.role || '')}"/>
      </div>
      <div class="form-group">
        <label>Company</label>
        <input type="text" class="input-control exp-company" placeholder="e.g. Apex Cloud" value="${escapeHtml(data.company || '')}"/>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" class="input-control exp-location" placeholder="e.g. San Francisco, CA" value="${escapeHtml(data.location || '')}"/>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Start</label>
          <input type="text" class="input-control exp-start" placeholder="e.g. 2022" value="${escapeHtml(data.startDate || '')}"/>
        </div>
        <div class="form-group">
          <label>End</label>
          <input type="text" class="input-control exp-end" placeholder="e.g. Present" value="${escapeHtml(data.endDate || '')}"/>
        </div>
      </div>
      <div class="form-group col-span-full">
        <label>Key Responsibilities (one bullet per line)</label>
        <textarea class="textarea-control exp-desc" rows="2" placeholder="• Led team of 5 engineers...\n• Increased conversion by 20%">${escapeHtml(data.description || '')}</textarea>
      </div>
    </div>
  `;

  div.querySelector('.btn-remove-item').addEventListener('click', () => {
    div.remove();
    renumberCounters('experienceList');
    readFormData();
    renderResume();
  });

  container.appendChild(div);
}

function addEducationItem(data = {}) {
  const container = document.getElementById('educationList');
  const count = container.querySelectorAll('.edu-item').length + 1;
  const div = document.createElement('div');
  div.className = 'dynamic-item edu-item';
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="item-counter">#${count}</span>
      <button type="button" class="btn-remove-item">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Degree</label>
        <input type="text" class="input-control edu-degree" placeholder="e.g. B.S. Computer Science" value="${escapeHtml(data.degree || '')}"/>
      </div>
      <div class="form-group">
        <label>School / University</label>
        <input type="text" class="input-control edu-school" placeholder="e.g. UC Berkeley" value="${escapeHtml(data.school || '')}"/>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" class="input-control edu-location" placeholder="e.g. Berkeley, CA" value="${escapeHtml(data.location || '')}"/>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Grad Year</label>
          <input type="text" class="input-control edu-year" placeholder="e.g. 2019" value="${escapeHtml(data.year || '')}"/>
        </div>
        <div class="form-group">
          <label>GPA / Honors</label>
          <input type="text" class="input-control edu-score" placeholder="e.g. 3.8 GPA" value="${escapeHtml(data.score || '')}"/>
        </div>
      </div>
    </div>
  `;

  div.querySelector('.btn-remove-item').addEventListener('click', () => {
    div.remove();
    renumberCounters('educationList');
    readFormData();
    renderResume();
  });

  container.appendChild(div);
}

function addProjectItem(data = {}) {
  const container = document.getElementById('projectsList');
  const count = container.querySelectorAll('.proj-item').length + 1;
  const div = document.createElement('div');
  div.className = 'dynamic-item proj-item';
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="item-counter">#${count}</span>
      <button type="button" class="btn-remove-item">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" class="input-control proj-name" placeholder="e.g. OmniFlow" value="${escapeHtml(data.name || '')}"/>
      </div>
      <div class="form-group">
        <label>Technologies</label>
        <input type="text" class="input-control proj-tech" placeholder="e.g. React, Node.js" value="${escapeHtml(data.tech || '')}"/>
      </div>
      <div class="form-group col-span-full">
        <label>Link / Demo</label>
        <input type="text" class="input-control proj-link" placeholder="e.g. github.com/user/project" value="${escapeHtml(data.link || '')}"/>
      </div>
      <div class="form-group col-span-full">
        <label>Description</label>
        <textarea class="textarea-control proj-desc" rows="2" placeholder="Brief description of impact">${escapeHtml(data.description || '')}</textarea>
      </div>
    </div>
  `;

  div.querySelector('.btn-remove-item').addEventListener('click', () => {
    div.remove();
    renumberCounters('projectsList');
    readFormData();
    renderResume();
  });

  container.appendChild(div);
}

function addCertItem(data = {}) {
  const container = document.getElementById('certList');
  const count = container.querySelectorAll('.cert-item').length + 1;
  const div = document.createElement('div');
  div.className = 'dynamic-item cert-item';
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="item-counter">#${count}</span>
      <button type="button" class="btn-remove-item">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Certificate Name</label>
        <input type="text" class="input-control cert-name" placeholder="e.g. AWS Solutions Architect" value="${escapeHtml(data.name || '')}"/>
      </div>
      <div class="form-group">
        <label>Issuer</label>
        <input type="text" class="input-control cert-issuer" placeholder="e.g. AWS" value="${escapeHtml(data.issuer || '')}"/>
      </div>
      <div class="form-group col-span-full">
        <label>Year</label>
        <input type="text" class="input-control cert-year" placeholder="e.g. 2023" value="${escapeHtml(data.year || '')}"/>
      </div>
    </div>
  `;

  div.querySelector('.btn-remove-item').addEventListener('click', () => {
    div.remove();
    renumberCounters('certList');
    readFormData();
    renderResume();
  });

  container.appendChild(div);
}

function renumberCounters(containerId) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.item-counter').forEach((badge, idx) => {
    badge.textContent = `#${idx + 1}`;
  });
}

// -------------------------------------------------------------
// Sample Data & Clear Form
// -------------------------------------------------------------
function loadSampleData() {
  document.getElementById('fullName').value = sampleData.personal.fullName;
  document.getElementById('jobTitle').value = sampleData.personal.jobTitle;
  document.getElementById('email').value = sampleData.personal.email;
  document.getElementById('phone').value = sampleData.personal.phone;
  document.getElementById('location').value = sampleData.personal.location;
  document.getElementById('website').value = sampleData.personal.website;
  document.getElementById('linkedin').value = sampleData.personal.linkedin;
  document.getElementById('github').value = sampleData.personal.github;
  document.getElementById('summary').value = sampleData.personal.summary;
  document.getElementById('skills').value = sampleData.skills;

  // Clear and rebuild lists
  document.getElementById('experienceList').innerHTML = '';
  sampleData.experience.forEach(exp => addExperienceItem(exp));

  document.getElementById('educationList').innerHTML = '';
  sampleData.education.forEach(edu => addEducationItem(edu));

  document.getElementById('projectsList').innerHTML = '';
  sampleData.projects.forEach(proj => addProjectItem(proj));

  document.getElementById('certList').innerHTML = '';
  sampleData.certifications.forEach(cert => addCertItem(cert));

  setTemplate(sampleData.template);
  readFormData();
  renderResume();
  showToast('Sample data loaded', 'info');
}

function clearForm() {
  if (confirm('Are you sure you want to clear all form fields?')) {
    document.getElementById('resumeForm').reset();
    document.getElementById('experienceList').innerHTML = '';
    document.getElementById('educationList').innerHTML = '';
    document.getElementById('projectsList').innerHTML = '';
    document.getElementById('certList').innerHTML = '';
    
    readFormData();
    renderResume();
    showToast('Form cleared', 'info');
  }
}

// -------------------------------------------------------------
// PDF Download with html2pdf & Print Fallback
// -------------------------------------------------------------
function downloadPDF() {
  const downloadBtn = document.getElementById('btnDownloadPdf');
  const originalText = downloadBtn.innerHTML;
  downloadBtn.innerHTML = `
    <svg style="animation: spin 1s linear infinite; width: 15px; height: 15px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    Exporting PDF...
  `;
  downloadBtn.disabled = true;

  const candidateName = (state.personal.fullName || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${candidateName}_Resume.pdf`;

  const element = document.getElementById('resumePaper');

  // Temporarily reset zoom & transform so html2canvas captures at pristine full scale
  const prevZoom = element.style.zoom;
  const prevTransform = element.style.transform;
  element.style.zoom = '1';
  element.style.transform = 'none';

  const resetStyles = () => {
    element.style.zoom = prevZoom;
    element.style.transform = prevTransform;
    downloadBtn.innerHTML = originalText;
    downloadBtn.disabled = false;
  };

  const opt = {
    margin: [0, 0, 0, 0],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  if (window.html2pdf) {
    try {
      window.html2pdf().set(opt).from(element).save()
        .then(() => {
          resetStyles();
          showToast('PDF downloaded successfully!', 'success');
        })
        .catch(err => {
          console.error('html2pdf generation error:', err);
          resetStyles();
          showToast('Generating PDF via browser print dialogue...', 'info');
          window.print();
        });
    } catch (err) {
      console.error('html2pdf invocation error:', err);
      resetStyles();
      showToast('Opening print dialogue...', 'info');
      window.print();
    }
  } else {
    resetStyles();
    showToast('Opening print dialogue...', 'info');
    window.print();
  }
}

// Toast helper
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : 'ℹ'}</span>
    <span>${escapeHtml(msg)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
