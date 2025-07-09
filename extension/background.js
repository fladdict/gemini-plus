// Background Service Worker for Chrome Extension Manifest V3
// This runs in the background and handles extension events

// Load default menu structure from JSON file
async function loadDefaultMenuStructure() {
  try {
    const response = await fetch(chrome.runtime.getURL('presets/default-menus.json'));
    const defaultMenuStructure = await response.json();
    return defaultMenuStructure;
  } catch (error) {
    console.error('Failed to load default menu structure:', error);
    // Fallback to basic structure if file loading fails
    return [
      {
        id: 'custom-folder',
        type: 'folder',
        name: 'カスタム',
        description: 'ユーザー定義のメニュー',
        expanded: true,
        items: []
      }
    ];
  }
}

// Extension installation/startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  
  // Initialize extension data
  chrome.storage.sync.get(['menuStructure'], async (result) => {
    if (!result.menuStructure) {
      // Load default menu structure from JSON file
      const defaultMenuStructure = await loadDefaultMenuStructure();
      
      chrome.storage.sync.set({
        isEnabled: true,
        settings: {
          theme: 'light',
          notifications: true
        },
        menuStructure: defaultMenuStructure
      });
    } else {
      chrome.storage.sync.set({
        isEnabled: true,
        settings: {
          theme: 'light',
          notifications: true
        }
      });
    }
    
    // Create initial menus
    createContextMenus();
  });
});

// Create all context menus
function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create main menu
    chrome.contextMenus.create({
      id: 'gemini-plus-menu',
      title: 'Gemini+',
      contexts: ['selection']
    });
    
    // Load menu structure from storage and create menus
    chrome.storage.sync.get(['menuStructure'], (result) => {
      const menuStructure = result.menuStructure || [];
      
      // Create menus from tree structure
      createMenusFromStructure(menuStructure, 'gemini-plus-menu');
      
      // Add separator and customize menu at the end
      chrome.contextMenus.create({
        id: 'gemini-plus-separator',
        parentId: 'gemini-plus-menu',
        type: 'separator',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'gemini-plus-customize',
        parentId: 'gemini-plus-menu',
        title: 'カスタマイズ',
        contexts: ['selection']
      });
    });
  });
}

// Create menus recursively from tree structure
function createMenusFromStructure(items, parentId) {
  items.forEach(item => {
    if (item.type === 'separator') {
      chrome.contextMenus.create({
        id: item.id,
        parentId: parentId,
        type: 'separator',
        contexts: ['selection']
      });
    } else if (item.type === 'menu') {
      // Create menu for selection context only
      chrome.contextMenus.create({
        id: item.id,
        parentId: parentId,
        title: item.title,
        contexts: ['selection']
      });
    } else if (item.type === 'folder' && item.items && item.items.length > 0) {
      // Create folder as submenu
      chrome.contextMenus.create({
        id: item.id,
        parentId: parentId,
        title: item.name,
        contexts: ['selection']
      });
      
      // Recursively create items within the folder
      createMenusFromStructure(item.items, item.id);
    }
  });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'getData':
      // Get data from storage
      chrome.storage.sync.get(['settings'], (result) => {
        sendResponse({ data: result.settings });
      });
      return true; // Keep message channel open for async response
      
    case 'saveData':
      // Save data to storage
      chrome.storage.sync.set({ settings: request.data }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'refreshMenus':
      // Refresh context menus when custom menus are updated
      createContextMenus();
      sendResponse({ success: true });
      break;
      
    case 'getDefaultMenuStructure':
      // Load and return default menu structure
      loadDefaultMenuStructure().then(defaultMenuStructure => {
        sendResponse({ defaultMenuStructure });
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    // Add your logic here
  }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
  // This won't trigger if default_popup is set in manifest
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  switch (info.menuItemId) {
    case 'gemini-plus-customize':
      handleCustomize(tab);
      break;
      
    default:
      // Handle all menu clicks (preset and custom) through unified system
      handleMenuClick(info, tab);
      break;
  }
});


// Handle customize
function handleCustomize(tab) {
  console.log('Opening customize page');
  
  // Open the extension's popup (customize page)
  chrome.action.openPopup();
}

// Handle all menu clicks (preset and custom)
function handleMenuClick(info, tab) {
  const menuId = info.menuItemId;
  console.log('Menu clicked:', menuId);
  
  // Get menu structure from storage
  chrome.storage.sync.get(['menuStructure'], (result) => {
    if (!result.menuStructure) return;
    
    // Find the clicked menu in the tree structure
    const targetMenu = findMenuInStructure(result.menuStructure, menuId);
    
    if (targetMenu) {
      // All menus now work with selection only
      handleMenuPrompt(targetMenu, tab, info.selectionText || '');
    }
  });
}

// Find menu item in tree structure recursively
function findMenuInStructure(items, targetId) {
  for (const item of items) {
    if (item.id === targetId && item.type === 'menu') {
      return item;
    }
    if (item.type === 'folder' && item.items) {
      const found = findMenuInStructure(item.items, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Handle menu prompt (selection only)
function handleMenuPrompt(menu, tab, selectionText) {
  console.log('Executing menu prompt:', menu.title, 'selectionText:', selectionText ? 'present' : 'empty');
  
  chrome.tabs.sendMessage(tab.id, {
    action: 'showNotification',
    message: 'Geminiを開いています...'
  });
  
  // All menus now work with selection only
  const textToUse = selectionText || '';
  const processedPrompt = processPromptTemplate(menu.prompt, tab, textToUse);
  openGeminiWithPrompt(processedPrompt);
}

// Process prompt template with variable substitution
function processPromptTemplate(template, tab, text) {
  let processedPrompt = template;
  
  // Replace variables
  processedPrompt = processedPrompt.replace(/\{\$URL\}/g, tab.url || '');
  processedPrompt = processedPrompt.replace(/\{\$TITLE\}/g, tab.title || '');
  processedPrompt = processedPrompt.replace(/\{\$TEXT\}/g, text || '');
  
  return processedPrompt;
}

// Open Gemini with processed prompt
function openGeminiWithPrompt(prompt) {
  chrome.tabs.create({
    url: 'https://gemini.google.com/app',
    active: true
  }, (newTab) => {
    // Wait for the tab to load, then inject the prompt
    setTimeout(() => {
      chrome.tabs.sendMessage(newTab.id, {
        action: 'injectPrompt',
        prompt: prompt
      });
    }, 3000); // Wait 3 seconds for Gemini to load
  });
}