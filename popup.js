document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const addressInput = document.getElementById('address');
  const saveBtn = document.getElementById('saveBtn');
  const statusMessage = document.getElementById('statusMessage');
  const completedCountSpan = document.getElementById('completedCount');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  
  const customKeyInput = document.getElementById('customKey');
  const customValueInput = document.getElementById('customValue');
  const addCustomBtn = document.getElementById('addCustomBtn');
  const customFieldsList = document.getElementById('customFieldsList');

  let currentCustomFields = {};

  const renderCustomFields = () => {
    customFieldsList.innerHTML = '';
    for (const [key, value] of Object.entries(currentCustomFields)) {
      const fieldDiv = document.createElement('div');
      fieldDiv.style.display = 'flex';
      fieldDiv.style.justifyContent = 'space-between';
      fieldDiv.style.marginBottom = '5px';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = `${key}: ${value}`;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'X';
      removeBtn.style.padding = '2px 5px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.onclick = () => {
        delete currentCustomFields[key];
        saveCustomFields();
      };

      fieldDiv.appendChild(textSpan);
      fieldDiv.appendChild(removeBtn);
      customFieldsList.appendChild(fieldDiv);
    }
  };

  const saveCustomFields = () => {
    chrome.storage.local.set({ customFields: currentCustomFields }, () => {
      renderCustomFields();
    });
  };

  // Load existing data
  chrome.storage.local.get(['autoFillData', 'completedForms', 'customFields'], (result) => {
    if (result.autoFillData) {
      nameInput.value = result.autoFillData.name || '';
      emailInput.value = result.autoFillData.email || '';
      phoneInput.value = result.autoFillData.phone || '';
      addressInput.value = result.autoFillData.address || '';
    }
    
    if (result.completedForms) {
      completedCountSpan.textContent = result.completedForms.length;
    }

    if (result.customFields) {
      currentCustomFields = result.customFields;
      renderCustomFields();
    }
  });

  // Save data
  saveBtn.addEventListener('click', () => {
    const data = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim()
    };

    chrome.storage.local.set({ autoFillData: data }, () => {
      statusMessage.classList.remove('hidden');
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 3000);
    });
  });

  // Add custom field
  addCustomBtn.addEventListener('click', () => {
    const key = customKeyInput.value.trim();
    const value = customValueInput.value.trim();
    if (key && value) {
      currentCustomFields[key] = value;
      saveCustomFields();
      customKeyInput.value = '';
      customValueInput.value = '';
    }
  });


  // Clear completed history
  clearCompletedBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your form history?")) {
      chrome.storage.local.set({ completedForms: [] }, () => {
        completedCountSpan.textContent = "0";
      });
    }
  });
});
