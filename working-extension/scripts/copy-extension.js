import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Files to copy to dist
const filesToCopy = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js'
];

// Copy extension files
filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
});

// Copy data folder
const dataSourceDir = path.join(sourceDir, 'data');
const dataDestDir = path.join(distDir, 'data');
if (fs.existsSync(dataSourceDir)) {
  if (!fs.existsSync(dataDestDir)) {
    fs.mkdirSync(dataDestDir, { recursive: true });
  }
  
  const dataFiles = fs.readdirSync(dataSourceDir);
  dataFiles.forEach(file => {
    const sourcePath = path.join(dataSourceDir, file);
    const destPath = path.join(dataDestDir, file);
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied data/${file}`);
    }
  });
} else {
  console.warn('Data directory not found');
}

// Always overwrite popup.html with React UI
const popupPath = path.join(distDir, 'popup.html');
const popupContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeceptiTech</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: 450px; 
      height: 700px; 
      margin: 0; 
      padding: 0;
      overflow: hidden;
      font-family: Inter, Poppins, system-ui, -apple-system, sans-serif;
    }
    #root {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  </style>
  <link rel="stylesheet" href="assets/main.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="assets/main.js"></script>
</body>
</html>`;

fs.writeFileSync(popupPath, popupContent);
console.log('✓ Updated popup.html with React UI');

// Create popup.js if it doesn't exist (no longer needed, using React UI)
const popupJsPath = path.join(distDir, 'popup.js');
if (!fs.existsSync(popupJsPath)) {
  const popupJsContent = `// Popup.js is no longer used - React UI handles everything
// This file is kept for compatibility
document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scanBtn');
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  
  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
  }
  
  function showResults(patterns) {
    if (!patterns || patterns.length === 0) {
      resultsDiv.innerHTML = '<div class="status info">No dark patterns detected on this page.</div>';
      return;
    }
    
    const html = patterns.map(pattern => \`
      <div class="pattern">
        <div class="pattern-category">\${pattern.category}</div>
        <div class="pattern-snippet">\${pattern.snippet}</div>
      </div>
    \`).join('');
    
    resultsDiv.innerHTML = html;
  }
  
  scanBtn.addEventListener('click', function() {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning...';
    showStatus('Scanning page for dark patterns...', 'info');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs[0]) {
        showStatus('No active tab found', 'error');
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Scan Current Page';
        return;
      }
      
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      
      // Check if URL is valid (not chrome:// or extension pages)
      if (tabUrl && (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('moz-extension://'))) {
        showStatus('Cannot scan Chrome/extension pages', 'error');
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Scan Current Page';
        return;
      }
      
      // Send message to content script with error handling
      try {
        chrome.tabs.sendMessage(tabId, { type: 'PERFORM_SCAN' }, function(response) {
          // Check for errors first
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            console.error('Popup error:', errorMsg);
            
            // If content script isn't loaded, try to inject it
            if (errorMsg.includes('Could not establish connection') || errorMsg.includes('Receiving end does not exist')) {
              showStatus('Content script not loaded. Please refresh the page and try again.', 'error');
            } else {
              showStatus('Error: ' + errorMsg, 'error');
            }
          } else if (response && response.success) {
            if (response.patterns && response.patterns.length > 0) {
              showResults(response.patterns);
              showStatus(\`Found \${response.count} dark pattern(s)\`, 'success');
            } else {
              showStatus('No dark patterns detected on this page', 'success');
              resultsDiv.innerHTML = '<div class="status info">No dark patterns detected on this page.</div>';
            }
          } else if (response && response.error) {
            showStatus('Error: ' + response.error, 'error');
          } else {
            showStatus('No patterns detected', 'success');
          }
          
          scanBtn.disabled = false;
          scanBtn.textContent = '🔍 Scan Current Page';
        });
      } catch (error) {
        console.error('Error sending message:', error);
        showStatus('Error: ' + error.message, 'error');
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Scan Current Page';
      }
    });
  });
});`;
  
  fs.writeFileSync(popupJsPath, popupJsContent);
  console.log('Created popup.js');
}

console.log('Extension build complete!');
