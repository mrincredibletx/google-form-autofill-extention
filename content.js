// This script runs on docs.google.com/forms pages

const getFormId = () => {
  // Google Form URLs look like docs.google.com/forms/d/e/FORM_ID/viewform
  const match = window.location.pathname.match(/\/d\/(e\/[a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return window.location.pathname; // fallback
};

const formId = getFormId();

const checkDoubleFill = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get({completedForms: []}, (data) => {
      if (data.completedForms.includes(formId)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

const showWarningOverlay = () => {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = 'sans-serif';

  const message = document.createElement('h1');
  message.textContent = 'You have already filled this form!';
  message.style.color = '#d93025';
  
  const subtext = document.createElement('p');
  subtext.textContent = 'Our records indicate this form was previously submitted.';
  subtext.style.color = '#3c4043';
  subtext.style.fontSize = '18px';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Proceed Anyway';
  closeBtn.style.marginTop = '20px';
  closeBtn.style.padding = '10px 20px';
  closeBtn.style.backgroundColor = '#1a73e8';
  closeBtn.style.color = 'white';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  overlay.appendChild(message);
  overlay.appendChild(subtext);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

const fillForm = (autoFillData, customFields) => {
  if (!autoFillData && !customFields) return;

  // Google Forms renders questions in specific divs.
  // The structure often has aria-level="3" for question titles, or spans containing the text.
  // Finding the related input is tricky as class names change, but inputs are usually type="text" or email within the same container.

  const questions = document.querySelectorAll('div[role="listitem"]');
  
  questions.forEach((q) => {
    const titleEl = q.querySelector('div[role="heading"]');
    if (!titleEl) return;
    
    const titleText = titleEl.textContent.toLowerCase();
    
    // Find the input field within this question
    const input = q.querySelector('input[type="text"], input[type="email"], input[type="tel"]');
    const textarea = q.querySelector('textarea');
    
    const field = input || textarea;
    if (!field) return;

    // Check if the title contains keywords
    let filled = false;
    if (titleText.includes('name')) {
      if (autoFillData?.name && !field.value) { fillField(field, autoFillData.name); filled = true; }
    } else if (titleText.includes('email')) {
      if (autoFillData?.email && !field.value) { fillField(field, autoFillData.email); filled = true; }
    } else if (titleText.includes('phone') || titleText.includes('mobile')) {
      if (autoFillData?.phone && !field.value) { fillField(field, autoFillData.phone); filled = true; }
    } else if (titleText.includes('address')) {
      if (autoFillData?.address && !field.value) { fillField(field, autoFillData.address); filled = true; }
    }
    
    // Check custom fields if not filled
    if (!filled && customFields) {
      for (const [key, val] of Object.entries(customFields)) {
        if (titleText.includes(key.toLowerCase()) && !field.value) {
          fillField(field, val);
          filled = true;
          break;
        }
      }
    }
  });
};

const fillField = (element, value) => {
  // Google Forms sometimes requires dispatching events to register the change
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // To handle Material Design text fields properly we sometimes need focus/blur
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
};

const observeSubmission = () => {
  // Try to hook into the form submit event
  // Google Forms uses a <form> element
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', () => {
      // Send message to background to save this form
      chrome.runtime.sendMessage({ action: "formSubmitted", formId: formId });
    });
  } else {
    // If we are on the formResponse page (after submission)
    if (window.location.pathname.includes('/formResponse')) {
      chrome.runtime.sendMessage({ action: "formSubmitted", formId: formId });
    }
  }
};

const init = async () => {
  // 1. Check for double filling
  const isFilled = await checkDoubleFill();
  if (isFilled && !window.location.pathname.includes('/formResponse')) {
    showWarningOverlay();
  }

  // 2. Fetch data and auto-fill if on a viewform page
  if (window.location.pathname.includes('/viewform')) {
    chrome.storage.local.get(['autoFillData', 'customFields'], (result) => {
      if (result.autoFillData || result.customFields) {
        // Slight delay to ensure DOM is fully rendered
        setTimeout(() => fillForm(result.autoFillData, result.customFields), 1000);
      }
    });
  }

  // 3. Observe for submission
  observeSubmission();
};

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
