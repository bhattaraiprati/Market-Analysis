# Quick Start Guide

Get up and running with the Strategic Growth Intelligence Platform API in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (should be v18+)
node --version

# Check PostgreSQL (should be v14+)
psql --version

# Check if PostgreSQL is running
pg_isready
```

## 1. Setup (First Time Only)

```bash
# Install dependencies
npm install

# Create PostgreSQL database
createdb market_analysis

# The .env file is already configured with default values
# Edit if your PostgreSQL settings are different
```

## 2. Start the Server

```bash
npm run start:dev
```

You should see:
```
🚀 Application is running on: http://localhost:4000
📚 Swagger documentation: http://localhost:4000/api/docs
```

## 3. Test the APIs

### Option A: Using Swagger UI (Easiest)
1. Open browser: `http://localhost:4000/api/docs`
2. Click "Try it out" on any endpoint
3. Fill in the request body
4. Click "Execute"

### Option B: Using cURL

#### Register a user:
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Save the token from the response!**

#### Create organization:
```bash
# Replace YOUR_TOKEN_HERE with the actual token from login
curl -X POST http://localhost:4000/auth/organization \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "industry": "Technology",
    "product_or_service": "We build amazing software products",
    "target_customers": "Small businesses looking for tech solutions",
    "business_goals": "Reach 100 customers in 6 months"
  }'
```

#### Get profile:
```bash
curl -X GET http://localhost:4000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 4. Verify Everything Works

You should be able to:
- ✅ Register a new user
- ✅ Login and receive a JWT token
- ✅ Create an organization with the token
- ✅ View your profile with organization details

## Common Issues

### "Connection refused" or can't connect to database
```bash
# Start PostgreSQL
# On macOS with Homebrew:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# On Windows: Start PostgreSQL service from Services panel
```

### "Database does not exist"
```bash
createdb market_analysis
```

### "Port 4000 is already in use"
Change the PORT in `.env` file:
```env
PORT=5000
```

### "Unauthorized" on protected routes
Make sure you're including the Bearer token:
```bash
Authorization: Bearer YOUR_ACTUAL_TOKEN
```

## Project Structure Quick Reference

```
src/
├── auth/           # Authentication & authorization
├── models/         # Database models (User, Organization, etc.)
├── config/         # Configuration files
└── main.ts         # Application entry point
```

## Environment Variables

Edit `.env` file if needed:
```env
DB_HOST=localhost        # PostgreSQL host
DB_PORT=5432            # PostgreSQL port
DB_USERNAME=postgres    # Your PostgreSQL username
DB_PASSWORD=postgres    # Your PostgreSQL password
DB_NAME=market_analysis # Database name

JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=5h

PORT=4000
NODE_ENV=development
```

## Development Workflow

```bash
# Start dev server (auto-reloads on changes)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint
```

## API Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | No | Register new user |
| POST | /auth/login | No | Login & get token |
| POST | /auth/organization | Yes | Create organization |
| GET | /auth/profile | Yes | Get user profile |
| GET | /auth/me | Yes | Verify token |

## What's Next?

1. Review the full documentation:
   - `README.md` - Complete project overview
   - `API_TESTING.md` - Detailed API testing guide
   - `IMPLEMENTATION_SUMMARY.md` - Technical details

2. Explore Swagger documentation:
   - `http://localhost:4000/api/docs`

3. Start building the research modules:
   - Competitor Research Service
   - Market Research Service
   - Customer Voice Research Service

## Need Help?

- Check server logs in the terminal
- Review error messages (they're descriptive)
- Ensure PostgreSQL is running
- Verify .env configuration
- Check that all dependencies are installed

## Success Checklist

- ✅ PostgreSQL is running
- ✅ Database `market_analysis` exists
- ✅ Dependencies installed (`npm install`)
- ✅ Server starts without errors
- ✅ Can access Swagger UI
- ✅ Can register a user
- ✅ Can login and get token
- ✅ Can create organization
- ✅ Can view profile

🎉 **You're ready to go!**
