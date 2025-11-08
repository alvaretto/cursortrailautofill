const binInput = document.getElementById('bin');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const savedBinDiv = document.getElementById('savedBin');
const savedBinValue = document.getElementById('savedBinValue');

const DEFAULT_BIN = '625967xxxxxxxxxx';

chrome.storage.local.get(['savedBin'], function(result) {
  if (result.savedBin) {
    binInput.value = result.savedBin;
  } else {
    binInput.value = DEFAULT_BIN;
  }
  savedBinDiv.style.display = 'block';
  savedBinValue.textContent = binInput.value;
});

generateBtn.addEventListener('click', async () => {
  const bin = binInput.value.trim();
  
  if (!bin) {
    updateStatus('Please enter a BIN number', 'error');
    return;
  }
  
  if (bin.length < 6) {
    updateStatus('BIN must be at least 6 digits', 'error');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('checkout.stripe.com')) {
    updateStatus('❌ Please open a Stripe checkout page first!', 'error');
    return;
  }
  
  const stripeTabId = tab.id;
  
  generateBtn.disabled = true;
  updateStatus('Generating cards from AKR Gen...', 'loading');
  
  chrome.storage.local.set({ 
    savedBin: bin,
    stripeTabId: stripeTabId
  }, function() {
    savedBinDiv.style.display = 'block';
    savedBinValue.textContent = bin;
  });
  
  chrome.runtime.sendMessage({
    action: 'generateCards',
    bin: bin,
    stripeTabId: stripeTabId
  }, (response) => {
    generateBtn.disabled = false;
    
    if (response.success) {
      updateStatus(`✅ Generated ${response.cards.length} cards! Filling form...`, 'success');
      setTimeout(() => {
        updateStatus('✅ Auto-filling Stripe page...', 'success');
      }, 1000);
    } else {
      updateStatus('❌ Failed to generate cards. Try again.', 'error');
    }
  });
});

clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['savedBin', 'generatedCards'], function() {
    binInput.value = '';
    savedBinDiv.style.display = 'none';
    updateStatus('Cleared saved data', 'success');
  });
});

function updateStatus(message, type = '') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatus') {
    updateStatus(request.message, request.type);
  }
});

