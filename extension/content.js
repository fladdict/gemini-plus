// Content script for Chrome Extension
// This script runs on all web pages and can interact with the DOM

(function() {
  'use strict';
  
  // Check if extension is enabled
  chrome.storage.sync.get(['isEnabled'], function(result) {
    if (result.isEnabled === false) {
      return; // Exit if extension is disabled
    }
    
    // Initialize content script
    init();
  });
  
  function init() {
    console.log('Sample Chrome Extension content script loaded');
    
    // Add a visual indicator that the extension is active
    addExtensionIndicator();
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'getPageInfo') {
        sendResponse({
          title: document.title,
          url: window.location.href,
          domain: window.location.hostname
        });
      } else if (request.action === 'showNotification') {
        showNotification(request.message);
      } else if (request.action === 'getPageText') {
        const pageText = getPageText();
        sendResponse({ text: pageText });
      }
    });
    
    // Example: Monitor for specific elements or events
    observePageChanges();
  }
  
  function addExtensionIndicator() {
    // Create a small indicator that shows the extension is active
    const indicator = document.createElement('div');
    indicator.id = 'extension-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 12px;
      height: 12px;
      background-color: #4CAF50;
      border-radius: 50%;
      z-index: 10000;
      opacity: 0.7;
      transition: opacity 0.3s;
    `;
    
    indicator.addEventListener('mouseenter', function() {
      this.style.opacity = '1';
    });
    
    indicator.addEventListener('mouseleave', function() {
      this.style.opacity = '0.7';
    });
    
    document.body.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
  }
  
  function observePageChanges() {
    // Example: Observe DOM changes
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          // Handle new elements added to page
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Add your logic here
              console.log('New element added:', node.tagName);
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Example: Add keyboard shortcut
  document.addEventListener('keydown', function(event) {
    // Ctrl + Shift + E
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
      event.preventDefault();
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'keyboardShortcut',
        key: 'Ctrl+Shift+E',
        url: window.location.href
      });
      
      console.log('Extension keyboard shortcut activated');
    }
  });
  
  // Function to get page text content
  function getPageText() {
    // Remove script and style elements
    const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside');
    const clonedDocument = document.cloneNode(true);
    
    // Remove unwanted elements from clone
    clonedDocument.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());
    
    // Get text content from main content areas
    let text = '';
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main'
    ];
    
    // Try to find main content area
    let mainContent = null;
    for (const selector of contentSelectors) {
      mainContent = document.querySelector(selector);
      if (mainContent) break;
    }
    
    if (mainContent) {
      text = mainContent.innerText || mainContent.textContent || '';
    } else {
      // Fallback to body text
      text = document.body.innerText || document.body.textContent || '';
    }
    
    // Clean up text - remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit text length to avoid very long prompts
    const maxLength = 3000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }
  
  // Function to show notification
  function showNotification(message) {
    // Remove existing notification if any
    const existingNotification = document.getElementById('gemini-plus-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'gemini-plus-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
    
    // Add slideOut animation
    style.textContent += `
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
  }
  
})();