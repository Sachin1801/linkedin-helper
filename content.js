// LinkedIn Connection Helper v7.0 — 4 Quick-Copy Buttons
// v7.0 loaded

// ─── Quick Action Definitions ──────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "newConnection",
    label: "New Connection",
    icon: "🔗",
    maxChars: 300,
    description: "Connect with someone at a company",
  },
  {
    id: "recruiter",
    label: "Recruiter",
    icon: "🎯",
    maxChars: 300,
    description: "Connect with a recruiter",
  },
  {
    id: "firstReferral",
    label: "First Referral",
    icon: "💬",
    maxChars: 500,
    description: "Ask an existing connection for referral (first time)",
  },
  {
    id: "followUpReferral",
    label: "Follow-up",
    icon: "🔄",
    maxChars: 500,
    description: "Follow up with someone you already asked",
  },
];

// ─── Element Finder ────────────────────────────────────────────────────
class FastElementFinder {
  constructor() {
    this.debug = false;
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[LI Helper] ${message}`, data || "");
    }
  }

  async findElement(selectors, options = {}) {
    const maxAttempts = options.maxAttempts || 10;
    const delay = options.delay || 50;
    const validator = options.validator || (() => true);

    return new Promise((resolve) => {
      let attempts = 0;

      const tryFind = () => {
        attempts++;
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element && validator(element)) {
              this.log(`✓ Found element: ${selector}`);
              return resolve({ element, selector });
            }
          } catch (e) {
            /* silent */
          }
        }
        if (attempts < maxAttempts) {
          setTimeout(tryFind, delay);
        } else {
          resolve(null);
        }
      };

      tryFind();
    });
  }

  async findAddNoteButton() {
    return this.findElement(
      [
        'button[aria-label="Add a note"]',
        "button[data-test-modal-add-note-btn]",
        '.artdeco-modal button[aria-label*="note"]',
      ],
      {
        maxAttempts: 5,
        delay: 100,
        validator: (el) =>
          el.textContent.includes("Add a note") ||
          el.getAttribute("aria-label")?.includes("Add a note"),
      },
    );
  }

  async findMessageTextarea() {
    return this.findElement(
      [
        'textarea[name="message"]',
        "#custom-message",
        'textarea[id*="message"]',
        ".artdeco-modal textarea",
      ],
      {
        maxAttempts: 5,
        delay: 100,
        validator: (el) => el.tagName === "TEXTAREA" && !el.disabled,
      },
    );
  }

  async extractProfileData() {
    const data = {};

    try {
      const nameSelectors = [
        ".pv-text-details__left-panel h1",
        ".ph5.pb5 h1",
        ".pv-top-card-v3__name",
        "main h1:first-of-type",
      ];
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          const text = element.textContent.trim();
          if (/^[A-Za-z\s\.\-']{2,50}$/.test(text)) {
            data.firstName = text.split(" ")[0];
            break;
          }
        }
      }
    } catch (error) {
      /* silent */
    }

    try {
      const headlineSelectors = [
        ".text-body-medium.break-words",
        ".pv-text-details__left-panel .text-body-medium",
        ".pv-top-card-v3__headline",
      ];
      for (const selector of headlineSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          const headline = element.textContent.trim();
          if (headline.includes(" @ ")) {
            const parts = headline.split(" @ ");
            data.role = parts[0].trim();
            data.company = parts[1].split(/[|,]/)[0].trim();
          } else if (headline.includes(" at ")) {
            const parts = headline.split(" at ");
            data.role = parts[0].trim();
            data.company = parts[1].split(/[|,]/)[0].trim();
          }
          break;
        }
      }
    } catch (error) {
      /* silent */
    }

    return data;
  }
}

// ─── Storage Manager ───────────────────────────────────────────────────
class FastStorageManager {
  constructor() {
    this.storageKey = "liHelper";
    this.config = null;
  }

  async loadConfig() {
    if (this.config) return this.config;

    try {
      const result = await chrome.storage.sync.get([this.storageKey]);
      this.config = result[this.storageKey] || this.getDefaultConfig();
      this.migrateSchemaIfNeeded();
      return this.config;
    } catch (error) {
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  migrateSchemaIfNeeded() {
    if (!this.config || this.config.schemaVersion === 3) return;

    // Migrating to v3 schema

    const defaults = this.getDefaultConfig();

    // Preserve personal info from old config
    if (this.config.personalInfo) {
      defaults.personalInfo = {
        ...defaults.personalInfo,
        ...this.config.personalInfo,
      };
    }

    // Preserve template settings like companyName, positionTitle etc.
    if (this.config.templateSettings) {
      const oldSettings = this.config.templateSettings;
      defaults.templateSettings.companyName = oldSettings.companyName || "";
      defaults.templateSettings.positionTitle =
        oldSettings.positionTitle || defaults.templateSettings.positionTitle;
      defaults.templateSettings.jobLinks = oldSettings.jobLinks || "";
      defaults.templateSettings.recipientName = oldSettings.recipientName || "";
      defaults.templateSettings.autoDetectProfile =
        oldSettings.autoDetectProfile !== false;
      defaults.templateSettings.previewBeforeSend =
        oldSettings.previewBeforeSend !== false;
    }

    // Preserve preferences
    if (this.config.preferences) {
      defaults.preferences = {
        ...defaults.preferences,
        ...this.config.preferences,
      };
    }

    this.config = defaults;

    try {
      chrome.storage.sync.set({ [this.storageKey]: this.config });
    } catch (e) {
      // Migration save failed silently
    }
  }

  getDefaultQuickActionTemplates() {
    return {
      newConnection: `Hi {recipientName}, I'm Sachin, pursuing MS in CS at NYU. I'm interested in the {positionTitle} role at {companyName} and would love to connect and learn about your experience there. Thanks!`,
      recruiter: `Hi {recipientName}, I'm Sachin, an MS in CS student at NYU seeking full-time opportunities starting May 2026. I'd love to connect and explore roles at {companyName}. Thanks!`,
      firstReferral: `Hi {recipientName}, hope you're doing well! I'm reaching out because I'm very interested in the {positionTitle} role at {companyName}. I'm currently pursuing MS in CS at NYU and looking for full-time opportunities starting May 2026. Would you be open to referring me? Here's my resume: {resumeUrl}. Thanks so much for your time!`,
      followUpReferral: `Hi {recipientName}, hope you're doing well! I wanted to follow up — I'm still actively looking for full-time roles starting May 2026. I noticed the {positionTitle} position at {companyName} and think it's a great fit. Would you be open to referring me again? Job link: {jobLinks}. Thanks a lot!`,
    };
  }

  getDefaultConfig() {
    return {
      personalInfo: {
        firstName: "Sachin",
        lastName: "Adlakha",
        email: "",
        phone: "",
        university: "NYU",
        degree: "MS in Computer Science",
        resumeUrl: "",
      },
      templateSettings: {
        messageType: "newConnection",
        companyName: "",
        positionTitle: "Software Engineer",
        opportunityType: "full-time opportunities",
        timeline: "starting May 2026",
        jobLinks: "",
        recipientName: "",
        autoDetectProfile: true,
        previewBeforeSend: true,
      },
      quickActionTemplates: this.getDefaultQuickActionTemplates(),
      preferences: {
        extensionEnabled: true,
        debugMode: false,
        notificationsEnabled: true,
        showDetectedInfo: true,
      },
      schemaVersion: 3,
    };
  }

  async updatePersonalInfo(personalInfo) {
    this.config.personalInfo = { ...this.config.personalInfo, ...personalInfo };
    try {
      await chrome.storage.sync.set({ [this.storageKey]: this.config });
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveConfig() {
    try {
      await chrome.storage.sync.set({ [this.storageKey]: this.config });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ─── Template Processor ────────────────────────────────────────────────
class FastTemplateProcessor {
  constructor(storageManager) {
    this.storageManager = storageManager;
  }

  processTemplateVariables(template, personalInfo, settings, profileData) {
    const variables = {
      "{recipientName}":
        profileData.firstName || settings.recipientName || "[Name]",
      "{firstName}": personalInfo.firstName || "Sachin",
      "{lastName}": personalInfo.lastName || "Adlakha",
      "{fullName}":
        `${personalInfo.firstName || "Sachin"} ${personalInfo.lastName || "Adlakha"}`.trim(),
      "{email}": personalInfo.email || "[Email]",
      "{phone}": personalInfo.phone || "[Phone]",
      "{university}": personalInfo.university || "NYU",
      "{degree}": personalInfo.degree || "MS in Computer Science",
      "{resumeUrl}": personalInfo.resumeUrl || "[Resume URL]",
      "{companyName}":
        settings.companyName || profileData.company || "[Company]",
      "{positionTitle}": settings.positionTitle || "[Position]",
      "{opportunityType}":
        settings.opportunityType || "full-time opportunities",
      "{timeline}": settings.timeline || "starting May 2026",
      "{jobLinks}": settings.jobLinks || "[Job Links]",
    };

    let result = template;
    for (const [variable, value] of Object.entries(variables)) {
      result = result.split(variable).join(value);
    }
    return result;
  }

  processQuickAction(
    actionId,
    personalInfo,
    settings,
    profileData,
    quickActionTemplates,
  ) {
    const defaults = this.storageManager.getDefaultQuickActionTemplates();
    const template =
      quickActionTemplates?.[actionId] ||
      defaults[actionId] ||
      defaults.newConnection;
    return this.processTemplateVariables(
      template,
      personalInfo,
      settings,
      profileData,
    );
  }
}

// ─── Initialize Components ─────────────────────────────────────────────
const elementFinder = new FastElementFinder();
const storageManager = new FastStorageManager();
const templateProcessor = new FastTemplateProcessor(storageManager);

// Extension state
let extensionEnabled = true;
let notificationsEnabled = true;
let showDetectedInfo = true;
let isConnectionFlowRunning = false;

function applyRuntimePreferences(config) {
  const preferences = config?.preferences || {};
  extensionEnabled = preferences.extensionEnabled !== false;
  notificationsEnabled = preferences.notificationsEnabled !== false;
  showDetectedInfo = preferences.showDetectedInfo !== false;
  elementFinder.debug = preferences.debugMode === true;
}

// ─── Notification Toast ────────────────────────────────────────────────
function showNotification(message, type = "info") {
  if (!notificationsEnabled) return;

  const backgroundColors = {
    success: "#0a66c2",
    error: "#e74c3c",
    warning: "#f59e0b",
    info: "#1f2937",
  };

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${backgroundColors[type] || backgroundColors.info};
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    max-width: 320px;
    animation: liHelperSlideIn 0.3s ease;
  `;

  notification.innerText = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// ─── Preview Modal ─────────────────────────────────────────────────────
function showPreviewModal(message, contextLabel = "Message Preview") {
  return new Promise((resolve) => {
    const existing = document.getElementById("li-helper-preview-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "li-helper-preview-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 10050; padding: 16px; box-sizing: border-box;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width: min(640px, 100%); max-height: min(80vh, 680px);
      background: #fff; border-radius: 12px;
      box-shadow: 0 14px 40px rgba(0,0,0,0.24);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const header = document.createElement("div");
    header.style.cssText = `padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-size: 15px; font-weight: 600; color: #111827; background: #f9fafb;`;
    header.textContent = contextLabel;

    const meta = document.createElement("div");
    meta.style.cssText = `padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #475569;`;
    meta.textContent = `${message.length} characters`;

    const preview = document.createElement("pre");
    preview.style.cssText = `margin: 0; padding: 16px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.45; color: #111827; flex: 1;`;
    preview.textContent = message;

    const actions = document.createElement("div");
    actions.style.cssText = `display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb;`;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; padding: 8px 14px; font-size: 13px; cursor: pointer;`;

    const insertBtn = document.createElement("button");
    insertBtn.textContent = "Insert Message";
    insertBtn.style.cssText = `border: 1px solid #0a66c2; border-radius: 8px; background: #0a66c2; color: #fff; padding: 8px 14px; font-size: 13px; cursor: pointer;`;

    const cleanup = (approved) => {
      document.removeEventListener("keydown", handleEsc);
      overlay.remove();
      resolve(approved);
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") cleanup(false);
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
    cancelBtn.addEventListener("click", () => cleanup(false));
    insertBtn.addEventListener("click", () => cleanup(true));
    document.addEventListener("keydown", handleEsc);

    actions.appendChild(cancelBtn);
    actions.appendChild(insertBtn);
    modal.appendChild(header);
    modal.appendChild(meta);
    modal.appendChild(preview);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

async function maybePreviewMessage(message, templateSettings, contextLabel) {
  if (templateSettings?.previewBeforeSend === false) return message;

  const approved = await showPreviewModal(message, contextLabel);
  if (!approved) {
    showNotification("Message insertion cancelled.", "info");
    return null;
  }
  return message;
}

// ─── Quick-Copy: Generate & Copy to Clipboard ─────────────────────────
async function quickCopyMessage(actionId) {
  const config = await storageManager.loadConfig();
  const personalInfo = config.personalInfo;
  const settings = config.templateSettings || {};
  const quickActionTemplates = config.quickActionTemplates;
  const profileData =
    settings.autoDetectProfile === false
      ? {}
      : await elementFinder.extractProfileData();

  let message = templateProcessor.processQuickAction(
    actionId,
    personalInfo,
    settings,
    profileData,
    quickActionTemplates,
  );

  const action = QUICK_ACTIONS.find((a) => a.id === actionId);
  const maxChars = action?.maxChars || 500;

  if (message.length > maxChars) {
    message = `${message.slice(0, maxChars - 3).trimEnd()}...`;
  }

  try {
    await navigator.clipboard.writeText(message);
    showNotification(
      `✓ ${action?.icon || ""} Copied! (${message.length} chars) — Paste in LinkedIn`,
      "success",
    );
  } catch (err) {
    // Fallback: use execCommand
    const textarea = document.createElement("textarea");
    textarea.value = message;
    textarea.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showNotification(
      `✓ ${action?.icon || ""} Copied! (${message.length} chars) — Paste in LinkedIn`,
      "success",
    );
  }
}

// ─── Connection Flow (auto-fill on Connect → Add a note) ───────────────
async function waitForConnectionModal() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 20;
    const delay = 100;

    const checkModal = () => {
      attempts++;
      const modalExists =
        document.querySelector(".artdeco-modal") ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector(".send-invite");

      if (modalExists) {
        resolve(modalExists);
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(checkModal, delay);
      } else {
        reject(new Error("Modal not detected"));
      }
    };
    checkModal();
  });
}

async function waitForTextarea() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 15;
    const delay = 100;

    const checkTextarea = () => {
      attempts++;
      const textareaExists =
        document.querySelector('textarea[name="message"]') ||
        document.querySelector("#custom-message") ||
        document.querySelector(".artdeco-modal textarea");

      if (textareaExists) {
        resolve(textareaExists);
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(checkTextarea, delay);
      } else {
        reject(new Error("Textarea not detected"));
      }
    };
    checkTextarea();
  });
}

