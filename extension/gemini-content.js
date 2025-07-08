// Content script for Gemini website
// This script runs specifically on gemini.google.com

(function() {
  'use strict';
  
  console.log('Gemini+ content script loaded');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Gemini content script received message:', request);
    
    if (request.action === 'injectPrompt') {
      injectPrompt(request.prompt);
      sendResponse({ success: true });
    }
  });
  
  // Function to inject prompt into Gemini's input field
  function injectPrompt(prompt) {
    console.log('Injecting prompt:', prompt);
    
    // Wait for the input field to be available
    waitForInputField().then(inputField => {
      if (inputField) {
        // Clear existing content
        inputField.innerHTML = '';
        
        // Create a new paragraph element with the prompt
        const p = document.createElement('p');
        p.textContent = prompt;
        inputField.appendChild(p);
        
        // Focus the input field
        inputField.focus();
        
        // Trigger input event to notify Gemini of the change
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('Prompt injected successfully');
      } else {
        console.error('Input field not found');
      }
    });
  }
  
  // Function to wait for input field to be available
  function waitForInputField(maxAttempts = 30) {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const checkForInputField = () => {
        // Try multiple selectors to find the input field
        const selectors = [
          '.ql-editor.textarea.new-input-ui[contenteditable="true"]',
          '.ql-editor[contenteditable="true"]',
          '[role="textbox"][contenteditable="true"]',
          '[aria-label*="prompt"][contenteditable="true"]',
          '[data-placeholder*="Gemini"][contenteditable="true"]'
        ];
        
        let inputField = null;
        
        for (const selector of selectors) {
          inputField = document.querySelector(selector);
          if (inputField) {
            console.log('Found input field with selector:', selector);
            break;
          }
        }
        
        if (inputField) {
          resolve(inputField);
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Waiting for input field... attempt ${attempts}`);
            setTimeout(checkForInputField, 500);
          } else {
            console.error('Input field not found after maximum attempts');
            resolve(null);
          }
        }
      };
      
      checkForInputField();
    });
  }
  
  // Function to check if we're on the Gemini chat page
  function isGeminiChatPage() {
    return window.location.hostname === 'gemini.google.com' && 
           window.location.pathname.includes('/app');
  }
  
  // Only run on Gemini chat page
  if (isGeminiChatPage()) {
    console.log('Gemini+ ready on chat page');
  }
  
})();