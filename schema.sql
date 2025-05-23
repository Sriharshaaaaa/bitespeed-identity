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