async function handleConnection() {
  if (isConnectionFlowRunning) return;
  isConnectionFlowRunning = true;

  try {
    await waitForConnectionModal();

    let textareaResult = await elementFinder.findMessageTextarea();
    let textarea = textareaResult?.element || null;

    if (!textarea) {
      const addNoteButton = await elementFinder.findAddNoteButton();
      if (!addNoteButton) throw new Error("Add a note button not found");
      addNoteButton.element.click();
      textarea = await waitForTextarea();
    }

    const config = await storageManager.loadConfig();
    const personalInfo = config.personalInfo;
    const templateSettings = config.templateSettings || {};
    const quickActionTemplates = config.quickActionTemplates;
    const profileData =
      templateSettings.autoDetectProfile === false
        ? {}
        : await elementFinder.extractProfileData();

    // Always use newConnection template for the Connect → Add a note flow
    let message = templateProcessor.processQuickAction(
      "newConnection",
      personalInfo,
      templateSettings,
      profileData,
      quickActionTemplates,
    );

    if (message.length > 300) {
      message = `${message.slice(0, 297).trimEnd()}...`;
      showNotification(
        "ℹ️ Message trimmed to 300 chars for LinkedIn note limit.",
        "warning",
      );
    }

    message = await maybePreviewMessage(
      message,
      templateSettings,
      "Preview Connection Request Note",
    );
    if (!message) return;

    textarea.value = message;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();

    textarea.style.border = "2px solid #0a66c2";
    textarea.style.backgroundColor = "#f0f7ff";
    setTimeout(() => {
      textarea.style.border = "";
      textarea.style.backgroundColor = "";
    }, 2000);

    showNotification("✓ Message inserted successfully!", "success");
  } catch (error) {
    elementFinder.log("Connection error:", error.message);
    showNotification("⚠️ Could not complete connection. Try again.", "error");
  } finally {
    isConnectionFlowRunning = false;
  }
}

