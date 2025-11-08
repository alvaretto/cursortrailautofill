const FIRST_NAMES = [
  "Takudzwa", "Tendai", "Tinashe", "Tanaka", "Tapiwa", "Tafadzwa", "Tatenda", "Tarirai",
  "Chipo", "Chiedza", "Chenai", "Chengeto", "Charity", "Charmaine", "Cynthia", "Catherine",
  "Rumbidzai", "Rudo", "Rutendo", "Rufaro", "Ruvarashe", "Ruvimbo", "Runako",
  "Kudakwashe", "Kudzai", "Kundai", "Kumbirai", "Kudzanai", "Kudzaishe", "Kuzivakwashe",
  "Nyasha", "Nyarai", "Nyaradzo", "Ngoni", "Nokutenda", "Nomatter", "Noticia", "Noreen",
  "Munashe", "Munyaradzi", "Mutsa", "Mufaro", "Muchaneta", "Mudavanhu", "Mudiwa",
  "Simbarashe", "Simukai", "Simba", "Samuel", "Sharon", "Shingi", "Shingai", "Sekai",
  "Brian", "Brandon", "Benedict", "Blessed", "Blessing", "Brighton", "Bernard", "Bruce",
  "Alice", "Angela", "Anna", "Adelaide", "Agatha", "Amanda", "Anastasia", "Agnes",
  "David", "Daniel", "Darlington", "Dennis", "Dylan", "Desmond", "Douglas", "Donald"
];

const LAST_NAMES = [
  "Moyo", "Ncube", "Sibanda", "Dube", "Ndlovu", "Mpofu", "Khumalo", "Nkomo",
  "Zhou", "Mutasa", "Chikwanha", "Gwede", "Gumbo", "Mahlangu", "Mlilo", "Tshuma",
  "Chiwenga", "Chiweshe", "Chigumbura", "Chikomo", "Chikunda", "Chidzonga",
  "Nyathi", "Nyoni", "Nyoka", "Ngwenya", "Nkala", "Ndiweni", "Nduna",
  "Marufu", "Marowa", "Mapfumo", "Madondo", "Mavhima", "Madziva", "Mazuru",
  "Sithole", "Shumba", "Shoko", "Shava", "Shiri", "Sigauke", "Simango",
  "Banda", "Bhebhe", "Bvuma", "Chikomba", "Chirara", "Choto", "Chombo",
  "Mlambo", "Mlalazi", "Mtshali", "Mukono", "Mukwashi", "Musarurwa",
  "Zulu", "Zondo", "Zvobgo", "Zivhu", "Zimuto", "Ziki", "Zvinavashe"
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EXTENSION_VERSION = '2.0';
const FIXED_ADDRESS = '69 Adams Street';
const FIXED_CITY = 'Brooklyn';
const FIXED_ZIP = '11201';
const FIXED_STATE = 'New York';

function generateRandomData() {
  return {
    name: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
    address: FIXED_ADDRESS,
    address2: '',
    city: FIXED_CITY,
    zip: FIXED_ZIP,
    state: FIXED_STATE
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['extensionVersion'], (result) => {
    if (result.extensionVersion !== EXTENSION_VERSION) {
      chrome.storage.local.clear(() => {
        chrome.storage.local.set({ 
          extensionVersion: EXTENSION_VERSION,
          savedBin: '552461xxxxxxxxxx'
        });
      });
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateCards') {
    generateCardsFromAKR(request.bin, request.stripeTabId, sendResponse);
    return true;
  }
});

async function generateCardsFromAKR(bin, stripeTabId, callback) {
  try {
    const tab = await chrome.tabs.create({
      url: 'https://akr-gen.bigfk.com/',
      active: false
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillBINAndGenerate,
      args: [bin]
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getGeneratedCards
    });
    
    await chrome.tabs.remove(tab.id);
    
    if (results && results[0] && results[0].result) {
      const cards = parseCards(results[0].result);
      
      if (cards.length > 0) {
        const randomData = generateRandomData();
        
        chrome.storage.local.set({
          generatedCards: cards,
          randomData: randomData
        });
        
        callback({ success: true, cards: cards });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        chrome.tabs.sendMessage(stripeTabId, { 
          action: 'fillForm' 
        });
        
      } else {
        callback({ success: false, error: 'No cards generated' });
      }
    } else {
      callback({ success: false, error: 'Failed to retrieve cards' });
    }
    
  } catch (error) {
    callback({ success: false, error: error.message });
  }
}

function fillBINAndGenerate(bin) {
  const binInput = document.getElementById('bin');
  if (binInput) {
    binInput.value = bin;
    binInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    setTimeout(() => {
      const generateBtn = document.querySelector('button[type="submit"]');
      if (generateBtn) {
        generateBtn.click();
      }
    }, 500);
  }
}

function getGeneratedCards() {
  const resultTextarea = document.getElementById('result');
  if (resultTextarea) {
    return resultTextarea.value;
  }
  return '';
}

function parseCards(cardsText) {
  if (!cardsText) return [];
  
  const lines = cardsText.trim().split('\n');
  const cards = [];
  
  lines.forEach((line, idx) => {
    if (line.trim()) {
      const parts = line.trim().split('|');
      if (parts.length === 4) {
        cards.push({
          serial_number: idx + 1,
          card_number: parts[0],
          expiry_month: parts[1],
          expiry_year: parts[2],
          cvv: parts[3],
          full_format: line.trim()
        });
      }
    }
  });
  
  return cards;
}

