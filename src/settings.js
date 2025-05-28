document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const apiKeyInput = document.getElementById('api-key');
  const apiOrgInput = document.getElementById('api-org');
  const apiProjectInput = document.getElementById('api-project');
  const saveButton = document.getElementById('save-btn');
  const validateButton = document.getElementById('validate-btn');
  const removeButton = document.getElementById('remove-btn');
  const statusMessage = document.getElementById('status-message');
  const apiStatusText = document.getElementById('api-status-text');
  const statusIndicator = document.querySelector('.status-indicator');

  // Load saved an API key and other settings if they exist
  browser.storage.sync.get(['openai_api_key', 'api_key_status', 'openai_organization', 'openai_project']).then(function(result) {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;

      // Update the API status indicator if we have a stored status
      if (result.api_key_status) {
        updateApiStatusIndicator(result.api_key_status);
      }
    }

    // Load organization and project if they exist
    if (result.openai_organization) {
      apiOrgInput.value = result.openai_organization;
    }

    if (result.openai_project) {
      apiProjectInput.value = result.openai_project;
    }
  });

  // Save API key when the save button is clicked
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter a valid API key.', 'error');
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format. OpenAI API keys should start with "sk-".', 'error');
      return;
    }

    // Get organization and project values
    const organization = apiOrgInput.value.trim();
    const project = apiProjectInput.value.trim();

    // Save to browser storage
    browser.storage.sync.set({
      openai_api_key: apiKey,
      openai_organization: organization,
      openai_project: project
    }).then(function() {
      showStatus('Settings saved successfully!', 'success');

      // Test the API key with a simple request
      testApiKey(apiKey);
    }).catch(function(error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    });
  });

  // Add event listener for validate button
  validateButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key to validate.', 'error');
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format. OpenAI API keys should start with "sk-".', 'error');
      updateApiStatusIndicator('invalid');
      return;
    }

    // Show loading status
    showStatus('Validating API key...', 'info');
    updateApiStatusIndicator('validating');

    // Test the API key
    testApiKey(apiKey);
  });

  // Add event listener for remove button
  removeButton.addEventListener('click', function() {
    // Remove API key and other settings from browser storage
    browser.storage.sync.remove(['openai_api_key', 'api_key_status', 'openai_organization', 'openai_project']).then(function() {
      // Clear the input fields
      apiKeyInput.value = '';
      apiOrgInput.value = '';
      apiProjectInput.value = '';

      // Update the status indicator
      updateApiStatusIndicator('unknown');

      // Show success message
      showStatus('Settings removed successfully!', 'success');
    }).catch(function(error) {
      showStatus('Error removing settings: ' + error.message, 'error');
    });
  });

  // Function to test if the API key is valid
  function testApiKey(apiKey) {
    // Simple request to check if the API key is valid
    fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API key validation failed: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('API key validated successfully');
      showStatus('API key validated successfully!', 'success');
      updateApiStatusIndicator('valid');

      // Store the API key status
      browser.storage.sync.set({api_key_status: 'valid'});
    })
    .catch(error => {
      console.error('Error validating API key:', error);
      showStatus('Warning: Your API key may not be valid. Please check it.', 'error');
      updateApiStatusIndicator('invalid');

      // Store the API key status
      browser.storage.sync.set({api_key_status: 'invalid'});
    });
  }

  // Function to update the API status indicator
  function updateApiStatusIndicator(status) {
    // Remove all existing classes
    statusIndicator.className = 'status-indicator';

    // Add the appropriate class based on status
    switch(status) {
      case 'valid':
        statusIndicator.classList.add('valid');
        apiStatusText.textContent = 'API Key Status: Valid';
        break;
      case 'invalid':
        statusIndicator.classList.add('invalid');
        apiStatusText.textContent = 'API Key Status: Invalid';
        break;
      case 'validating':
        statusIndicator.classList.add('validating');
        apiStatusText.textContent = 'API Key Status: Validating...';
        break;
      default:
        apiStatusText.textContent = 'API Key Status: Unknown';
    }
  }

  // Function to show status messages
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type; // 'success' or 'error'
    statusMessage.classList.remove('hidden');

    // Hide the message after 3 seconds
    setTimeout(function() {
      statusMessage.classList.add('hidden');
    }, 3000);
  }
});
