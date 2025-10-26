-- Add investments table to track capital
CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    amount DECIMAL(20, 2) NOT NULL,
    source TEXT NOT NULL,
    investment_date TIMESTAMP NOT NULL,
    description TEXT,
    created_by_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_investment_date ON investments(investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_created_by ON investments(created_by_id);

COMMENT ON TABLE investments IS 'Tracks capital invested in the lending business';
COMMENT ON COLUMN investments.amount IS 'Amount of capital invested';
COMMENT ON COLUMN investments.source IS 'Source of investment (e.g., Personal, Bank Loan, Investor)';
COMMENT ON COLUMN investments.investment_date IS 'Date when the investment was made';
