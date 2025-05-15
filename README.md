# Gym Membership and Trainer Scheduling System

A Node.js & MySQL–based web application to manage gym memberships, trainer schedules, and session bookings.  
Built with Express.js and EJS templating. Users include **members**, **trainers**, and **admins**.

---

## 📁 Project Structure

```
GYMPROJECT/
├── app/
│   ├── app.js                # Main Express application
│   ├── db.js                 # Database connection config (⚠️ ignored in Git)
│   ├── middleware/           # Auth & role-based access control
│   │   ├── isAdmin.js
│   │   └── isAuthenticated.js
│   ├── routes/               # Express route handlers
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── dashboard.js
│   │   ├── members.js
│   │   ├── sessions.js
│   │   └── trainers.js
│   ├── static/               # Public static assets (CSS, JS, images)
│   └── views/                # EJS view templates
├── database/
│   ├── schema.sql            # Table schema
│   ├── gym_project_insert.sql # Sample insert data (optional)
│   ├── SQLQuery_1.sql        # Example advanced query
│   └── SQLQuery_2.sql        # Example advanced query
├── docs/                     # Project documentation files
├── .gitignore
├── how_to_run.txt            # Manual instructions
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 📋 Prerequisites

- Node.js (v14 or newer) & npm  
- MySQL Server  
- Git (to clone the project)

---

### 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/0xumutkk/GymSchedulingSystem.git
   cd GymSchedulingSystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database connection**  
   Copy the template and edit it:
   ```bash
   cp app/db.js.example app/db.js
   ```

   Inside `app/db.js`:
   ```js
   module.exports = {
     host: 'localhost',
     port: 3306,
     user: 'your_mysql_username',
     password: 'your_mysql_password',
     database: 'gym_db'
   };
   ```

---

## 🗄️ Database Setup

1. **Create the database**
   ```sql
   CREATE DATABASE gym_db;
   ```

2. **Import schema**
   ```bash
   mysql -u root -p gym_db < database/schema.sql
   ```

3. **(Optional) Insert sample data**
   ```bash
   mysql -u root -p gym_db < database/gym_project_insert.sql
   ```

4. **(Optional) Run example queries**
   ```bash
   mysql -u root -p gym_db < database/SQLQuery_1.sql
   ```

---

## ▶️ Running the App

```bash
node app/app.js
```

The app will run on: `http://localhost:3000`

> Use login interfaces for admin, member, or trainer depending on role.

Or run in development mode:
```bash
npm run dev
```

---

## 👤 User Roles

| Role     | Abilities                              |
|----------|-----------------------------------------|
| Admin    | Manage all users, trainers, and reports |
| Trainer  | Manage sessions, view bookings          |
| Member   | Browse and book available sessions      |

---

## ❗ Troubleshooting

- **“ECONNREFUSED”** → MySQL is not running or credentials are incorrect in `db.js`  
- **404s on views** → Check EJS template names under `views/`  
- **Static files not loading** → Ensure `/static/` is properly served in `app.js`  

---

## 📄 License

This project is intended for educational use.  
You are free to modify, fork, and extend it for your own gym or school projects.
