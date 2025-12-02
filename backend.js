// CONFIGURATION
const GEMINI_API_KEY = 'API KEY'; 
const SPREADSHEET_ID = 'SHEET_ID'; 
const SHEET_TAB_NAME = 'Conferences';

const SEARCH_QUERY = 'is:unread (subject:"seminar" OR subject:"conference" OR subject:"talk" OR subject:"workshop" OR "call for papers")';

// --- 1. CRAWLER WITH DUPLICATE PROTECTION ---
function fetchUnreadConferenceEmails() {
  Logger.log("--- STARTING CRAWLER ---");
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TAB_NAME);
  
  // A. Load existing events to prevent duplicates
  const existingData = sheet.getDataRange().getValues();
  const existingSignatures = new Set();
  // We create a unique "fingerprint" for each event: Title + Date
  for (let i = 1; i < existingData.length; i++) {
    // row[0] is Title, row[1] is Date
    // We convert date to string to ensure matching works
    let d = existingData[i][1]; 
    if (d instanceof Date) d = d.toISOString().split('T')[0]; // Simplify to YYYY-MM-DD
    existingSignatures.add(existingData[i][0] + "|" + d);
  }

  const threads = GmailApp.search(SEARCH_QUERY, 0, 10);
  if (threads.length === 0) { Logger.log("✅ No new unread emails."); return; }

  for (const thread of threads) {
    const message = thread.getMessages()[0]; 
    if (message.isUnread()) {
      const subject = message.getSubject();
      const body = message.getPlainBody();
      
      const details = callGeminiAPI(subject, body);
      
      if (details) {
        // B. Check for Duplicate
        const newSignature = details.title + "|" + details.date;
        
        if (existingSignatures.has(newSignature)) {
          Logger.log(`⚠️ DUPLICATE DETECTED: ${details.title}. Skipping.`);
          message.markRead(); // Mark read so we don't check it again
          continue; 
        }

        sheet.appendRow([
          details.title, details.date, details.time, details.description, details.link, subject, "Pending"
        ]);
        Logger.log(`✅ Saved: ${details.title}`);
        message.markRead(); 
      }
    }
  }
}

function callGeminiAPI(subject, body) {
  const prompt = `Extract event details as JSON:
    - title, date (YYYY-MM-DD), time, description, link.
    If NOT an event, return {"error": "no event"}.
    Subject: ${subject} Body: ${body.substring(0, 5000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const options = {
    "method": "post", "contentType": "application/json", "muteHttpExceptions": true,
    "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }], "generationConfig": { "responseMimeType": "application/json" } })
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      if (json.candidates) {
        const parsed = JSON.parse(json.candidates[0].content.parts[0].text);
        return parsed.error ? null : parsed;
      }
    }
  } catch (e) { Logger.log(e); }
  return null;
}

// --- 2. WEB APP FUNCTIONS ---
function doGet(e) {
  // If the URL has ?page=admin, show the Admin panel. Otherwise, show the safe list.
  if (e.parameter.page === 'admin') {
    return HtmlService.createTemplateFromFile('Admin').evaluate();
  }
  return HtmlService.createTemplateFromFile('Index').evaluate();
}
function getConferences() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TAB_NAME);
  
  // 1. Check if sheet exists
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  
  // 2. Check if sheet is empty (only header or less)
  if (data.length <= 1) return [];

  // 3. Robust Mapping (Prevents "Null" crashes)
  return data.slice(1).map(row => {
    // Force everything to String to prevent date errors
    let dateStr = row[1];
    if (row[1] instanceof Date) {
      dateStr = row[1].toISOString(); // Standardize date
    } else {
      dateStr = String(row[1] || ""); // Handle empty cells safely
    }

    return [
      String(row[0] || "No Title"), // Title
      dateStr,                      // Date
      String(row[2] || ""),         // Time
      String(row[3] || ""),         // Desc
      String(row[4] || "#")         // Link
    ];
  });
}

function addEventToCalendar(title, date, time, desc, link) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    calendar.createAllDayEvent(title, new Date(date), { description: `${desc}\n\nTime: ${time}\nLink: ${link}` });
    return "SUCCESS";
  } catch (e) { return "ERROR: " + e.toString(); }
}

// --- NEW DELETE FUNCTION ---
function deleteEvent(title, dateStr) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TAB_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find the row with matching Title
  // (We skip Row 0 because it's the header)
  for (let i = 1; i < data.length; i++) {
    const rowTitle = data[i][0];
    // Simple match: If title matches, delete it.
    if (rowTitle === title) {
      sheet.deleteRow(i + 1); // Sheets are 1-indexed
      return "SUCCESS";
    }
  }
  return "NOT_FOUND";
}


