// Background script for Article Summarizer extension

// API request queue and rate limiting
const apiRequestQueue = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests
let lastRequestTime = 0;

// Listen for installation
browser.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Open the settings page on installation
    browser.tabs.create({
      url: 'settings.html',
    }).then(tab => {
      console.log(`Opened settings page in new tab: ${tab.id}`);
    });
  }
});

// Process the API request queue
function processQueue() {
  if (apiRequestQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const currentTime = Date.now();
  const timeToWait = Math.max(0,
      MIN_REQUEST_INTERVAL - (currentTime - lastRequestTime));

  setTimeout(() => {
    if (apiRequestQueue.length === 0) {
      isProcessingQueue = false;
      return;
    }

    const request = apiRequestQueue.shift();
    lastRequestTime = Date.now();

    makeApiRequest(request.params, request.sendResponse);
  }, timeToWait);
}

// Make the actual API request
function makeApiRequest(params, sendResponse) {
  const {url, apiKey, organization, project, retryCount = 0, useClaude, anthropicApiKey} = params;
  const prompt = `Summarise the following article ${url}.
  Remember to not include any requests for clarification or offers for more information,
  since this is a one-way interaction with no opportunity for follow-up.
  When summarizing, if the article is in Romanian, use the same language.
  If the article is in English, or another language, use English. Instead of providing the response in Markdown format, use HTML tags.
  Please keep going until the user’s query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
  Use only the context of the article for summarization. DO NOT use your pre-existing knowledge to summarize the article.`;
  const maxRetries = 3;

  // Check which API to use
  if (useClaude) {
    makeAnthropicRequest(url, anthropicApiKey, prompt, retryCount, maxRetries, sendResponse);
  } else {
    makeOpenAIRequest(url, apiKey, organization, project, prompt, retryCount, maxRetries, sendResponse);
  }
}

// Make a request to OpenAI API
function makeOpenAIRequest(url, apiKey, organization, project, prompt, retryCount, maxRetries, sendResponse) {
  // Log API key information (safely)
  console.log(`Using OpenAI API key: ${apiKey ? apiKey.substring(0, 3) + '...' +
      apiKey.substring(apiKey.length - 4) : 'undefined'}`);
  console.log(`API key length: ${apiKey ? apiKey.length : 0}`);
  if (organization) console.log(`Using organization: ${organization}`);
  if (project) console.log(`Using project: ${project}`);

  // Basic validation for API key format
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.error(
        'Invalid API key format. OpenAI API keys should start with "sk-"');
    sendResponse({
      success: false,
      error: 'Invalid API key format. Please check your OpenAI API key in settings.',
    });
    return;
  }

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // Add organization and project headers if provided
  if (organization) {
    headers['OpenAI-Organization'] = organization;
  }

  if (project) {
    headers['OpenAI-Project'] = project;
  }

  fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: 'gpt-4.1',
      input: prompt,
    }),
  }).then(async response => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';

      // Log detailed error information
      console.error('OpenAI API request failed:', {
        status: response.status,
        message: errorMessage,
        data: errorData,
      });

      // Handle different error types
      if (response.status === 401) {
        // Authentication error - invalid API key
        console.error('Authentication failed. Invalid OpenAI API key.');
        sendResponse({
          success: false,
          error: 'Authentication failed. Please check your OpenAI API key in settings.',
        });
        return;
      } else if (response.status === 429 && retryCount < maxRetries) {
        // Too Many Requests error - retry with exponential backoff
        console.log(`Rate limited (429). Retrying in ${MIN_REQUEST_INTERVAL *
        (retryCount + 1)}ms... (Attempt ${retryCount + 1}/${maxRetries})`);

        // Add back to queue with increased retry count
        setTimeout(() => {
          apiRequestQueue.push({
            params: {
              url, 
              apiKey, 
              organization, 
              project, 
              retryCount: retryCount + 1,
              useClaude: false
            },
            sendResponse,
          });

          if (!isProcessingQueue) {
            processQueue();
          }
        }, MIN_REQUEST_INTERVAL * (retryCount + 1));

        return;
      } else if (response.status === 400) {
        // Bad request - could be an issue with the prompt or other parameters
        console.error('Bad request. Check API parameters.');
        throw new Error(
            `OpenAI API request failed: ${errorMessage} (Status: 400). This might be an issue with the request format.`);
      }

      // For other errors or if we've exceeded max retries
      throw new Error(
          `OpenAI API request failed: ${errorMessage} (Status: ${response.status})`);
    }
    return response.json();
  }).then(data => {
    if (data) {
      sendResponse({
        success: true,
        data: data,
      });
    }

    // Process next request in queue
    processQueue();
  }).catch(error => {
    console.error('OpenAI Error:', error);
    sendResponse({
      success: false,
      error: error.message,
    });

    // Process next request in queue
    processQueue();
  });
}