function isConnectButtonClick(target) {
  if (!(target instanceof Element)) return false;
  const button = target.closest("button");
  if (!button) return false;

  const normalizedText = (button.innerText || button.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const normalizedAria = (button.getAttribute("aria-label") || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const hasConnectWord =
    /\bconnect\b/.test(normalizedText) || /\bconnect\b/.test(normalizedAria);
  const looksLikeFollowAction =
    /\bfollow\b/.test(normalizedText) || /\bfollow\b/.test(normalizedAria);

  return hasConnectWord && !looksLikeFollowAction;
}

// Click handler for auto-fill on Connect
document.addEventListener("click", function (e) {
  if (!extensionEnabled) return;
  if (isConnectButtonClick(e.target)) {
    elementFinder.log("Connect button clicked!");
    handleConnection();
  }
});

// ─── Messaging Page Support ────────────────────────────────────────────
function isMessagingPage() {
  return (
    window.location.href.includes("/messaging/") ||
    document.querySelector(".msg-overlay-conversation-bubble") ||
    document.querySelector(".msg-form__contenteditable") ||
    document.querySelector(".msg-form__msg-content-container")
  );
}

async function extractChatProfileData() {
  const data = {};
  try {
    const headerSelectors = [
      ".msg-overlay-bubble-header__title",
      ".msg-entity-lockup__entity-title",
      ".msg-thread__link-to-profile span",
      ".msg-overlay-bubble-header__details h2",
      ".msg-conversation-card__title",
    ];
    for (const selector of headerSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        data.firstName = element.textContent.trim().split(" ")[0];
        break;
      }
    }
    const subtitleSelectors = [
      ".msg-overlay-bubble-header__subtitle",
      ".msg-entity-lockup__entity-subtitle",
      ".msg-conversation-card__subtitle",
    ];
    for (const selector of subtitleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        const subtitle = element.textContent.trim();
        if (subtitle.includes(" at ")) {
          const parts = subtitle.split(" at ");
          data.company = parts[1].trim();
          data.role = parts[0].trim();
        }
        break;
      }
    }
  } catch (error) {
    /* silent */
  }
  return data;
}

