document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const initialView = document.getElementById('initial-view');
  const loadingView = document.getElementById('loading-view');
  const summaryView = document.getElementById('summary-view');
  const summaryContent = document.getElementById('summary-content');
  const summarizeBtn = document.getElementById('summarize-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Function to create a sanitized document fragment from HTML
  function createSanitizedFragment(html) {
    // Use DOMParser to parse HTML string into a document
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Process the body content of the parsed document
    const bodyContent = doc.body;

    // Remove potentially dangerous elements
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'style', 'link', 'base'];
    dangerousTags.forEach(tag => {
      const elements = bodyContent.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        if (elements[i] && elements[i].parentNode) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      }
    });

    // Remove event handlers from all elements
    const allElements = bodyContent.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      const attributes = element.attributes;

      for (let j = attributes.length - 1; j >= 0; j--) {
        const attrName = attributes[j].name;

        // Remove event handlers (attributes starting with "on")
        if (attrName.startsWith('on')) {
          element.removeAttribute(attrName);
        }

        // Remove javascript: URLs
        if ((attrName === 'href' || attrName === 'src') && 
            attributes[j].value.toLowerCase().trim().startsWith('javascript:')) {
          element.removeAttribute(attrName);
        }
      }
    }

    // Create a document fragment to hold the sanitized content
    const fragment = document.createDocumentFragment();

    // Clone the sanitized nodes to the fragment
    Array.from(bodyContent.childNodes).forEach(node => {
      fragment.appendChild(node.cloneNode(true));
    });

    return fragment;
  }

  // Function to safely serialize a DOM node to HTML string
  function serializeNodeToHtml(node) {
    // Use XMLSerializer to convert DOM nodes to strings
    const serializer = new XMLSerializer();
    return serializer.serializeToString(node);
  }

  // Function to sanitize HTML (for backward compatibility)
  function sanitizeHtml(html) {
    // Create a temporary container
    const tempContainer = document.createElement('div');

    // Append the sanitized fragment to the container
    tempContainer.appendChild(createSanitizedFragment(html));

    // Use XMLSerializer to safely convert DOM nodes to strings
    // This is still needed for backward compatibility with existing code
    // that expects an HTML string, but we're not using it for rendering
    return Array.from(tempContainer.childNodes)
      .map(serializeNodeToHtml)
      .join('');
  }

  // Function to safely create and append elements
  function createSafeElement(parentElement, tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    parentElement.appendChild(element);
    return element;
  }

  // Function to safely create a link
  function createSafeLink(parentElement, href, text, target) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (target) {
      link.target = target;
    }
    parentElement.appendChild(link);
    return link;
  }

  // Function to safely render markdown content
  function renderSafeMarkdown(container, markdownText) {
    // Clear existing content
    container.textContent = '';

    // Create a container element for the content
    const contentElement = document.createElement('div');

    // Use marked to parse the markdown
    const parsedHtml = marked.parse(markdownText);

    // Create a sanitized document fragment from the parsed HTML
    const sanitizedFragment = createSanitizedFragment(parsedHtml);

    // Append the sanitized fragment directly to the content element
    contentElement.appendChild(sanitizedFragment);

    // Append the content element to the container
    container.appendChild(contentElement);
  }

  // Check if an API key is set and load other settings
  browser.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
    const currentUrl = tabs[0].url;

    browser.storage.sync.get(['openai_api_key', 'openai_organization', 'openai_project', 'saved_summary', 'summary_url']).then(function(result) {
      if (!result.openai_api_key) {
        // Clear existing content
        summaryContent.textContent = '';

        // Create error message with link
        const errorParagraph = createSafeElement(summaryContent, 'p', 'error');
        errorParagraph.textContent = 'Please set your OpenAI API key in the ';
        createSafeLink(errorParagraph, 'settings.html', 'settings', '_blank');
        errorParagraph.appendChild(document.createTextNode('.'));

        showView(summaryView);
      } else if (result.saved_summary && result.summary_url === currentUrl) {
        // If we have a saved summary for the current URL, display it safely
        renderSafeMarkdown(summaryContent, result.saved_summary);
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
          // Clear existing content
          summaryContent.textContent = '';

          // Create error message with link
          const errorParagraph = createSafeElement(summaryContent, 'p', 'error');
          errorParagraph.textContent = 'Please set your OpenAI API key in the ';
          createSafeLink(errorParagraph, 'settings.html', 'settings', '_blank');
          errorParagraph.appendChild(document.createTextNode('.'));

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
              // Parse the Markdown and display it safely
              renderSafeMarkdown(summaryContent, summary);
              showView(summaryView);
            });
          } else {
            console.error('Error:', response ? response.error : 'Unknown error');

            // Clear existing content
            summaryContent.textContent = '';

            // Create error message
            const errorMessage = response ? response.error : 'Unknown error';
            const errorParagraph = createSafeElement(summaryContent, 'p', 'error');
            errorParagraph.textContent = `Error getting summary: ${errorMessage}`;

            showView(summaryView);

            // Clear any saved summary and URL since we have an error
            browser.storage.sync.remove(['saved_summary', 'summary_url']);
          }
        }).catch(function(error) {
          console.error('Error:', error);

          // Clear existing content
          summaryContent.textContent = '';

          // Create error message
          const errorMessage = error.message || 'Unknown error';
          const errorParagraph = createSafeElement(summaryContent, 'p', 'error');
          errorParagraph.textContent = `Error getting summary: ${errorMessage}`;

          showView(summaryView);
        });
      });
    });
  }

  // Function to handle errors and display them to the user
  function handleApiError(error) {
    console.error('Error:', error);

    // Clear existing content
    summaryContent.textContent = '';

    // Create error message
    const errorParagraph = createSafeElement(summaryContent, 'p', 'error');
    errorParagraph.textContent = `Error getting summary: ${error}`;

    showView(summaryView);

    // Clear any saved summary and URL since we have an error
    browser.storage.sync.remove(['saved_summary', 'summary_url']);
  }
});
