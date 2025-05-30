# Bitespeed Backend Task

## Setup

1. Install dependencies:

```bash
npm install

2. Configure your .env file with your PostgreSQL connection string:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bitespeed_db?schema=public"
PORT=3000

3. Run Prisma migrations:

npx prisma migrate dev --name init

4.Start the server in dev mode:

npm run dev

API
POST /identify
Request JSON:

json
Copy
Edit
{
  "email": "example@example.com",
  "phoneNumber": "1234567890"
}
Response JSON:

json
Copy
Edit
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2]
  }
}
