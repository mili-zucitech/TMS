# TMS (Timesheet Management System)

Enterprise Timesheet Management System built with Spring Boot backend and React frontend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Java 21** - [Download from Oracle](https://www.oracle.com/java/technologies/javase/jdk21-archive-downloads.html) or use [SDKMAN](https://sdkman.io/)
- **Maven 3.9+** - [Download here](https://maven.apache.org/download.cgi)
- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **MySQL 8.0+** - [Download here](https://dev.mysql.com/downloads/mysql/) or use Docker

### Optional but Recommended
- **Git** - For version control

### Verify Installation

```bash
# Check Java
java -version

# Check Maven
mvn -version

# Check Node.js
node -version
npm -version
```

---

## Project Structure

```
tms-copilot/
├── tms-backend/           # Spring Boot backend (Java)
│   ├── src/main/java/     # Backend source code
│   ├── src/main/resources/db/migration/  # Database migrations
│   ├── pom.xml            # Maven configuration
│   └── Dockerfile         # Docker configuration
├── tms-frontend/          # React frontend (TypeScript)
│   ├── src/               # Frontend source code
│   ├── e2e/               # End-to-end tests (Playwright)
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
└── project-specs/         # Project documentation
```

---

## Quick Start

### Step-by-Step Setup

1. **Start MySQL** - Ensure MySQL service is running
2. **Build & Run Backend** - Navigate to `tms-backend` and run Maven
3. **Install & Run Frontend** - Navigate to `tms-frontend` and run Node

Follow the detailed steps below for [Backend Setup](#backend-setup) and [Frontend Setup](#frontend-setup).

---

## Backend Setup

### Step 1: Start MySQL Database

Ensure MySQL is installed and running on your system.

#### On Windows
1. Start MySQL from Services or run:
```bash
mysqld --console
```
Or if installed via MySQL Installer, use MySQL Workbench or command line.

#### On macOS
```bash
# If installed via Homebrew
brew services start mysql

# Or manually start
mysql.server start
```

#### On Linux
```bash
sudo systemctl start mysql
# or
sudo service mysql start
```

#### Create the Database
```bash
mysql -u root -p
# Enter your MySQL password when prompted

# In MySQL shell:
CREATE DATABASE tms;
EXIT;
```

### Step 2: Navigate to Backend Directory

```bash
cd tms-backend
```

### Step 3: Install Dependencies

```bash
mvn clean install
```

### Step 4: Configure Environment Variables (Optional)

Create a `.env` file in the `tms-backend` directory or set system environment variables:

```bash
# Database Configuration
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/tms?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
export SPRING_DATASOURCE_USERNAME=root
export SPRING_DATASOURCE_PASSWORD=root

# Mail Configuration (Gmail example)
export SPRING_MAIL_HOST=smtp.gmail.com
export SPRING_MAIL_PORT=587
export SPRING_MAIL_USERNAME=your-email@gmail.com
export SPRING_MAIL_PASSWORD=your-app-password  # 16-char App Password from Gmail
```

### Step 5: Run the Backend

```bash
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

**Note:** Database migrations run automatically via Flyway. If you see any errors, check the `src/main/resources/db/migration/` directory.

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd tms-frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run in Development Mode

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (Vite default)

### Step 4 (Optional): Build for Production

```bash
npm run build
npm run preview
```

---

## Running the Application

### Start Everything

**Terminal 1 - Backend:**
```bash
cd tms-backend
mvn spring-boot:run
```
Runs on: `http://localhost:8080`

**Terminal 2 - Frontend:**
```bash
cd tms-frontend
npm run dev
```
Runs on: `http://localhost:5173`

**Terminal 3 - MySQL (ensure service is running):**
```bash
# On Windows: Start MySQL service from Services or use MySQL command line
# On macOS: brew services start mysql
# On Linux: sudo systemctl start mysql

# Verify MySQL is running:
mysql -u root -p -e "SELECT 1;"
```

### Access the Application

- **Frontend UI:** http://localhost:5173
- **Backend API:** http://localhost:8080
- **API Documentation:** http://localhost:8080/swagger-ui.html (if Swagger is configured)

---

## Environment Variables

### Backend (`tms-backend/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/tms?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true` | MySQL connection URL |
| `SPRING_DATASOURCE_USERNAME` | `root` | MySQL username |
| `SPRING_DATASOURCE_PASSWORD` | `root` | MySQL password |
| `SPRING_MAIL_HOST` | `smtp.gmail.com` | Mail server host |
| `SPRING_MAIL_PORT` | `587` | Mail server port |
| `SPRING_MAIL_USERNAME` | `milisrivastava.zucitech@gmail.com` | Email sender address |
| `SPRING_MAIL_PASSWORD` | *(required)* | Email sender password or App Password |

**Important:** Never hardcode credentials in production. Use environment variables or a secrets manager.

### Frontend (`tms-frontend/`)

Check `tms-frontend/src/config/` for API endpoint configuration.

---

## Database Setup

### Automatic Setup
Database migrations run automatically when the backend starts via **Flyway**. Migration files are located in:
```
tms-backend/src/main/resources/db/migration/
```

### Manual Setup (if needed)
```bash
# Connect to MySQL
mysql -u root -p tms

# View current schema
SHOW TABLES;
DESC users;  # Example: describe the users table
```

### Database Info
- **Database Name:** `tms`
- **Default User:** `root`
- **Default Password:** `root`
- **ORM:** Spring Data JPA with Hibernate
- **Dialect:** MySQL 8.0
- **Driver:** MySQL Connector/J

---

## Testing

### Backend Tests
```bash
cd tms-backend
mvn test
```

### Frontend Unit Tests
```bash
cd tms-frontend
npm run test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### End-to-End Tests (Playwright)
```bash
cd tms-frontend

# Run E2E tests in headless mode
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run E2E tests in headed mode (browser visible)
npm run e2e:headed

# Generate E2E report
npm run e2e:report
```

---

## Building for Production

### Backend
```bash
cd tms-backend
mvn clean package -DskipTests
# JAR file: target/tms-backend-1.0.0.jar
```

### Frontend
```bash
cd tms-frontend
npm run build
# Build output: dist/
```

---

## Troubleshooting

### Issue: Maven dependencies not downloading

**Solution:**
```bash
cd tms-backend
mvn clean install -U  # Force update of dependencies
```

### Issue: Port 8080 already in use (Backend)

**Solution:**
```bash
# Change port in application.yml:
# server:
#   port: 8081

# Or kill the process using the port (Windows):
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Or (macOS/Linux):
lsof -i :8080
kill -9 <PID>
```

### Issue: Port 5173 already in use (Frontend)

**Solution:**
```bash
cd tms-frontend
npm run dev -- --port 5174  # Use different port
```

### Issue: MySQL connection error

**Solution:**
```bash
# Check if MySQL is running
mysql -u root -p -e "SELECT 1;"

# On Windows: Start MySQL service
# Control Panel → Administrative Tools → Services → MySQL... → Start

# On macOS:
brew services start mysql

# On Linux:
sudo systemctl start mysql

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"

# If tms database doesn't exist, create it
mysql -u root -p -e "CREATE DATABASE tms;"

# Verify connection string in application.yml
```

### Issue: Flyway migration errors

**Solution:**
```bash
# Check migration files exist
ls tms-backend/src/main/resources/db/migration/

# Verify MySQL is running
mysql -u root -p -e "USE tms; SELECT * FROM flyway_schema_history;"

# If migrations failed, check application logs for error details

# If you need to reset (WARNING: deletes all data):
mysql -u root -p -e "DROP DATABASE tms; CREATE DATABASE tms;"

# Then restart the backend to re-run migrations
```

### Issue: Java version mismatch

**Solution:**
```bash
# Verify Java version
java -version

# Should be Java 21 or compatible

# If you have multiple Java versions, set JAVA_HOME:
# Windows:
set JAVA_HOME=C:\Program Files\Java\jdk-21

# macOS/Linux:
export JAVA_HOME=/path/to/jdk-21
```

### Issue: Node modules issues

**Solution:**
```bash
cd tms-frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Additional Resources

- **Backend Specs:** [project-specs/api-spec.md](project-specs/api-spec.md)
- **Frontend Specs:** [project-specs/frontend-spec.md](project-specs/frontend-spec.md)
- **Architecture:** [project-specs/architecture.md](project-specs/architecture.md)
- **Database Schema:** [project-specs/database-schema.md](project-specs/database-schema.md)
- **Coding Standards:** [project-specs/CODING_STANDARDS.md](project-specs/CODING_STANDARDS.md)
- **Roadmap:** [project-specs/ROADMAP.md](project-specs/ROADMAP.md)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the logs:
   - Backend: Check console output
   - Frontend: Check browser console (F12)
   - Database: Check Docker logs if using Docker
3. Check project documentation in `project-specs/`

---

## License

Enterprise Timesheet Management System - All rights reserved.
