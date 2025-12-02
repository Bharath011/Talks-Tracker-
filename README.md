### 🛑 The Problem
As students, we receive hundreds of emails every day. It is very hard to manually check every single one to find announcements for seminars, talks, or conferences. Because of this, we often miss out on the talks that we are intersted to attend.

### 💡 The Solution
I built an automated tool that does the reading for me. This project uses the **Gemini API** to scan my inbox, identify emails about upcoming talks, and extract the key details (Topic, Date, Time, and Link). It then publishes these events to a simple website.

### 🚀 Features

This project has two modes:

* **Student View (Index.html):** A clean, read-only dashboard where anyone can see a list of upcoming conferences and seminars.
* **Admin View (Admin.html):** A private control panel that lets me manage the list and **add events directly to Google Calendar** with a single click, so I never miss a talk. and i can also delete the talk that i am not intrested using **delete**

### 🛠️ How It Works
1.  **Scan:** A Google Apps Script triggers periodically to check for new unread emails.
2.  **Extract:** It sends the email content to the **Gemini API**, which uses AI to extract structured data (Title, Date, Time).
3.  **Save:** The event is saved to a Google Sheet database.
4.  **Display:** The web application displays the events in a user-friendly interface.

### 💻 Tech Stack
* **AI Model:** Google Gemini 2.0 Flash
* **Backend:** Google Apps Script & Gmail API
* **Database:** Google Sheets
* **Frontend:** HTML5, CSS3
