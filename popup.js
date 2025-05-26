document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const initialView = document.getElementById('initial-view');
  const loadingView = document.getElementById('loading-view');
  const summaryView = document.getElementById('summary-view');
  const summaryContent = document.getElementById('summary-content');
  const summarizeBtn = document.getElementById('summarize-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Check if API key is set and load other settings
  chrome.storage.sync.get(['openai_api_key', 'openai_organization', 'openai_project', 'saved_summary'], function(result) {
    if (!result.openai_api_key) {
      summaryContent.innerHTML = '<p class="error">Please set your OpenAI API key in the <a href="settings.html" target="_blank">settings</a>.</p>';
      showView(summaryView);
    } else if (result.saved_summary) {
      // If we have a saved summary, display it
      summaryContent.innerHTML = marked.parse(result.saved_summary);
      showView(summaryView);
    }
  });

  // Add event listeners
  summarizeBtn.addEventListener('click', summarizeArticle);
  resetBtn.addEventListener('click', resetView);

  // Function to show a specific view and hide others
  function showView(viewToShow) {
    initialView.classList.add('hidden');
    loadingView.classList.add('hidden');
    summaryView.classList.add('hidden');

    viewToShow.classList.remove('hidden');
  }

  // Function to reset to initial view
  function resetView() {
    // Clear the saved summary
    chrome.storage.sync.remove('saved_summary', function() {
      showView(initialView);
    });
  }

  // Function to summarize the article
  function summarizeArticle() {
    showView(loadingView);

    // Get the current tab URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;

      // Get API key and other settings from storage
      chrome.storage.sync.get(['openai_api_key', 'openai_organization', 'openai_project'], function(result) {
        if (!result.openai_api_key) {
          summaryContent.innerHTML = '<p class="error">Please set your OpenAI API key in the <a href="settings.html" target="_blank">settings</a>.</p>';
          showView(summaryView);
          return;
        }

        // Send request to background script for rate-limited API access
        chrome.runtime.sendMessage({
          action: "summarizeArticle",
          params: {
            url: currentUrl,
            apiKey: result.openai_api_key,
            organization: result.openai_organization,
            project: result.openai_project
          }
        }, function(response) {
          if (response && response.success) {
            const summary = response.data.output[0].content[0].text.trim();

            // Save the summary to Chrome storage
            chrome.storage.sync.set({ 'saved_summary': summary }, function() {
              // Parse the Markdown and display it
              summaryContent.innerHTML = marked.parse(summary);
              showView(summaryView);
            });
          } else {
            console.error('Error:', response ? response.error : 'Unknown error');
            summaryContent.innerHTML = `<p class="error">Error getting summary: ${response ? response.error : 'Unknown error'}</p>`;
            showView(summaryView);

            // Clear any saved summary since we have an error
            chrome.storage.sync.remove('saved_summary');
          }
        });
      });
    });
  }

  // Function to handle errors and display them to the user
  function handleApiError(error) {
    console.error('Error:', error);
    summaryContent.innerHTML = `<p class="error">Error getting summary: ${error}</p>`;
    showView(summaryView);

    // Clear any saved summary since we have an error
    chrome.storage.sync.remove('saved_summary');
  }
});
