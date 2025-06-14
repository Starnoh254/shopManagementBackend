# Node.js Backend Template

This is a reusable Node.js backend template designed to help you quickly spin up a backend project with the following features:

* MySQL support (flexible to use other SQL databases like PostgreSQL, SQLite)
* Authentication (Register, Login, JWT-based auth)
* Testing (unit + integration)
* API Documentation using Swagger
* Modular and scalable folder structure

---

## ✅ Tech Stack

| Purpose   | Tech                                        |
| --------- | ------------------------------------------- |
| Server    | Express.js                                  |
| DB Layer  | Prisma (supports MySQL, PostgreSQL, SQLite) |
| Auth      | JWT + bcryptjs                              |
| Testing   | Jest + Supertest                            |
| Docs      | Swagger UI (OpenAPI)                        |
| Dev Tools | dotenv, nodemon                             |

---

## ⚙️ Node Version

Make sure you're using **Node.js v22.14.0**.

You can check your Node version using:

```bash
node -v
```

---

## 🗂️ Folder Structure

```bash
backend-template/
├── src/
│   ├── config/              # DB + App configs
│   ├── controllers/         # Request logic
│   ├── middlewares/         # Auth, error handling
│   ├── models/              # Prisma schema
│   ├── routes/              # Express routers
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   └── app.js               # Express app setup
├── tests/                   # Unit & integration tests
├── prisma/
│   └── schema.prisma        # Prisma schema
├── .env
├── package.json
└── README.md
```

---

## 🧱 Setup Instructions

### 1. Initialize the Project

```bash
mkdir backend-template && cd backend-template
npm init -y
```

### 2. Install Dependencies

```bash
npm install express prisma @prisma/client jsonwebtoken bcryptjs dotenv cors
npm install --save-dev nodemon jest supertest swagger-ui-express
npx prisma init
```

### 3. Configure Prisma

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql" // Change to postgresql or sqlite if needed
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
}
```

`.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
JWT_SECRET="supersecret"
```

```bash
npx prisma migrate dev --name <name>
```

### 4. Setup Express App

`src/app.js`:

```js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('API is running!'));

module.exports = app;
```

`server.js`:

```js
const app = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 5. Setup Swagger

```bash
npm install swagger-ui-express
```

Add to `app.js`:

```js
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
```

---

## 🔐 Auth Features

* JWT-based login and registration
* bcrypt password hashing
* Token verification middleware

---

## 🧪 Testing Setup

Use Jest and Supertest for testing:

```bash
npm test
```

---

## 🌱 SQL DB Flexibility

Want to use PostgreSQL instead of MySQL?

* Just change this line in `schema.prisma`:

  ```prisma
  provider = "postgresql"
  ```
* Update your `.env` accordingly:

  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  ```

Run:

```bash
npx prisma migrate dev --name <name>
```

---

## Prisma Client Initialization Error: What It Means and How to Fix It

### Error Message

```
C:\Users\user\Desktop\shopManagementSystem\Backend\node_modules\.prisma\client\default.js:43
    throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
    ^

Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
    at new PrismaClient (C:\Users\user\Desktop\shopManagementSystem\Backend\node_modules\.prisma\client\default.js:43:11)
    ...
Node.js v22.14.0
```

---

### What Does This Error Mean?

This error occurs when your application tries to use Prisma Client (`@prisma/client`) before it has been properly generated. Prisma Client is an auto-generated database client based on your Prisma schema. If the generated files are missing or out of sync, Prisma cannot initialize and throws this error.

---

### Why Does This Happen?

- **You have not run `npx prisma generate`** after setting up or updating your Prisma schema.
- **The generated client files are missing** from `node_modules/@prisma/client`.
- **You may have a custom output directory** in your `schema.prisma` generator block, causing Prisma to generate the client somewhere else (e.g., a `generated` folder instead of the default location).

---

### How Did We Solve It?

1. **Check the `generator` block in `prisma/schema.prisma`:**

   Make sure it looks like this (no custom `output` path):

   ```prisma
   generator client {
     provider = "prisma-client-js"
   }
   ```

2. **Delete any incorrectly generated folders** (like a `generated` folder in your project root).

3. **Run the generate command in your project root:**

   ```bash
   npx prisma generate
   ```

   You should see output like:

   ```
   Prisma Client generated to ./node_modules/@prisma/client in ...
   ```

4. **Restart your server** so it picks up the newly generated Prisma Client.

---

### Summary

- This error means Prisma Client is missing or not generated in the expected location.
- Always run `npx prisma generate` after changing your schema or setting up a new project.
- Ensure your `schema.prisma` does not have a custom `output` unless you know what you’re doing.
- Restart your server after generating the client.

By following these steps, you ensure that Prisma Client is correctly initialized and your application can connect to the database without issues.


## 🔚 Summary

This backend template will help you:

* Save time
* Reuse secure and tested code
* Support multiple SQL databases
* Document APIs
* Write clean and scalable code
