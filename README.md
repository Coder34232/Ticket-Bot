# Ticket-Bot
A bot programmed in Javascript and built with Discord.js v14, focused on moderating a Minecraft server.  It took approximately 2-3 months to create.
[README.md](https://github.com/user-attachments/files/27567118/README.md)
# 🎫 Ticket Bot — Minecraft Server Edition

Advanced support ticket bot for Minecraft servers built with Discord.js v14.
**Zero native dependencies** — works on Windows, Mac, Linux.

---

## 🚀 Quick Start


### 1. Extract the zip to a folder
```bash
cd ticket-bot
```
### 2. Install dependencies (~5 seconds)
```bash
npm install
```

### 3. Copy and configure your .env
```bash
cp .env.example .env
```

### 4. Edit .env with your values

#### ⚙️ .env Configuration

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Your bot token |
| `CLIENT_ID` | ✅ | Application ID |
| `GUILD_ID` | ✅ | Server ID (instant command deploy) |
| `TICKET_LOG_CHANNEL_ID` | — | Channel for all ticket logs |
| `WAITLIST_LOG_CHANNEL_ID` | — | Channel for waitlist logs (fallback to log channel) |
| `CATEGORY_SUPPORT` | — | Discord category for support tickets |
| `CATEGORY_APPEALS` | — | Discord category for appeals |
| `CATEGORY_PURCHASES` | — | Discord category for purchase tickets |
| `CATEGORY_BUGS` | — | Discord category for bug reports |
| `CATEGORY_APPLICATIONS` | — | Discord category for staff applications |
| `CATEGORY_PARTNERS` | — | Discord category for partnerships |
| `CATEGORY_OUTROS` | — | Discord category for other tickets |
| `ROLE_STAFF` | — | Staff role ID (access + fallback ping) |
| `ROLE_SUPPORT` | — | Support role (ping for support tickets) |
| `ROLE_MODERATORS` | — | Moderator role (ping for appeals) |
| `ROLE_DEVELOPERS` | — | Developer role (ping for bug reports) |
| `ROLE_BANNED` | — | Required role to open an appeal ticket |
| `MAX_TICKETS` | — | Max concurrent tickets before waitlist (default: 50) |
| `AUTO_CLOSE_HOURS` | — | Hours of inactivity before auto-close (0 = off) |


### 5. Register slash commands
```bash
npm run deploy
```

### 6. Start the bot
```bash
npm start
```

Then in Discord: run `/panel` in your ticket channel → the ticket panel appears.

---

## 🎮 Ticket Categories

| Category | Role Required | Ping |
|---|---|---|
| 🛠️ Support | None | @Support |
| 🚫 Appeal | **Banned role** | @Moderators |
| 💎 Purchases | None | @Staff |
| 🐞 Bug Report | None | @Developers |
| 📩 Staff Application | None | @Staff |
| 🤝 Partnership | None | @Staff |
| ❓ Other | None | @Staff |

---

## ⚠️ Priority System

| Priority | Trigger Keywords | Behavior |
|---|---|---|
| 🟢 Low | *(default)* | Silent |
| 🟡 Medium | error, bug, broken, glitch, not working | Logged |
| 🔴 High | urgent, critical, crash, down, dupe, exploit | Immediate staff ping |

Priority is **auto-detected** on creation and can be changed manually by staff.

---

## 🎮 Ticket Controls

| Button | Who | Action |
|---|---|---|
| 🔒 Close Ticket | Everyone | Reason dropdown → closes & sends transcript to DM |
| 📌 Claim | Staff | Assigns the ticket to a staff member |
| ⚠️ Priority | Staff | Change priority (Low / Medium / High) |
| 📄 Transcript | Staff | Generate HTML transcript on demand |
| 👤 Add User | Staff | Add a user to the ticket by ID |
| ❌ Remove User | Staff | Remove a user from the ticket by ID |
| 🔁 Transfer | Staff | Move the ticket to a different category |

---

## 📄 Transcripts & DMs

**Transcript generated when:**
- Ticket is closed (sent to user DM + log channel)
- Staff clicks the Transcript button manually

**DMs sent to user when:**
- Ticket opened (ID, category, timestamp)
- Ticket closed (who closed, reason, duration + HTML transcript)

---

## 📦 Requirements

- **Node.js 22.5+** (built-in SQLite, no compilation needed)
- `discord.js` and `dotenv` (installed via `npm install`)
