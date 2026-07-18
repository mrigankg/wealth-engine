# Wealth Engine 💰

Wealth Engine is a **100% offline, privacy-first personal finance tracker** built using FastAPI, SQLite, and vanilla ES6 Javascript. 

It is designed to give users complete peace of mind that their financial data **never leaves their local machine**. There are zero CDNs, external web requests, analytics APIs, or cloud sync databases.

---

## ✨ Features

- **Automated Statement Parser**: Drag and drop PDF, CSV, or Excel statements from major Indian banks:
  - **HDFC Bank**
  - **ICICI Bank**
  - **State Bank of India (SBI)**
  - **Bank of Baroda**
- **Investment & Mutual Fund Ledger**: Auto-ingests Mutual Fund CAS statements and Stock transaction ledgers. Correctly computes consolidated holdings, average cost basis, current valuations, and absolute P&L gains/losses.
- **Unified Net Worth Dashboard**: A premium, glassmorphic dark-mode interface powered by a local, offline instance of Chart.js showing:
  - Net Worth trend & Asset allocation.
  - Cashflow indicators (Income vs Expenses).
  - Credit card debt vs liquid cash reserves.
- **Extended Asset Classes Registry**: Track your complete wealth profile in dedicated tabs:
  - **Gold & Bullion**: Log physical gold bar weights, purity carats, Sovereign Gold Bonds (SGB), and Gold ETFs.
  - **Provident Funds (EPF/PPF/NPS)**: Log compound interest rates, monthly auto-contributions, and balances.
  - **Real Estate**: Record purchase cost, estimated market value, mortgages, equity, and rental inflows.
  - **Insurance Policies**: Keep track of Term Life sum assured, health covers, auto premiums, and due dates.
- **100% Manual Flexibility**: Manual entry buttons and forms for **every** asset category (Ledger Book transactions, FDs, Stock Trades) to cover cash expenses or brokers.
- **Custom Configurator**: A visual GUI layout mapper to build templates for unsupported statement schemas without writing code.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python), SQLite (database), Pydantic (data validation), `pdfplumber` (PDF table parser), `openpyxl` (Excel parser).
- **Frontend**: HTML5 Semantic markup, Custom CSS3 grid/flexbox stylesheet (dark glassmorphism, no external framework), Vanilla ES6 JavaScript (reactive DOM updates, no build step).
- **Charts**: Local Chart.js copy loaded offline.

---

## 🚀 Local Setup & Installation

Follow these steps to run Wealth Engine locally:

### Prerequisites
- Python 3.9+ installed on your computer.
- Git.

### Setup Instructions

1. **Clone or navigate to the repository directory**:
   ```bash
   cd "/Users/mrigankg/Work_Area/Personal Finance Tracker"
   ```

2. **Create and activate a python virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the local server**:
   ```bash
   python3 -m backend.main
   ```

5. **Open in Browser**:
   Navigate to **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

## 🔒 Security & Privacy Architecture

Wealth Engine enforces strict privacy guidelines:
- **Local SQLite File**: All database records are written to `finance_tracker.db` in your local project root.
- **Git Protection**: The local database and virtual environments are explicitly blocked in `.gitignore` to prevent committing sensitive transaction logs to GitHub.
- **Zero External Resources**: All icons are inline SVGs. Font stacks fall back strictly to system interfaces (SF Pro, Segoe UI, Roboto). There are no CDN tags.