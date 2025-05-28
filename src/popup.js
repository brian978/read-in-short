document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const initialView = document.getElementById('initial-view');
  const loadingView = document.getElementById('loading-view');
  const summaryView = document.getElementById('summary-view');
  const summaryContent = document.getElementById('summary-content');
  const summarizeBtn = document.getElementById('summarize-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Check if an API key is set and load other settings
  browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
    const currentUrl = tabs[0].url;

    browser.storage.sync.get(['openai_api_key', 'openai_organization', 'openai_project', 'saved_summary', 'summary_url']).then(function(result) {
      if (!result.openai_api_key) {
        summaryContent.innerHTML = '<p class="error">Please set your OpenAI API key in the <a href="settings.html" target="_blank">settings</a>.</p>';
        showView(summaryView);
      } else if (result.saved_summary && result.summary_url === currentUrl) {
        // If we have a saved summary for the current URL, display it
        summaryContent.innerHTML = marked.parse(result.saved_summary);
        showView(summaryView);
      } else if (result.saved_summary && result.summary_url !== currentUrl) {
        // If the URL has changed, clear the saved summary
        browser.storage.sync.remove(['saved_summary', 'summary_url']).then(function() {
          showView(initialView);
        });
      }
    });
  });

  // Add event listeners
  summarizeBtn.addEventListener('click', summarizeArticle);
  resetBtn.addEventListener('click', resetView);

  // Get settings button and add event listener to close popup when clicked
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn.addEventListener('click', function(e) {
    // The link will still open settings.html in a new tab
    browser.tabs.create({url: 'settings.html'});
    // Close the popup
    window.close();
  });

  // Function to show a specific view and hide others
  function showView(viewToShow) {
    initialView.classList.add('hidden');
    loadingView.classList.add('hidden');
    summaryView.classList.add('hidden');

    viewToShow.classList.remove('hidden');

    // Get the container element
    const container = document.querySelector('.container');

    // Add or remove the expanded class based on which view is shown
    if (viewToShow === summaryView) {
      container.classList.add('container-expanded');
    } else {
      container.classList.remove('container-expanded');
    }
  }

  // Function to reset to initial view
  function resetView() {
    // Clear the saved summary and URL
    browser.storage.sync.remove(['saved_summary', 'summary_url']).then(function() {
      showView(initialView);
    });
  }

  // Function to summarize the article
  function summarizeArticle() {
    showView(loadingView);

    // Get the current tab URL
    browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
      const currentUrl = tabs[0].url;

      // Get an API key and other settings from storage
      browser.storage.sync.get(['openai_api_key', 'openai_organization', 'openai_project']).then(function(result) {
        if (!result.openai_api_key) {
          summaryContent.innerHTML = '<p class="error">Please set your OpenAI API key in the <a href="settings.html" target="_blank">settings</a>.</p>';
          showView(summaryView);
          return;
        }

        // Send request to background script for rate-limited API access
        browser.runtime.sendMessage({
          action: "summarizeArticle",
          params: {
            url: currentUrl,
            apiKey: result.openai_api_key,
            organization: result.openai_organization,
            project: result.openai_project
          }
        }).then(function(response) {
          if (response && response.success) {
            const summary = response.data.output[0].content[0].text.trim();

            // Save the summary and URL to browser storage
            browser.storage.sync.set({ 
              'saved_summary': summary,
              'summary_url': currentUrl
            }).then(function() {
              // Parse the Markdown and display it
              summaryContent.innerHTML = marked.parse(summary);
              showView(summaryView);
            });
          } else {
            console.error('Error:', response ? response.error : 'Unknown error');
            summaryContent.innerHTML = `<p class="error">Error getting summary: ${response ? response.error : 'Unknown error'}</p>`;
            showView(summaryView);

            // Clear any saved summary and URL since we have an error
            browser.storage.sync.remove(['saved_summary', 'summary_url']);
          }
        }).catch(function(error) {
          console.error('Error:', error);
          summaryContent.innerHTML = `<p class="error">Error getting summary: ${error.message || 'Unknown error'}</p>`;
          showView(summaryView);
        });
      });
    });
  }

  // Function to handle errors and display them to the user
  function handleApiError(error) {
    console.error('Error:', error);
    summaryContent.innerHTML = `<p class="error">Error getting summary: ${error}</p>`;
    showView(summaryView);

    // Clear any saved summary and URL since we have an error
    browser.storage.sync.remove(['saved_summary', 'summary_url']);
  }
});