async function insertMessageIntoChat(actionId) {
  elementFinder.log("Starting message insertion for:", actionId);

  try {
    let messageBox = document.querySelector(
      '.msg-form__contenteditable[contenteditable="true"]',
    );

    if (!messageBox) {
      const selectors = [
        '.msg-form__msg-content-container [contenteditable="true"]',
        '[aria-label*="Write a message"]',
        'div[role="textbox"][contenteditable="true"]',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (
          el &&
          el.isContentEditable &&
          el.tagName !== "BODY" &&
          el.offsetWidth < 800
        ) {
          messageBox = el;
          break;
        }
      }
    }

    if (!messageBox) {
      showNotification(
        "⚠️ Could not find message box. Click in the message area first.",
        "error",
      );
      return;
    }

    const config = await storageManager.loadConfig();
    const personalInfo = config.personalInfo;
    const settings = config.templateSettings || {};
    const quickActionTemplates = config.quickActionTemplates;
    const profileData =
      settings.autoDetectProfile === false
        ? {}
        : await extractChatProfileData();

    let message = templateProcessor.processQuickAction(
      actionId,
      personalInfo,
      settings,
      profileData,
      quickActionTemplates,
    );

    const action = QUICK_ACTIONS.find((a) => a.id === actionId);
    const maxChars = action?.maxChars || 500;
    if (message.length > maxChars) {
      message = `${message.slice(0, maxChars - 3).trimEnd()}...`;
    }

    message = await maybePreviewMessage(
      message,
      settings,
      "Preview LinkedIn Message",
    );
    if (!message) return;

    try {
      messageBox.innerHTML = "";
      messageBox.textContent = message;
    } catch (innerError) {
      messageBox.innerText = message;
    }

    ["input", "change", "keyup", "keydown"].forEach((eventType) => {
      messageBox.dispatchEvent(
        new Event(eventType, { bubbles: true, cancelable: true }),
      );
    });

    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(messageBox);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    messageBox.focus();

    messageBox.style.outline = "2px solid #0a66c2";
    messageBox.style.outlineOffset = "-2px";
    setTimeout(() => {
      messageBox.style.outline = "";
      messageBox.style.outlineOffset = "";
    }, 2000);

    showNotification("✓ Message inserted! Review and click Send.", "success");
  } catch (error) {
    elementFinder.log("Error inserting message:", error.message);
    showNotification(
      "⚠️ Error inserting message. Try using the copy button instead.",
      "error",
    );
  }
}

