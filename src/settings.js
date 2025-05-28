document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const apiKeyInput = document.getElementById('api-key');
  const apiOrgInput = document.getElementById('api-org');
  const apiProjectInput = document.getElementById('api-project');
  const anthropicApiKeyInput = document.getElementById('anthropic-api-key');
  const useClaudeCheckbox = document.getElementById('use-claude');
  const openaiSettings = document.getElementById('openai-settings');
  const anthropicSettings = document.getElementById('anthropic-settings');
  const openaiInfo = document.getElementById('openai-info');
  const openaiSteps = document.getElementById('openai-steps');
  const anthropicInfo = document.getElementById('anthropic-info');
  const anthropicSteps = document.getElementById('anthropic-steps');
  const saveButton = document.getElementById('save-btn');
  const validateButton = document.getElementById('validate-btn');
  const removeButton = document.getElementById('remove-btn');
  const statusMessage = document.getElementById('status-message');
  const apiStatusText = document.getElementById('api-status-text');
  const statusIndicator = document.querySelector('.status-indicator');

  // Function to toggle visibility of settings based on selected provider
  function toggleProviderSettings() {
    if (useClaudeCheckbox.checked) {
      openaiSettings.style.display = 'none';
      anthropicSettings.style.display = 'block';
      openaiInfo.style.display = 'none';
      openaiSteps.style.display = 'none';
      anthropicInfo.style.display = 'block';
      anthropicSteps.style.display = 'block';
    } else {
      openaiSettings.style.display = 'block';
      anthropicSettings.style.display = 'none';
      openaiInfo.style.display = 'block';
      openaiSteps.style.display = 'block';
      anthropicInfo.style.display = 'none';
      anthropicSteps.style.display = 'none';
    }
  }

  // Add event listener for the checkbox
  useClaudeCheckbox.addEventListener('change', toggleProviderSettings);

  // Load saved settings if they exist
  browser.storage.sync.get([
    'openai_api_key', 
    'api_key_status', 
    'openai_organization', 
    'openai_project',
    'anthropic_api_key',
    'anthropic_api_key_status',
    'use_claude'
  ]).then(function(result) {
    // Load OpenAI settings
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

    // Load Anthropic settings
    if (result.anthropic_api_key) {
      anthropicApiKeyInput.value = result.anthropic_api_key;
    }

    // Load provider preference
    if (result.use_claude) {
      useClaudeCheckbox.checked = result.use_claude;
    }

    // Initialize UI based on saved provider preference
    toggleProviderSettings();
  });

  // Save API key when the save button is clicked
  saveButton.addEventListener('click', function() {
    const isUsingClaude = useClaudeCheckbox.checked;
    const settings = {};

    if (isUsingClaude) {
      // Save Anthropic settings
      const anthropicApiKey = anthropicApiKeyInput.value.trim();

      if (!anthropicApiKey) {
        showStatus('Please enter a valid Anthropic API key.', 'error');
        return;
      }

      // Validate Anthropic API key format (typically starts with 'sk-ant-')
      if (!anthropicApiKey.startsWith('sk-ant-')) {
        showStatus('Invalid API key format. Anthropic API keys should start with "sk-ant-".', 'error');
        return;
      }

      settings.anthropic_api_key = anthropicApiKey;
      settings.use_claude = true;

      // Test the Anthropic API key
      testAnthropicApiKey(anthropicApiKey);
    } else {
      // Save OpenAI settings
      const openaiApiKey = apiKeyInput.value.trim();

      if (!openaiApiKey) {
        showStatus('Please enter a valid OpenAI API key.', 'error');
        return;
      }

      // Validate OpenAI API key format
      if (!openaiApiKey.startsWith('sk-')) {
        showStatus('Invalid API key format. OpenAI API keys should start with "sk-".', 'error');
        return;
      }

      // Get organization and project values
      const organization = apiOrgInput.value.trim();
      const project = apiProjectInput.value.trim();

      settings.openai_api_key = openaiApiKey;
      settings.openai_organization = organization;
      settings.openai_project = project;
      settings.use_claude = false;

      // Test the OpenAI API key
      testOpenAIApiKey(openaiApiKey);
    }

    // Save to browser storage
    browser.storage.sync.set(settings).then(function() {
      showStatus('Settings saved successfully!', 'success');
    }).catch(function(error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    });
  });

  // Add event listener for validate button
  validateButton.addEventListener('click', function() {
    const isUsingClaude = useClaudeCheckbox.checked;

    if (isUsingClaude) {
      const anthropicApiKey = anthropicApiKeyInput.value.trim();

      if (!anthropicApiKey) {
        showStatus('Please enter an Anthropic API key to validate.', 'error');
        return;
      }

      // Validate Anthropic API key format
      if (!anthropicApiKey.startsWith('sk-ant-')) {
        showStatus('Invalid API key format. Anthropic API keys should start with "sk-ant-".', 'error');
        updateApiStatusIndicator('invalid');
        return;
      }

      // Show loading status
      showStatus('Validating Anthropic API key...', 'info');
      updateApiStatusIndicator('validating');

      // Test the Anthropic API key
      testAnthropicApiKey(anthropicApiKey);
    } else {
      const openaiApiKey = apiKeyInput.value.trim();

      if (!openaiApiKey) {
        showStatus('Please enter an OpenAI API key to validate.', 'error');
        return;
      }

      // Validate OpenAI API key format
      if (!openaiApiKey.startsWith('sk-')) {
        showStatus('Invalid API key format. OpenAI API keys should start with "sk-".', 'error');
        updateApiStatusIndicator('invalid');
        return;
      }

      // Show loading status
      showStatus('Validating OpenAI API key...', 'info');
      updateApiStatusIndicator('validating');

      // Test the OpenAI API key
      testOpenAIApiKey(openaiApiKey);
    }
  });

  // Add event listener for remove button
  removeButton.addEventListener('click', function() {
    const isUsingClaude = useClaudeCheckbox.checked;

    if (isUsingClaude) {
      // Remove Anthropic settings
      browser.storage.sync.remove(['anthropic_api_key', 'anthropic_api_key_status']).then(function() {
        // Clear the input field
        anthropicApiKeyInput.value = '';

        // Update the status indicator
        updateApiStatusIndicator('unknown');

        // Show success message
        showStatus('Anthropic settings removed successfully!', 'success');
      }).catch(function(error) {
        showStatus('Error removing settings: ' + error.message, 'error');
      });
    } else {
      // Remove OpenAI settings
      browser.storage.sync.remove(['openai_api_key', 'api_key_status', 'openai_organization', 'openai_project']).then(function() {
        // Clear the input fields
        apiKeyInput.value = '';
        apiOrgInput.value = '';
        apiProjectInput.value = '';

        // Update the status indicator
        updateApiStatusIndicator('unknown');

        // Show success message
        showStatus('OpenAI settings removed successfully!', 'success');
      }).catch(function(error) {
        showStatus('Error removing settings: ' + error.message, 'error');
      });
    }
  });

  // Function to test if the OpenAI API key is valid
  function testOpenAIApiKey(apiKey) {
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
      console.log('OpenAI API key validated successfully');
      showStatus('OpenAI API key validated successfully!', 'success');
      updateApiStatusIndicator('valid');

      // Store the API key status
      browser.storage.sync.set({api_key_status: 'valid'});
    })
    .catch(error => {
      console.error('Error validating OpenAI API key:', error);
      showStatus('Warning: Your OpenAI API key may not be valid. Please check it.', 'error');
      updateApiStatusIndicator('invalid');

      // Store the API key status
      browser.storage.sync.set({api_key_status: 'invalid'});
    });
  }

  // Function to test if the Anthropic API key is valid
  function testAnthropicApiKey(apiKey) {
    // Simple request to check if the API key is valid
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API key validation failed: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Anthropic API key validated successfully');
      showStatus('Anthropic API key validated successfully!', 'success');
      updateApiStatusIndicator('valid');

      // Store the API key status
      browser.storage.sync.set({anthropic_api_key_status: 'valid'});
    })
    .catch(error => {
      console.error('Error validating Anthropic API key:', error);
      showStatus('Warning: Your Anthropic API key may not be valid. Please check it.', 'error');
      updateApiStatusIndicator('invalid');

      // Store the API key status
      browser.storage.sync.set({anthropic_api_key_status: 'invalid'});
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
