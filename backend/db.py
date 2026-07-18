import sqlite3
import os
import json
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "finance_tracker.db")

def get_db_connection():
    """Establishes connection to the SQLite database with Foreign Key support enabled."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Returns rows as dictionary-like objects
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def migrate_accounts_table(conn):
    """Migrates accounts table check constraints if it was created using the old schema."""
    try:
        cursor = conn.cursor()
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if not cursor.fetchone():
            return
            
        # Get schema of accounts
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'")
        sql = cursor.fetchone()[0]
        
        # If the new types are already in the CHECK constraint, no need to migrate
        if "GOLD" in sql:
            return
            
        print("Migrating accounts table check constraints...")
        # Disable foreign keys temporarily for migration
        conn.execute("PRAGMA foreign_keys = OFF;")
        
        # 1. Rename old table
        cursor.execute("ALTER TABLE accounts RENAME TO accounts_old")
        
        # 2. Create new table
        cursor.execute("""
        CREATE TABLE accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            institution TEXT NOT NULL,
            account_type TEXT NOT NULL CHECK (account_type IN ('BANK', 'CREDIT_CARD', 'FIXED_DEPOSIT', 'MUTUAL_FUND', 'STOCK', 'GOLD', 'PROVIDENT_FUND', 'REAL_ESTATE', 'INSURANCE')),
            account_number_suffix TEXT NOT NULL,
            UNIQUE(institution, account_type, account_number_suffix)
        );
        """)
        
        # 3. Copy data
        cursor.execute("""
        INSERT INTO accounts (id, name, institution, account_type, account_number_suffix)
        SELECT id, name, institution, account_type, account_number_suffix FROM accounts_old
        """)
        
        # 4. Drop old table
        cursor.execute("DROP TABLE accounts_old")
        
        # Re-enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        print("Accounts table migration complete.")
    except Exception as e:
        print("Migration error:", e)

def init_db():
    """Initializes the database schema if tables do not exist."""
    conn = get_db_connection()
    try:
        # Run any migrations first
        migrate_accounts_table(conn)
        
        schema_queries = [
            # 1. Accounts Table (supports new asset types)
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                institution TEXT NOT NULL,
                account_type TEXT NOT NULL CHECK (account_type IN ('BANK', 'CREDIT_CARD', 'FIXED_DEPOSIT', 'MUTUAL_FUND', 'STOCK', 'GOLD', 'PROVIDENT_FUND', 'REAL_ESTATE', 'INSURANCE')),
                account_number_suffix TEXT NOT NULL,
                UNIQUE(institution, account_type, account_number_suffix)
            );
            """,
            # 2. Bank Transactions Table (Ledger-style)
            """
            CREATE TABLE IF NOT EXISTS bank_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                date TEXT NOT NULL, -- YYYY-MM-DD
                description TEXT NOT NULL,
                reference_no TEXT,
                debit REAL DEFAULT 0.0,
                credit REAL DEFAULT 0.0,
                balance REAL,
                category TEXT,
                transaction_hash TEXT UNIQUE,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """,
            # 3. Fixed Deposits Table
            """
            CREATE TABLE IF NOT EXISTS fixed_deposits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                fd_number TEXT NOT NULL UNIQUE,
                principal_amount REAL NOT NULL,
                maturity_amount REAL NOT NULL,
                interest_rate REAL NOT NULL,
                deposit_date TEXT NOT NULL, -- YYYY-MM-DD
                maturity_date TEXT NOT NULL, -- YYYY-MM-DD
                status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'MATURED')),
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """,
            # 4. Investment Holdings Table (Consolidated Asset summary per Account)
            """
            CREATE TABLE IF NOT EXISTS investment_holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                asset_name TEXT NOT NULL,
                symbol_or_code TEXT NOT NULL,
                total_quantity REAL DEFAULT 0.0,
                average_price REAL DEFAULT 0.0,
                total_invested_amount REAL DEFAULT 0.0,
                current_price REAL DEFAULT 0.0,
                last_price_update TEXT, -- YYYY-MM-DD HH:MM:SS
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
                UNIQUE(account_id, symbol_or_code)
            );
            """,
            # 5. Investment Transactions Table (Individual buy/sell line items)
            """
            CREATE TABLE IF NOT EXISTS investment_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                holding_id INTEGER NOT NULL,
                date TEXT NOT NULL, -- YYYY-MM-DD
                transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND_REINVEST')),
                quantity REAL NOT NULL,
                price_per_unit REAL NOT NULL,
                total_amount REAL NOT NULL,
                transaction_hash TEXT UNIQUE,
                FOREIGN KEY (holding_id) REFERENCES investment_holdings (id) ON DELETE CASCADE
            );
            """,
            # 6. Parser Configurations Table
            """
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                config_json TEXT NOT NULL
            );
            """,
            # 7. Gold Holdings Table
            """
            CREATE TABLE IF NOT EXISTS gold_holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL UNIQUE,
                gold_type TEXT NOT NULL CHECK (gold_type IN ('PHYSICAL_BAR', 'SOVEREIGN_GOLD_BOND', 'GOLD_ETF')),
                weight_grams REAL NOT NULL,
                purity_carats INTEGER NOT NULL,
                invested_amount REAL NOT NULL,
                current_price_per_gram REAL NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """,
            # 8. Provident Funds Table
            """
            CREATE TABLE IF NOT EXISTS provident_funds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL UNIQUE,
                pf_type TEXT NOT NULL CHECK (pf_type IN ('EPF', 'PPF', 'NPS')),
                current_balance REAL NOT NULL,
                monthly_contribution REAL DEFAULT 0.0,
                interest_rate REAL DEFAULT 0.0,
                last_updated_date TEXT NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """,
            # 9. Real Estate Table
            """
            CREATE TABLE IF NOT EXISTS real_estate (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL UNIQUE,
                property_name TEXT NOT NULL,
                purchase_price REAL NOT NULL,
                current_estimated_value REAL NOT NULL,
                monthly_rental_income REAL DEFAULT 0.0,
                associated_loan_amount REAL DEFAULT 0.0,
                status TEXT NOT NULL CHECK (status IN ('UNDER_CONSTRUCTION', 'SELF_OCCUPIED', 'RENTED')),
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """,
            # 10. Insurance Policies Table
            """
            CREATE TABLE IF NOT EXISTS insurance_policies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL UNIQUE,
                policy_number TEXT NOT NULL UNIQUE,
                policy_name TEXT NOT NULL,
                policy_type TEXT NOT NULL CHECK (policy_type IN ('TERM_LIFE', 'HEALTH', 'MOTOR', 'ULIP')),
                sum_assured REAL NOT NULL,
                premium_amount REAL NOT NULL,
                premium_frequency TEXT NOT NULL CHECK (premium_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
                due_date TEXT NOT NULL,
                maturity_date TEXT,
                status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'LAPSED')),
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            );
            """
        ]
        cursor = conn.cursor()
        for query in schema_queries:
            cursor.execute(query)
        conn.commit()
    finally:
        conn.close()