// ─── Floating Quick-Copy Panel ─────────────────────────────────────────
function createFloatingPanel() {
  // Inject animation keyframes
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes liHelperSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes liHelperFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);

  // Main container
  const container = document.createElement("div");
  container.id = "li-helper-panel";
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  `;

  // Expandable button panel
  const buttonPanel = document.createElement("div");
  buttonPanel.id = "li-helper-button-panel";
  buttonPanel.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 6px;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 14px;
    padding: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    animation: liHelperFadeIn 0.2s ease;
    min-width: 200px;
  `;

  // Panel header
  const panelHeader = document.createElement("div");
  panelHeader.style.cssText = `
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 6px 6px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 2px;
  `;
  panelHeader.textContent = "Quick Copy";
  buttonPanel.appendChild(panelHeader);

  // Create 4 quick action buttons
  QUICK_ACTIONS.forEach((action) => {
    const btn = document.createElement("button");
    btn.dataset.actionId = action.id;
    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      color: #1e293b;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      font-family: inherit;
    `;

    btn.innerHTML = `
      <span style="font-size: 18px; flex-shrink: 0;">${action.icon}</span>
      <span style="display: flex; flex-direction: column; gap: 1px;">
        <span style="font-weight: 600; font-size: 13px;">${action.label}</span>
        <span style="font-size: 10px; color: #94a3b8; font-weight: 400;">≤${action.maxChars} chars</span>
      </span>
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#f0f7ff";
      btn.style.borderColor = "#0a66c2";
      btn.style.transform = "translateX(-2px)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#ffffff";
      btn.style.borderColor = "#e2e8f0";
      btn.style.transform = "";
    });

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      // Visual feedback
      const originalBg = btn.style.background;
      btn.style.background = "#dcfce7";
      btn.style.borderColor = "#22c55e";
      setTimeout(() => {
        btn.style.background = originalBg;
        btn.style.borderColor = "#e2e8f0";
      }, 500);

      // If on messaging page, try to insert directly; otherwise copy to clipboard
      if (isMessagingPage()) {
        await insertMessageIntoChat(action.id);
      } else {
        await quickCopyMessage(action.id);
      }
    });

    buttonPanel.appendChild(btn);
  });

  // Main toggle button (FAB)
  const fab = document.createElement("div");
  fab.id = "li-helper-fab";
  fab.innerHTML = "🤝";
  fab.title = "LinkedIn Helper — Click to toggle quick-copy buttons";
  fab.style.cssText = `
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #0a66c2, #004182);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 24px;
    box-shadow: 0 4px 16px rgba(10, 102, 194, 0.35);
    transition: all 0.3s ease;
    user-select: none;
  `;

  fab.addEventListener("mouseenter", () => {
    fab.style.transform = "scale(1.1)";
    fab.style.boxShadow = "0 6px 20px rgba(10, 102, 194, 0.45)";
  });
  fab.addEventListener("mouseleave", () => {
    fab.style.transform = "";
    fab.style.boxShadow = "0 4px 16px rgba(10, 102, 194, 0.35)";
  });

  let panelOpen = false;
  fab.addEventListener("click", () => {
    panelOpen = !panelOpen;
    buttonPanel.style.display = panelOpen ? "flex" : "none";
    fab.style.background = panelOpen
      ? "linear-gradient(135deg, #004182, #002952)"
      : "linear-gradient(135deg, #0a66c2, #004182)";
  });

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (panelOpen && !container.contains(e.target)) {
      panelOpen = false;
      buttonPanel.style.display = "none";
      fab.style.background = "linear-gradient(135deg, #0a66c2, #004182)";
    }
  });

  container.appendChild(buttonPanel);
  container.appendChild(fab);
  document.body.appendChild(container);

  return { container, fab, buttonPanel };
}

