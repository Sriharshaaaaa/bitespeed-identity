-- CREATE TABLE contact (
--     id SERIAL PRIMARY KEY,
--     phoneNumber VARCHAR(20),
--     email VARCHAR(255),
--     linkedId INTEGER,
--     linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
--     createdAt TIMESTAMP DEFAULT NOW(),
--     updatedAt TIMESTAMP DEFAULT NOW(),
--     deletedAt TIMESTAMP
-- );

------------------------------------------------------------------
--All the commands that I have used for the code

-- UPDATE contact SET "updatedat" = NOW();

-- ALTER TABLE contact DROP COLUMN "updatedAt";

-- delete from contact;
-- select * from contact;
----------------------------------------------------------------------------
-- -- Drop trigger if exists
-- DROP TRIGGER IF EXISTS update_contact_updatedat ON contact;

-- -- Drop function if exists
-- DROP FUNCTION IF EXISTS update_updatedat_column();

-- Function to auto-update updatedAt before update
-- CREATE OR REPLACE FUNCTION update_updatedat_column()
-- RETURNS TRIGGER AS $$
-- BEGIN 
--     NEW."updatedat" = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE 'plpgsql';

-- -- Trigger to auto-call the update function
-- CREATE TRIGGER update_contact_updatedat
-- BEFORE UPDATE ON contact 
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updatedat_column();