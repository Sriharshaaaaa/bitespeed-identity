# Bitespeed Identity Reconciliation API

A backend task that consolidates user identities across multiple contact entries using phone number and email address.

## 🔧 Stack

- Node.js
- Express.js
- PostgreSQL (Raw SQL)
- pgAdmin 4

## 🧠 Problem Statement

Build a single endpoint:

### `POST /identify`

This takes an email and/or phone number and returns a consolidated contact cluster.

### Request Body

```json
{
  "email": "foo@example.com",
  "phonenumber": "1234567890"
}

### Response body

{
  "contact": {
    "primaryContactId": 1,
    "emails": ["foo@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}


### Hosted API Endpoint

POST https://bitespeed-identity-h357.onrender.com