const floatingPanel = createFloatingPanel();

// ─── Initialize ────────────────────────────────────────────────────────
async function initializeRuntimeState() {
  try {
    const config = await storageManager.loadConfig();
    applyRuntimePreferences(config);
  } catch (error) {
    extensionEnabled = true;
    notificationsEnabled = true;
  }

  floatingPanel.fab.style.opacity = extensionEnabled ? "1" : "0.5";
}

initializeRuntimeState();

// ─── Keyboard Shortcut (Ctrl+Shift+M) ──────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (!extensionEnabled) return;

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "M") {
    e.preventDefault();
    if (isMessagingPage()) {
      insertMessageIntoChat("firstReferral");
    } else {
      showNotification(
        "💡 Use this shortcut in LinkedIn messaging to insert templates",
        "info",
      );
    }
  }
});

// ─── URL Change Observers ──────────────────────────────────────────────
if (!window.__liHelperHistoryPatched) {
  window.__liHelperHistoryPatched = true;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("lihelper:locationchange"));
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("lihelper:locationchange"));
    return result;
  };
}

// ─── Console Debug Utilities ───────────────────────────────────────────
window.liHelperStorage = {
  getConfig: async () => {
    const config = await storageManager.loadConfig();
    if (elementFinder.debug) console.log("[LI Helper] Current config:", config);
    return config;
  },
  setupPersonal: async (name, title, background) => {
    const success = await storageManager.updatePersonalInfo({
      name,
      title,
      background,
    });
    if (success) elementFinder.log("Personal information updated");
    return success;
  },
};

// ─── Message Handling for Popup ────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reloadConfig") {
    if (message.config) {
      storageManager.config = message.config;
      applyRuntimePreferences(message.config);
      floatingPanel.fab.style.opacity = extensionEnabled ? "1" : "0.5";
    } else {
      storageManager.config = null; // Force reload
    }
    sendResponse({ success: true });
  }

  if (message.action === "getStatus") {
    sendResponse({
      success: true,
      extensionEnabled: extensionEnabled,
      config: storageManager.config?.personalInfo,
    });
  }
});

// LinkedIn Connection Helper v7.0 — ready
