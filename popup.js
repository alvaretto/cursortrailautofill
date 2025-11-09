const DEFAULT_BIN = '552461';

let binInput, generateBtn, clearBtn, statusDiv, savedBinDiv, savedBinValue, generateMethodSelect;
let precardBinInput, generatePrecardsBtn, clearPrecardsBtn, precardStatusDiv, precardsList, precardMethodSelect;
let tabBtns, tabContents;

document.addEventListener('DOMContentLoaded', function() {
  binInput = document.getElementById('bin');
  generateBtn = document.getElementById('generateBtn');
  clearBtn = document.getElementById('clearBtn');
  statusDiv = document.getElementById('status');
  savedBinDiv = document.getElementById('savedBin');
  savedBinValue = document.getElementById('savedBinValue');
  generateMethodSelect = document.getElementById('generateMethod');
  
  precardBinInput = document.getElementById('precardBin');
  generatePrecardsBtn = document.getElementById('generatePrecardsBtn');
  clearPrecardsBtn = document.getElementById('clearPrecardsBtn');
  precardStatusDiv = document.getElementById('precardStatus');
  precardsList = document.getElementById('precardsList');
  precardMethodSelect = document.getElementById('precardMethod');
  
  tabBtns = document.querySelectorAll('.tab-btn');
  tabContents = document.querySelectorAll('.tab-content');
  
  initializeTabs();
  initializeGenerateTab();
  initializePrecardsTab();
  loadInitialData();
});

function initializeTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      btn.classList.add('active');
      
      if (tabName === 'generate') {
        document.getElementById('generateTab').classList.add('active');
      } else if (tabName === 'precards') {
        document.getElementById('precardsTab').classList.add('active');
        loadPrecards();
      }
    });
  });
}

function cleanBin(bin) {
  return bin.replace(/x/gi, '').replace(/\s+/g, '').trim();
}

function loadInitialData() {
  chrome.storage.local.get(['defaultbincursorvo1', 'precardBin'], function(result) {
    if (result.defaultbincursorvo1) {
      binInput.value = result.defaultbincursorvo1;
    } else {
      binInput.value = DEFAULT_BIN;
    }
    savedBinDiv.style.display = 'block';
    savedBinValue.textContent = binInput.value;
    
    if (result.precardBin) {
      precardBinInput.value = result.precardBin;
    } else {
      precardBinInput.value = DEFAULT_BIN;
    }
  });
}

function initializeGenerateTab() {
  generateBtn.addEventListener('click', async () => {
  const bin = cleanBin(binInput.value);
  
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
  
  const method = generateMethodSelect.value;
  
  generateBtn.disabled = true;
  updateStatus(method === 'luhn' ? 'Generating cards with Luhn...' : 'Generating cards from API...', 'loading');
  
  chrome.storage.local.set({ 
    defaultbincursorvo1: bin,
    stripeTabId: stripeTabId
  }, function() {
    savedBinDiv.style.display = 'block';
    savedBinValue.textContent = bin;
  });
  
  chrome.runtime.sendMessage({
    action: 'generateCards',
    bin: bin,
    method: method,
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
    chrome.storage.local.remove(['defaultbincursorvo1', 'generatedCards'], function() {
      binInput.value = '';
      savedBinDiv.style.display = 'none';
      updateStatus('Cleared saved data', 'success');
    });
  });
}

function updateStatus(message, type = '') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
}

function initializePrecardsTab() {
  generatePrecardsBtn.addEventListener('click', async () => {
    const bin = cleanBin(precardBinInput.value);
    
    if (!bin) {
      updatePrecardStatus('Please enter a BIN number', 'error');
      return;
    }
    
    if (bin.length < 6) {
      updatePrecardStatus('BIN must be at least 6 digits', 'error');
      return;
    }
    
    const method = precardMethodSelect.value;
    
    generatePrecardsBtn.disabled = true;
    updatePrecardStatus(method === 'luhn' ? 'Generating 10 pre-cards with Luhn...' : 'Generating 10 pre-cards from API...', 'loading');
    
    chrome.storage.local.set({ precardBin: bin });
    
    chrome.runtime.sendMessage({
      action: 'generatePrecards',
      bin: bin,
      method: method
    }, (response) => {
      generatePrecardsBtn.disabled = false;
      
      if (response.success) {
        updatePrecardStatus(`✅ Generated ${response.cards.length} pre-cards successfully!`, 'success');
        loadPrecards();
      } else {
        updatePrecardStatus('❌ Failed to generate pre-cards. Try again.', 'error');
      }
    });
  });

  clearPrecardsBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['precards', 'precardBin', 'precardRandomData'], function() {
      precardBinInput.value = DEFAULT_BIN;
      updatePrecardStatus('Cleared all pre-cards', 'success');
      loadPrecards();
    });
  });
}

function updatePrecardStatus(message, type = '') {
  precardStatusDiv.textContent = message;
  precardStatusDiv.className = 'status ' + type;
}

function loadPrecards() {
  chrome.storage.local.get(['precards'], function(result) {
    if (!result.precards || result.precards.length === 0) {
      precardsList.innerHTML = '<p class="no-cards-message">No pre-cards generated yet</p>';
      return;
    }
    
    const cards = result.precards;
    let html = '';
    
    cards.forEach((card, index) => {
      html += `
        <div class="precard-item">
          <div class="precard-info">
            <div class="precard-number">
              <strong>Card ${index + 1}:</strong> ${card.card_number}
            </div>
            <div class="precard-details">
              <span>Exp: ${card.expiry_month}/${card.expiry_year}</span>
              <span>CVV: ${card.cvv}</span>
            </div>
          </div>
          <button class="btn-use-card" data-index="${index}">Use Now</button>
        </div>
      `;
    });
    
    precardsList.innerHTML = html;
    
    document.querySelectorAll('.btn-use-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const cardIndex = parseInt(e.target.getAttribute('data-index'));
        await usePrecard(cardIndex);
      });
    });
  });
}

async function usePrecard(cardIndex) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes('checkout.stripe.com')) {
    updatePrecardStatus('❌ Please open a Stripe checkout page first!', 'error');
    return;
  }
  
  chrome.storage.local.get(['precards', 'precardRandomData'], function(result) {
    if (!result.precards || !result.precards[cardIndex]) {
      updatePrecardStatus('❌ Card not found!', 'error');
      return;
    }
    
    const selectedCard = result.precards[cardIndex];
    const randomData = result.precardRandomData;
    
    // Send to content script to fill the form
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillFormWithPrecard',
      card: selectedCard,
      randomData: randomData
    }, (response) => {
      if (chrome.runtime.lastError) {
        updatePrecardStatus('❌ Error: Please refresh the Stripe page', 'error');
        return;
      }
      
      updatePrecardStatus(`✅ Using Card ${cardIndex + 1} - Auto-filling...`, 'success');
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatus') {
    updateStatus(request.message, request.type);
  }
});
