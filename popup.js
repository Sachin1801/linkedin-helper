// LinkedIn Connection Helper — Popup Script v7.0

class PopupManager {
  constructor() {
    this.storageKey = 'liHelper';
    this.currentConfig = null;
    this.currentMessageType = 'newConnection';

    // Quick action metadata
    this.quickActions = [
      { id: 'newConnection', label: 'New Connection', icon: '🔗', maxChars: 300 },
      { id: 'recruiter', label: 'Recruiter', icon: '🎯', maxChars: 300 },
      { id: 'firstReferral', label: 'First Referral', icon: '💬', maxChars: 500 },
      { id: 'followUpReferral', label: 'Follow-up', icon: '🔄', maxChars: 500 }
    ];

    this.usageHints = {
      newConnection: '🔗 Use when clicking Connect → Add a note (≤300 chars)',
      recruiter: '🎯 Connect with recruiters for opportunities (≤300 chars)',
      firstReferral: '💬 Message existing connection for first referral request (≤500 chars)',
      followUpReferral: '🔄 Follow up with someone you\'ve already asked (≤500 chars)'
    };

    this.init();
  }

  async init() {
    try {
      await this.loadConfiguration();
      this.setupEventListeners();
      this.initializeUI();
      this.updateConnectionStatus(true);
    } catch (error) {
      console.error('Initialization error:', error);
      this.updateConnectionStatus(false);
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Personal info form
    document.getElementById('personal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePersonalInfo();
    });

    // Test variables button
    document.getElementById('test-variables')?.addEventListener('click', () => this.testVariables());

    // Message type radio buttons
    document.querySelectorAll('input[name="messageType"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.handleMessageTypeChange(e.target.value));
    });

    // Template content save
    document.getElementById('save-template-content')?.addEventListener('click', () => this.saveTemplateContent());

    // Reset to default template
    document.getElementById('reset-to-default-template')?.addEventListener('click', () => this.resetToDefaultTemplate());

