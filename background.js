// Background script for managing extension state if needed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Google Forms Auto-Fill Extension Installed");
});

// We can listen for messages from the content script if we need to do anything special
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "formSubmitted") {
    console.log("Form submitted: ", request.formId);
    
    // Save to completed forms list
    chrome.storage.local.get({completedForms: []}, (data) => {
      let completedForms = data.completedForms;
      if (!completedForms.includes(request.formId)) {
        completedForms.push(request.formId);
        chrome.storage.local.set({completedForms: completedForms}, () => {
          sendResponse({status: "success"});
        });
      } else {
        sendResponse({status: "already_recorded"});
      }
    });
    
    // Return true to indicate we will respond asynchronously
    return true; 
  }
});
