// Listen for messages from the popup
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getArticleContent") {
    const articleContent = extractArticleContent();
    sendResponse({content: articleContent});
  }
  return true; // Required for asynchronous response
});

// Function to extract article content from the page
function extractArticleContent() {
  // Try to find the main article content using common selectors
  const selectors = [
    'article',
    '[role="article"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    'main',
    '#content',
    '#main'
  ];

  let content = '';

  // Try each selector until we find content
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Use the first matching element with the most text content
      let bestElement = elements[0];
      let maxLength = bestElement.textContent.length;

      for (let i = 1; i < elements.length; i++) {
        const length = elements[i].textContent.length;
        if (length > maxLength) {
          maxLength = length;
          bestElement = elements[i];
        }
      }

      content = bestElement.textContent.trim();
      break;
    }
  }

  // If no content found with selectors, use a fallback method
  if (!content) {
    // Get all paragraphs
    const paragraphs = document.querySelectorAll('p');

    // Filter out short paragraphs (likely not part of the main content)
    const contentParagraphs = Array.from(paragraphs)
      .filter(p => p.textContent.length > 50)
      .map(p => p.textContent.trim());

    content = contentParagraphs.join('\n\n');
  }

  // If still no content, get all text from the body
  if (!content) {
    content = document.body.textContent.trim();
  }

  // Limit content length to avoid issues with API limits
  const maxLength = 4000;
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }

  return content;
}
