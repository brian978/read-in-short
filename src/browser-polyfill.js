/**
 * This polyfill provides a browser-compatible API that works in both Chrome and Firefox.
 * It detects the browser environment and maps the appropriate browser-specific APIs.
 */

(function(global) {
  // Check if we're in a browser extension environment
  if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
    // We're in Chrome or Edge
    global.browser = {
      // Runtime API
      runtime: {
        sendMessage: function() {
          return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(...arguments, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
        },
        onMessage: {
          addListener: function(callback) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
              const response = callback(message, sender, sendResponse);
              if (response === true) {
                return true; // Will respond asynchronously
              }
              return false; // Will respond synchronously
            });
          }
        },
        onInstalled: chrome.runtime.onInstalled
      },

      // Tabs API
      tabs: {
        query: function(queryInfo) {
          return new Promise((resolve, reject) => {
            chrome.tabs.query(queryInfo, (tabs) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tabs);
              }
            });
          });
        },
        create: function(createProperties) {
          return new Promise((resolve, reject) => {
            chrome.tabs.create(createProperties, (tab) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tab);
              }
            });
          });
        }
      },

      // Storage API
      storage: {
        sync: {
          get: function(keys) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.get(keys, (items) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(items);
                }
              });
            });
          },
          set: function(items) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.set(items, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          },
          remove: function(keys) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.remove(keys, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          }
        }
      }
    };
  } else if (typeof browser !== 'undefined') {
    // We're in Firefox, browser is already defined
    // Firefox already implements the Promise-based API
    // No need to do anything
  } else {
    // Not in a browser extension environment
    console.warn('browser-polyfill.js: This script should only be loaded in a browser extension environment.');
  }
})(this);