# ----------------- DB OPERATIONS HELPER FUNCTIONS -----------------

# Accounts
def create_account(name, institution, account_type, account_number_suffix):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO accounts (name, institution, account_type, account_number_suffix)
            VALUES (?, ?, ?, ?)
            """,
            (name, institution, account_type, account_number_suffix)
        )
        conn.commit()
        # Retrieve account ID
        cursor.execute(
            """
            SELECT id FROM accounts 
            WHERE institution = ? AND account_type = ? AND account_number_suffix = ?
            """,
            (institution, account_type, account_number_suffix)
        )
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        conn.close()

def get_accounts():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts ORDER BY institution, name")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# Bank Transactions
def insert_bank_transactions(transactions):
    """
    Inserts a list of bank transactions. Skips duplicates based on transaction_hash.
    Each txn: (account_id, date, description, reference_no, debit, credit, balance, category, transaction_hash)
    """
    conn = get_db_connection()
    inserted_count = 0
    try:
        cursor = conn.cursor()
        for txn in transactions:
            try:
                cursor.execute(
                    """
                    INSERT INTO bank_transactions 
                    (account_id, date, description, reference_no, debit, credit, balance, category, transaction_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    txn
                )
                inserted_count += 1
            except sqlite3.IntegrityError:
                # Duplicate transaction_hash, ignore
                continue
        conn.commit()
        return inserted_count
    finally:
        conn.close()

# Fixed Deposits
def insert_fixed_deposits(fds):
    """
    Inserts a list of Fixed Deposits.
    Each fd: (account_id, fd_number, principal_amount, maturity_amount, interest_rate, deposit_date, maturity_date, status)
    """
    conn = get_db_connection()
    inserted_count = 0
    try:
        cursor = conn.cursor()
        for fd in fds:
            try:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO fixed_deposits 
                    (account_id, fd_number, principal_amount, maturity_amount, interest_rate, deposit_date, maturity_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    fd
                )
                inserted_count += 1
            except sqlite3.IntegrityError:
                continue
        conn.commit()
        return inserted_count
    finally:
        conn.close()

