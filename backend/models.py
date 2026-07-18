from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AccountBase(BaseModel):
    name: str
    institution: str
    account_type: str  # 'BANK', 'CREDIT_CARD', 'FIXED_DEPOSIT', 'MUTUAL_FUND', 'STOCK'
    account_number_suffix: str

class AccountResponse(AccountBase):
    id: int

class BankTransactionSchema(BaseModel):
    date: str  # YYYY-MM-DD
    description: str
    reference_no: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    balance: Optional[float] = None
    category: Optional[str] = None
    transaction_hash: Optional[str] = None

class FixedDepositSchema(BaseModel):
    fd_number: str
    principal_amount: float
    maturity_amount: float
    interest_rate: float
    deposit_date: str  # YYYY-MM-DD
    maturity_date: str  # YYYY-MM-DD
    status: str  # 'ACTIVE', 'MATURED'

class InvestmentTransactionSchema(BaseModel):
    date: str  # YYYY-MM-DD
    transaction_type: str  # 'BUY', 'SELL', 'DIVIDEND_REINVEST'
    quantity: float
    price_per_unit: float
    total_amount: float
    transaction_hash: Optional[str] = None

class InvestmentHoldingSchema(BaseModel):
    asset_name: str
    symbol_or_code: str
    total_quantity: float = 0.0
    average_price: float = 0.0
    total_invested_amount: float = 0.0
    current_price: float = 0.0
    last_price_update: Optional[str] = None

# Detail Schema for import request (contains child transactions list for the asset)
class InvestmentImportSchema(BaseModel):
    asset_name: str
    symbol_or_code: str
    transactions: List[InvestmentTransactionSchema]

class ImportConfirmationRequest(BaseModel):
    account: AccountBase
    bank_transactions: Optional[List[BankTransactionSchema]] = None
    fixed_deposits: Optional[List[FixedDepositSchema]] = None
    investments: Optional[List[InvestmentImportSchema]] = None

class TemplateSchema(BaseModel):
    name: str
    config: Dict[str, Any]

# ----------------- NEW EXPANDED ASSET CLASSES SCHEMAS -----------------

class GoldHoldingSchema(BaseModel):
    account_id: int
    gold_type: str  # 'PHYSICAL_BAR', 'SOVEREIGN_GOLD_BOND', 'GOLD_ETF'
    weight_grams: float
    purity_carats: int
    invested_amount: float
    current_price_per_gram: float

class ProvidentFundSchema(BaseModel):
    account_id: int
    pf_type: str  # 'EPF', 'PPF', 'NPS'
    current_balance: float
    monthly_contribution: float = 0.0
    interest_rate: float = 0.0
    last_updated_date: str  # YYYY-MM-DD

class RealEstateSchema(BaseModel):
    account_id: int
    property_name: str
    purchase_price: float
    current_estimated_value: float
    monthly_rental_income: float = 0.0
    associated_loan_amount: float = 0.0
    status: str  # 'UNDER_CONSTRUCTION', 'SELF_OCCUPIED', 'RENTED'

class InsurancePolicySchema(BaseModel):
    account_id: int
    policy_number: str
    policy_name: str
    policy_type: str  # 'TERM_LIFE', 'HEALTH', 'MOTOR', 'ULIP'
    sum_assured: float
    premium_amount: float
    premium_frequency: str  # 'MONTHLY', 'QUARTERLY', 'ANNUALLY'
    due_date: str  # YYYY-MM-DD
    maturity_date: Optional[str] = None
    status: str  # 'ACTIVE', 'LAPSED'

# ----------------- MANUAL INPUT SCHEMAS FOR EXISTING ASSETS -----------------

class ManualTransactionRequest(BaseModel):
    account_id: int
    date: str  # YYYY-MM-DD
    description: str
    reference_no: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    category: Optional[str] = "Uncategorized"

class ManualFixedDepositRequest(FixedDepositSchema):
    account_id: int

class ManualInvestmentTradeRequest(BaseModel):
    account_id: int
    asset_name: str
    symbol_or_code: str
    date: str  # YYYY-MM-DD
    transaction_type: str  # 'BUY', 'SELL', 'DIVIDEND_REINVEST'
    quantity: float
    price_per_unit: float
    total_amount: float

