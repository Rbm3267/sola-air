// Sola AIR — Sidepanel Script

// Dismiss guide
const dismissBtn = document.getElementById('dismiss-guide');
const guide = document.getElementById('setup-guide');
if (dismissBtn && guide) {
  // Check if already dismissed
  chrome.storage.local.get('guideDismissed', (data) => {
    if (data.guideDismissed) guide.style.display = 'none';
  });
  dismissBtn.addEventListener('click', () => {
    guide.style.display = 'none';
    chrome.storage.local.set({ guideDismissed: true });
  });
}

// Track which component is currently previewing
let activeComponent = null;

document.querySelectorAll('.dock-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const componentId = btn.dataset.component;

    // Toggle off if same component clicked again
    if (activeComponent === componentId) {
      activeComponent = null;
      btn.classList.remove('active');
      chrome.storage.session.get('solaTabId', ({ solaTabId }) => {
        if (solaTabId) chrome.tabs.sendMessage(solaTabId, { type: 'SOLA_REMOVE_PREVIEW' });
      });
      return;
    }

    // Deactivate previous
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeComponent = componentId;

    // Inject content script into the tab that opened the side panel
    chrome.storage.session.get('solaTabId', ({ solaTabId }) => {
      if (!solaTabId) {
        console.error('[Sola] No target tab — click the extension icon on the page you want to inject into.');
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: solaTabId },
        files: ['codegen.js', 'content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Sola] inject failed:', chrome.runtime.lastError.message);
          return;
        }
        chrome.tabs.sendMessage(solaTabId, {
          type: 'SOLA_SHOW_COMPONENT',
          component: componentId
        });
      });
    });
  });
});