// Make a request to Anthropic API
function makeAnthropicRequest(url, apiKey, prompt, retryCount, maxRetries, sendResponse) {
  // Log API key information (safely)
  console.log(`Using Anthropic API key: ${apiKey ? apiKey.substring(0, 6) + '...' +
      apiKey.substring(apiKey.length - 4) : 'undefined'}`);
  console.log(`API key length: ${apiKey ? apiKey.length : 0}`);

  // Basic validation for API key format
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    console.error(
        'Invalid API key format. Anthropic API keys should start with "sk-ant-"');
    sendResponse({
      success: false,
      error: 'Invalid API key format. Please check your Anthropic API key in settings.',
    });
    return;
  }

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  };

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ]
    }),
  }).then(async response => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';

      // Log detailed error information
      console.error('Anthropic API request failed:', {
        status: response.status,
        message: errorMessage,
        data: errorData,
      });

      // Handle different error types
      if (response.status === 401) {
        // Authentication error - invalid API key
        console.error('Authentication failed. Invalid Anthropic API key.');
        sendResponse({
          success: false,
          error: 'Authentication failed. Please check your Anthropic API key in settings.',
        });
        return;
      } else if (response.status === 429 && retryCount < maxRetries) {
        // Too Many Requests error - retry with exponential backoff
        console.log(`Rate limited (429). Retrying in ${MIN_REQUEST_INTERVAL *
        (retryCount + 1)}ms... (Attempt ${retryCount + 1}/${maxRetries})`);

        // Add back to queue with increased retry count
        setTimeout(() => {
          apiRequestQueue.push({
            params: {
              url, 
              anthropicApiKey: apiKey, 
              retryCount: retryCount + 1,
              useClaude: true
            },
            sendResponse,
          });

          if (!isProcessingQueue) {
            processQueue();
          }
        }, MIN_REQUEST_INTERVAL * (retryCount + 1));

        return;
      } else if (response.status === 400) {
        // Bad request - could be an issue with the prompt or other parameters
        console.error('Bad request. Check API parameters.');
        throw new Error(
            `Anthropic API request failed: ${errorMessage} (Status: 400). This might be an issue with the request format.`);
      }

      // For other errors or if we've exceeded max retries
      throw new Error(
          `Anthropic API request failed: ${errorMessage} (Status: ${response.status})`);
    }
    return response.json();
  }).then(data => {
    if (data) {
      // Convert Anthropic response format to match OpenAI format
      // Anthropic returns data.content[0].text, we need to convert to data.output[0].content[0].text
      const convertedData = {
        output: [{
          content: [{
            text: data.content[0].text
          }]
        }]
      };

      sendResponse({
        success: true,
        data: convertedData,
      });
    }

    // Process next request in queue
    processQueue();
  }).catch(error => {
    console.error('Anthropic Error:', error);
    sendResponse({
      success: false,
      error: error.message,
    });

    // Process next request in queue
    processQueue();
  });
}

// Handle messages from popup or content scripts
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'summarizeArticle') {
    // Add request to queue
    apiRequestQueue.push({
      params: request.params,
      sendResponse,
    });

    // Start processing queue if not already processing
    if (!isProcessingQueue) {
      processQueue();
    }

    // Return true to indicate we'll respond asynchronously
    return true;
  }
});