# Investment Holdings & Transactions
def get_or_create_holding(account_id, asset_name, symbol_or_code):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO investment_holdings (account_id, asset_name, symbol_or_code)
            VALUES (?, ?, ?)
            """,
            (account_id, asset_name, symbol_or_code)
        )
        conn.commit()
        
        cursor.execute(
            """
            SELECT * FROM investment_holdings 
            WHERE account_id = ? AND symbol_or_code = ?
            """,
            (account_id, symbol_or_code)
        )
        return dict(cursor.fetchone())
    finally:
        conn.close()

def insert_investment_transactions(transactions_data):
    """
    Inserts investment transactions and updates the parent holding metrics.
    """
    conn = get_db_connection()
    inserted_count = 0
    try:
        for t in transactions_data:
            # 1. Get or create holding
            holding = get_or_create_holding(t['account_id'], t['asset_name'], t['symbol_or_code'])
            holding_id = holding['id']
            
            cursor = conn.cursor()
            try:
                # 2. Insert transaction
                cursor.execute(
                    """
                    INSERT INTO investment_transactions 
                    (holding_id, date, transaction_type, quantity, price_per_unit, total_amount, transaction_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (holding_id, t['date'], t['transaction_type'], t['quantity'], t['price_per_unit'], t['total_amount'], t['transaction_hash'])
                )
                inserted_count += 1
                
                # 3. Recalculate holding statistics
                cursor.execute(
                    """
                    SELECT transaction_type, quantity, price_per_unit, total_amount 
                    FROM investment_transactions 
                    WHERE holding_id = ?
                    ORDER BY date ASC
                    """,
                    (holding_id,)
                )
                all_txns = cursor.fetchall()
                
                total_qty = 0.0
                total_invested = 0.0
                
                for tx in all_txns:
                    tx_type = tx['transaction_type']
                    qty = tx['quantity']
                    price = tx['price_per_unit']
                    amt = tx['total_amount']
                    
                    if tx_type in ('BUY', 'DIVIDEND_REINVEST'):
                        total_qty += qty
                        total_invested += amt
                    elif tx_type == 'SELL':
                        if total_qty > 0:
                            avg_p = total_invested / total_qty
                            total_qty = max(0.0, total_qty - qty)
                            total_invested = total_qty * avg_p
                        else:
                            total_qty = 0.0
                            total_invested = 0.0
                            
                avg_price = (total_invested / total_qty) if total_qty > 0 else 0.0
                
                # Update holding
                cursor.execute(
                    """
                    UPDATE investment_holdings
                    SET total_quantity = ?, average_price = ?, total_invested_amount = ?
                    WHERE id = ?
                    """,
                    (total_qty, avg_price, total_invested, holding_id)
                )
                
            except sqlite3.IntegrityError:
                continue
        conn.commit()
        return inserted_count
    finally:
        conn.close()

def update_holding_current_price(holding_id, current_price):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE investment_holdings
            SET current_price = ?, last_price_update = ?
            WHERE id = ?
            """,
            (current_price, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), holding_id)
        )
        conn.commit()
    finally:
        conn.close()

# ----------------- NEW EXPANDED ASSET CLASSES CRUD Helpers -----------------

# Gold Holdings
def save_gold_holding(account_id, gold_type, weight_grams, purity_carats, invested_amount, current_price_per_gram):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO gold_holdings 
            (account_id, gold_type, weight_grams, purity_carats, invested_amount, current_price_per_gram)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (account_id, gold_type, weight_grams, purity_carats, invested_amount, current_price_per_gram)
        )
        conn.commit()
    finally:
        conn.close()

def get_gold_holdings():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT g.*, a.name as account_name, a.institution
            FROM gold_holdings g
            JOIN accounts a ON g.account_id = a.id
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# Provident Funds
def save_provident_fund(account_id, pf_type, current_balance, monthly_contribution, interest_rate, last_updated_date):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO provident_funds
            (account_id, pf_type, current_balance, monthly_contribution, interest_rate, last_updated_date)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (account_id, pf_type, current_balance, monthly_contribution, interest_rate, last_updated_date)
        )
        conn.commit()
    finally:
        conn.close()

def get_provident_funds():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT p.*, a.name as account_name, a.institution
            FROM provident_funds p
            JOIN accounts a ON p.account_id = a.id
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# Real Estate
def save_real_estate(account_id, property_name, purchase_price, current_estimated_value, monthly_rental_income, associated_loan_amount, status):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO real_estate
            (account_id, property_name, purchase_price, current_estimated_value, monthly_rental_income, associated_loan_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (account_id, property_name, purchase_price, current_estimated_value, monthly_rental_income, associated_loan_amount, status)
        )
        conn.commit()
    finally:
        conn.close()

def get_real_estate():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.*, a.name as account_name, a.institution
            FROM real_estate r
            JOIN accounts a ON r.account_id = a.id
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# Insurance Policies
def save_insurance_policy(account_id, policy_number, policy_name, policy_type, sum_assured, premium_amount, premium_frequency, due_date, maturity_date, status):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO insurance_policies
            (account_id, policy_number, policy_name, policy_type, sum_assured, premium_amount, premium_frequency, due_date, maturity_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (account_id, policy_number, policy_name, policy_type, sum_assured, premium_amount, premium_frequency, due_date, maturity_date, status)
        )
        conn.commit()
    finally:
        conn.close()

def get_insurance_policies():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT i.*, a.name as account_name, a.institution
            FROM insurance_policies i
            JOIN accounts a ON i.account_id = a.id
            """
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

# Templates Configuration
def save_template(name, config_dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        config_json = json.dumps(config_dict)
        cursor.execute(
            """
            INSERT OR REPLACE INTO templates (name, config_json)
            VALUES (?, ?)
            """,
            (name, config_json)
        )
        conn.commit()
    finally:
        conn.close()

def get_templates():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM templates ORDER BY name")
        rows = cursor.fetchall()
        templates_list = []
        for r in rows:
            templates_list.append({
                "id": r["id"],
                "name": r["name"],
                "config": json.loads(r["config_json"])
            })
        return templates_list
    finally:
        conn.close()

# Initialize DB on load
if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_FILE)
