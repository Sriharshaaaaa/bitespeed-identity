CREATE TABLE contact (
    id SERIAL PRIMARY KEY,
    phoneNumber VARCHAR(20),
    email VARCHAR(255),
    linkedId INTEGER,
    linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    deletedAt TIMESTAMP
);

-- Function to auto-update updatedAt before update
-- CREATE OR REPLACE FUNCTION update_updatedAt_column()
-- RETURNS TRIGGER AS $$
-- BEGIN 
--     NEW."updatedAt" = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE 'plpgsql';

-- Trigger to auto-call the update function
-- CREATE TRIGGER update_contact_updatedAt
-- BEFORE UPDATE ON contacts 
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updatedAt_column();