    // Quick fill variable inputs — live preview update
    ['companyName', 'positionTitle', 'opportunityType', 'timeline', 'jobLinks', 'recipientName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updatePreview());
      }
    });

    // Save template settings
    document.getElementById('save-template-settings')?.addEventListener('click', () => this.saveTemplateSettings());

    // Copy message
    document.getElementById('copy-message')?.addEventListener('click', () => this.copyMessageToClipboard());

    // Reset fields
    document.getElementById('reset-template')?.addEventListener('click', () => this.resetTemplateFields());

    // Variable tag insertion
    document.querySelectorAll('.variable-tag').forEach(tag => {
      tag.addEventListener('click', () => this.insertVariableIntoEditor(tag.dataset.var));
    });

    // Template editor live preview
    document.getElementById('template-editor')?.addEventListener('input', () => this.updatePreview());

    // Settings listeners
    this.setupSettingsListeners();
  }

  setupSettingsListeners() {
    document.getElementById('extension-enabled')?.addEventListener('change', (e) => {
      this.currentConfig.preferences.extensionEnabled = e.target.checked;
      this.saveConfiguration();
    });

    document.getElementById('notifications-enabled')?.addEventListener('change', (e) => {
      this.currentConfig.preferences.notificationsEnabled = e.target.checked;
      this.saveConfiguration();
    });

    document.getElementById('debug-mode')?.addEventListener('change', (e) => {
      this.currentConfig.preferences.debugMode = e.target.checked;
      this.saveConfiguration();
    });

    document.getElementById('show-detected-info')?.addEventListener('change', (e) => {
      this.currentConfig.preferences.showDetectedInfo = e.target.checked;
      this.saveConfiguration();
    });

    document.getElementById('export-settings')?.addEventListener('click', () => this.exportSettings());
    document.getElementById('import-settings')?.addEventListener('click', () => this.importSettings());
    document.getElementById('reset-settings')?.addEventListener('click', () => this.resetSettings());
  }

  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      this.currentConfig = result[this.storageKey] || this.getDefaultConfig();
      this.migrateSchemaIfNeeded();
    } catch (error) {
      this.currentConfig = this.getDefaultConfig();
    }
  }

  getDefaultQuickActionTemplates() {
    return {
      newConnection: `Hi {recipientName}, I'm Sachin, pursuing MS in CS at NYU. I'm interested in the {positionTitle} role at {companyName} and would love to connect and learn about your experience there. Thanks!`,
      recruiter: `Hi {recipientName}, I'm Sachin, an MS in CS student at NYU seeking full-time opportunities starting May 2026. I'd love to connect and explore roles at {companyName}. Thanks!`,
      firstReferral: `Hi {recipientName}, hope you're doing well! I'm reaching out because I'm very interested in the {positionTitle} role at {companyName}. I'm currently pursuing MS in CS at NYU and looking for full-time opportunities starting May 2026. Would you be open to referring me? Here's my resume: {resumeUrl}. Thanks so much for your time!`,
      followUpReferral: `Hi {recipientName}, hope you're doing well! I wanted to follow up — I'm still actively looking for full-time roles starting May 2026. I noticed the {positionTitle} position at {companyName} and think it's a great fit. Would you be open to referring me again? Job link: {jobLinks}. Thanks a lot!`
    };
  }

  getDefaultConfig() {
    return {
      personalInfo: {
        firstName: 'Sachin',
        lastName: 'Adlakha',
        email: '',
        phone: '',
        university: 'NYU',
        degree: 'MS in Computer Science',
        resumeUrl: ''
      },
      templateSettings: {
        messageType: 'newConnection',
        companyName: '',
        positionTitle: 'Software Engineer',
        opportunityType: 'full-time opportunities',
        timeline: 'starting May 2026',
        jobLinks: '',
        recipientName: '',
        autoDetectProfile: true,
        previewBeforeSend: true
      },
      quickActionTemplates: this.getDefaultQuickActionTemplates(),
      preferences: {
        extensionEnabled: true,
        debugMode: false,
        notificationsEnabled: true,
        showDetectedInfo: true
      },
      schemaVersion: 3
    };
  }

  migrateSchemaIfNeeded() {
    if (this.currentConfig.schemaVersion === 3) return;

    console.log('[Popup] Migrating to v3 schema...');
    const defaults = this.getDefaultConfig();

    // Preserve personal info
    if (this.currentConfig.personalInfo) {
      defaults.personalInfo = { ...defaults.personalInfo, ...this.currentConfig.personalInfo };
    }

    // Preserve template settings
    if (this.currentConfig.templateSettings) {
      const old = this.currentConfig.templateSettings;
      defaults.templateSettings.companyName = old.companyName || '';
      defaults.templateSettings.positionTitle = old.positionTitle || defaults.templateSettings.positionTitle;
      defaults.templateSettings.jobLinks = old.jobLinks || '';
      defaults.templateSettings.recipientName = old.recipientName || '';
      defaults.templateSettings.autoDetectProfile = old.autoDetectProfile !== false;
      defaults.templateSettings.previewBeforeSend = old.previewBeforeSend !== false;
    }

    if (this.currentConfig.preferences) {
      defaults.preferences = { ...defaults.preferences, ...this.currentConfig.preferences };
    }

    this.currentConfig = defaults;
    this.saveConfiguration();
  }

  async saveConfiguration() {
    try {
      await chrome.storage.sync.set({ [this.storageKey]: this.currentConfig });
      this.notifyContentScriptReload();
    } catch (error) {
      console.error('Save error:', error);
    }
  }

  notifyContentScriptReload() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'reloadConfig',
            config: this.currentConfig
          }).catch(() => {});
        }
      });
    } catch (error) { /* silent */ }
  }

  initializeUI() {
    this.loadPersonalInfoForm();
    this.loadTemplateSettings();
    this.loadPreferences();
    this.updateStorageInfo();
    this.loadTemplateIntoEditor(this.currentMessageType);
    this.updatePreview();
  }

  loadPersonalInfoForm() {
    const pi = this.currentConfig.personalInfo;
    document.getElementById('firstName').value = pi.firstName || '';
    document.getElementById('lastName').value = pi.lastName || '';
    document.getElementById('email').value = pi.email || '';
    document.getElementById('phone').value = pi.phone || '';
    document.getElementById('university').value = pi.university || '';
    document.getElementById('degree').value = pi.degree || '';
    document.getElementById('resumeUrl').value = pi.resumeUrl || '';
  }

  loadTemplateSettings() {
    const ts = this.currentConfig.templateSettings;

    // Set active radio button
    const messageType = ts.messageType || 'newConnection';
    const radio = document.querySelector(`input[name="messageType"][value="${messageType}"]`);
    if (radio) radio.checked = true;
    this.currentMessageType = messageType;

    // Fill quick-fill fields
    document.getElementById('companyName').value = ts.companyName || '';
    document.getElementById('positionTitle').value = ts.positionTitle || '';
    document.getElementById('opportunityType').value = ts.opportunityType || 'full-time opportunities';
    document.getElementById('timeline').value = ts.timeline || 'starting May 2026';
    document.getElementById('jobLinks').value = ts.jobLinks || '';
    document.getElementById('recipientName').value = ts.recipientName || '';

    // Checkboxes
    document.getElementById('auto-detect-profile').checked = ts.autoDetectProfile !== false;
    document.getElementById('preview-before-send').checked = ts.previewBeforeSend !== false;

    this.updateUsageHint(messageType);
    this.updateCurrentTemplateLabel();
  }

  loadTemplateIntoEditor(messageType) {
    const templates = this.currentConfig.quickActionTemplates || this.getDefaultQuickActionTemplates();
    const template = templates[messageType] || '';
    document.getElementById('template-editor').value = template;
    this.updateCurrentTemplateLabel();
    this.checkCharLimit();
  }

  loadPreferences() {
    const prefs = this.currentConfig.preferences;
    document.getElementById('extension-enabled').checked = prefs.extensionEnabled !== false;
    document.getElementById('notifications-enabled').checked = prefs.notificationsEnabled !== false;
    document.getElementById('debug-mode').checked = prefs.debugMode === true;
    document.getElementById('show-detected-info').checked = prefs.showDetectedInfo !== false;
  }

  // ─── Tab switching ─────────────────────────────────────────────
  switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}-tab`);
    });
  }

  // ─── Personal Info ─────────────────────────────────────────────
  savePersonalInfo() {
    const personalInfo = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      university: document.getElementById('university').value.trim(),
      degree: document.getElementById('degree').value.trim(),
      resumeUrl: document.getElementById('resumeUrl').value.trim()
    };

    this.currentConfig.personalInfo = personalInfo;
    this.saveConfiguration();
    this.updatePreview();
    this.showNotification('✓ Personal info saved!', 'success');
  }

  testVariables() {
    const pi = this.currentConfig.personalInfo;
    const values = [
      `First Name: ${pi.firstName || '(empty)'}`,
      `Last Name: ${pi.lastName || '(empty)'}`,
      `Email: ${pi.email || '(empty)'}`,
      `Phone: ${pi.phone || '(empty)'}`,
      `University: ${pi.university || '(empty)'}`,
      `Degree: ${pi.degree || '(empty)'}`,
      `Resume: ${pi.resumeUrl || '(empty)'}`
    ];
    alert('Current Variables:\n\n' + values.join('\n'));
  }

  // ─── Message Type Handling ─────────────────────────────────────
  handleMessageTypeChange(messageType) {
    this.currentMessageType = messageType;

    // Save the template from the old type before switching
    this.loadTemplateIntoEditor(messageType);
    this.updateUsageHint(messageType);
    this.updatePreview();
  }

  updateUsageHint(messageType) {
    const hint = document.getElementById('template-usage-hint');
    if (hint) {
      hint.textContent = this.usageHints[messageType] || '';
    }
  }

  updateCurrentTemplateLabel() {
    const label = document.getElementById('current-template-label');
    if (!label) return;

    const action = this.quickActions.find(a => a.id === this.currentMessageType);
    label.textContent = action
      ? `Editing: ${action.icon} ${action.label}`
      : 'Editing template';
  }

  checkCharLimit() {
    const editor = document.getElementById('template-editor');
    const warning = document.getElementById('char-limit-warning');
    if (!editor || !warning) return;

    const action = this.quickActions.find(a => a.id === this.currentMessageType);
    const maxChars = action?.maxChars || 500;

    // Check approximate length (template with vars will be larger than raw)
    if (editor.value.length > maxChars + 100) {
      warning.style.display = 'block';
      warning.textContent = `⚠️ Template is ${editor.value.length} chars — may exceed ${maxChars} char limit after variable substitution`;
    } else {
      warning.style.display = 'none';
    }
  }

  // ─── Template Editor ───────────────────────────────────────────
  saveTemplateContent() {
    const editor = document.getElementById('template-editor');
    if (!editor) return;

    if (!this.currentConfig.quickActionTemplates) {
      this.currentConfig.quickActionTemplates = this.getDefaultQuickActionTemplates();
    }

    this.currentConfig.quickActionTemplates[this.currentMessageType] = editor.value;
    this.saveConfiguration();
    this.updatePreview();
    this.showNotification('✓ Template saved!', 'success');
  }

  resetToDefaultTemplate() {
    const defaults = this.getDefaultQuickActionTemplates();
    const template = defaults[this.currentMessageType] || '';

    document.getElementById('template-editor').value = template;

    if (!this.currentConfig.quickActionTemplates) {
      this.currentConfig.quickActionTemplates = defaults;
    }
    this.currentConfig.quickActionTemplates[this.currentMessageType] = template;
    this.saveConfiguration();
    this.updatePreview();
    this.showNotification('✓ Template reset to default', 'info');
  }

  insertVariableIntoEditor(variable) {
    const editor = document.getElementById('template-editor');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;

    editor.value = text.substring(0, start) + variable + text.substring(end);
    editor.selectionStart = editor.selectionEnd = start + variable.length;
    editor.focus();

    this.updatePreview();
  }

  // ─── Preview ───────────────────────────────────────────────────
  updatePreview() {
    const editor = document.getElementById('template-editor');
    const previewEl = document.getElementById('template-preview-text');
    const charCounter = document.getElementById('char-counter');
    if (!editor || !previewEl) return;

    const template = editor.value;
    const pi = this.currentConfig.personalInfo;
    const ts = this.currentConfig.templateSettings;

    // Read current values from inputs
    const companyName = document.getElementById('companyName')?.value || ts.companyName || '[Company]';
    const positionTitle = document.getElementById('positionTitle')?.value || ts.positionTitle || '[Position]';
    const opportunityType = document.getElementById('opportunityType')?.value || ts.opportunityType || 'full-time opportunities';
    const timeline = document.getElementById('timeline')?.value || ts.timeline || 'starting May 2026';
    const jobLinks = document.getElementById('jobLinks')?.value || ts.jobLinks || '[Job Links]';
    const recipientName = document.getElementById('recipientName')?.value || ts.recipientName || '[Name]';

    const variables = {
      '{recipientName}': recipientName,
      '{firstName}': pi.firstName || 'Sachin',
      '{lastName}': pi.lastName || 'Adlakha',
      '{fullName}': `${pi.firstName || 'Sachin'} ${pi.lastName || 'Adlakha'}`.trim(),
      '{email}': pi.email || '[Email]',
      '{phone}': pi.phone || '[Phone]',
      '{university}': pi.university || 'NYU',
      '{degree}': pi.degree || 'MS in Computer Science',
      '{resumeUrl}': pi.resumeUrl || '[Resume URL]',
      '{companyName}': companyName,
      '{positionTitle}': positionTitle,
      '{opportunityType}': opportunityType,
      '{timeline}': timeline,
      '{jobLinks}': jobLinks
    };

    let preview = template;
    for (const [key, value] of Object.entries(variables)) {
      preview = preview.split(key).join(value);
    }

    previewEl.textContent = preview || 'Fill in the fields above to see the message preview...';

    if (charCounter) {
      const action = this.quickActions.find(a => a.id === this.currentMessageType);
      const maxChars = action?.maxChars || 500;
      const len = preview.length;
      charCounter.textContent = `${len}/${maxChars} chars`;
      charCounter.style.color = len > maxChars ? '#e74c3c' : '#666';
    }

    this.checkCharLimit();
  }

  // ─── Save Template Settings ────────────────────────────────────
  saveTemplateSettings() {
    this.currentConfig.templateSettings = {
      messageType: this.currentMessageType,
      companyName: document.getElementById('companyName')?.value?.trim() || '',
      positionTitle: document.getElementById('positionTitle')?.value?.trim() || 'Software Engineer',
      opportunityType: document.getElementById('opportunityType')?.value?.trim() || 'full-time opportunities',
      timeline: document.getElementById('timeline')?.value?.trim() || 'starting May 2026',
      jobLinks: document.getElementById('jobLinks')?.value?.trim() || '',
      recipientName: document.getElementById('recipientName')?.value?.trim() || '',
      autoDetectProfile: document.getElementById('auto-detect-profile')?.checked !== false,
      previewBeforeSend: document.getElementById('preview-before-send')?.checked !== false
    };

    // Also save the current template content
    const editor = document.getElementById('template-editor');
    if (editor) {
      if (!this.currentConfig.quickActionTemplates) {
        this.currentConfig.quickActionTemplates = this.getDefaultQuickActionTemplates();
      }
      this.currentConfig.quickActionTemplates[this.currentMessageType] = editor.value;
    }

    this.saveConfiguration();
    this.showNotification('✓ All settings saved!', 'success');
  }

  resetTemplateFields() {
    document.getElementById('companyName').value = '';
    document.getElementById('positionTitle').value = 'Software Engineer';
    document.getElementById('opportunityType').value = 'full-time opportunities';
    document.getElementById('timeline').value = 'starting May 2026';
    document.getElementById('jobLinks').value = '';
    document.getElementById('recipientName').value = '';
    this.updatePreview();
  }

  // ─── Copy to Clipboard ─────────────────────────────────────────
  async copyMessageToClipboard() {
    const previewEl = document.getElementById('template-preview-text');
    if (!previewEl) return;

    const message = previewEl.textContent;
    if (!message || message.startsWith('Fill in the fields')) {
      this.showNotification('⚠️ No message to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      this.showNotification('✓ Message copied to clipboard!', 'success');
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      this.showNotification('✓ Message copied to clipboard!', 'success');
    }
  }

  // ─── Settings Management ───────────────────────────────────────
  exportSettings() {
    const blob = new Blob([JSON.stringify(this.currentConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-helper-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification('✓ Settings exported!', 'success');
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        const text = await file.text();
        const imported = JSON.parse(text);

        // Merge with defaults
        const defaults = this.getDefaultConfig();
        this.currentConfig = this.deepMerge(defaults, imported);
        this.currentConfig.schemaVersion = 3;

        await this.saveConfiguration();
        this.initializeUI();
        this.showNotification('✓ Settings imported!', 'success');
      } catch (error) {
        this.showNotification('⚠️ Invalid settings file', 'error');
      }
    };
    input.click();
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  resetSettings() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;

    this.currentConfig = this.getDefaultConfig();
    this.saveConfiguration();
    this.initializeUI();
    this.showNotification('✓ Settings reset to defaults', 'info');
  }

  updateStorageInfo() {
    try {
      const dataSize = new Blob([JSON.stringify(this.currentConfig)]).size;
      const maxSize = 102400; // 100KB Chrome sync storage limit
      const percentage = Math.round((dataSize / maxSize) * 100);

      const progressBar = document.getElementById('storage-progress');
      const storageText = document.getElementById('storage-text');

      if (progressBar) progressBar.style.width = `${percentage}%`;
      if (storageText) storageText.textContent = `${(dataSize / 1024).toFixed(1)} KB / ${(maxSize / 1024).toFixed(0)} KB (${percentage}%)`;
    } catch (error) { /* silent */ }
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    const text = document.getElementById('status-text');

    if (indicator) {
      indicator.style.color = connected ? '#22c55e' : '#ef4444';
    }
    if (text) {
      text.textContent = connected ? 'Ready' : 'Error';
    }
  }

  showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const msgEl = document.getElementById('notification-message');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.className = `notification-toast ${type}`;

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

// Initialize
new PopupManager();
