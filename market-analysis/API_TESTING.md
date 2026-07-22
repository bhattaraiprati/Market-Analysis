# API Testing Guide

This guide provides step-by-step instructions for testing the authentication and organization registration APIs.

## Prerequisites

1. Ensure PostgreSQL is running
2. Create the database:
```bash
createdb market_analysis
```

3. Start the application:
```bash
npm run start:dev
```

The server will run on `http://localhost:4000` (configured in .env)

## Base URL

```
http://localhost:4000
```

## API Documentation

Interactive Swagger documentation is available at:
```
http://localhost:4000/api/docs
```

---

## 1. User Registration

### Endpoint
```
POST /auth/register
```

### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Success Response (201 Created)
```json
{
  "message": "User registered successfully. You can now log in.",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Responses

**409 Conflict** - User already exists
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**400 Bad Request** - Validation error
```json
{
  "statusCode": 400,
  "message": [
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  ],
  "error": "Bad Request"
}
```

### cURL Example
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 2. User Login

### Endpoint
```
POST /auth/login
```

### Request Body
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

### Success Response (200 OK)
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "USER",
    "profilePicture": "https://www.gravatar.com/avatar/abc123...?d=robohash",
    "organizationId": null,
    "organizationName": null,
    "organizationStatus": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZSI6IlVTRVIiLCJvcmdhbml6YXRpb25JZCI6bnVsbCwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE2NDAwMTgwMDB9.signature",
  "expiresIn": "5h",
  "expiresAt": 1640018000,
  "message": "Login successful"
}
```

**Important**: Save the `token` value for subsequent authenticated requests.

### Error Responses

**404 Not Found** - User doesn't exist or wrong credentials
```json
{
  "statusCode": 404,
  "message": "Invalid credentials",
  "error": "Not Found"
}
```

**401 Unauthorized** - Wrong password
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**403 Forbidden** - Account not active
```json
{
  "statusCode": 403,
  "message": "Your account is not active. Please contact support.",
  "error": "Forbidden"
}
```

### cURL Example
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 3. Create Organization

### Endpoint
```
POST /auth/organization
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "name": "Tech Startup Inc",
  "description": "An innovative SaaS company building AI-powered solutions",
  "industry": "Software Development",
  "website": "https://techstartup.com",
  "product_or_service": "We provide AI-powered business intelligence tools that help companies analyze market trends, understand competitors, and make data-driven strategic decisions.",
  "target_customers": "Small to medium-sized businesses in the technology sector, particularly startups and scale-ups looking to gain competitive advantage through data-driven insights.",
  "business_goals": "Achieve 1000 paying customers by Q4 2024, expand to international markets, and establish partnerships with major cloud providers.",
  "current_challenges": "Limited market visibility, difficulty in customer acquisition, competing with established players, need for more marketing resources.",
  "known_competitors": ["Competitor A", "Competitor B", "Competitor C"],
  "company_size": "10-50 employees",
  "location": "San Francisco, CA, USA"
}
```

### Field Requirements

**Required Fields:**
- `name` (2-200 characters)
- `industry` (2-100 characters)
- `product_or_service` (10-2000 characters)
- `target_customers` (10-2000 characters)
- `business_goals` (10-2000 characters)

**Optional Fields:**
- `description` (max 1000 characters)
- `website` (valid URL, max 255 characters)
- `current_challenges` (max 2000 characters)
- `known_competitors` (array of strings)
- `company_size` (max 50 characters)
- `location` (max 200 characters)

### Success Response (201 Created)
```json
{
  "message": "Organization created successfully. Awaiting admin approval.",
  "organization": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Tech Startup Inc",
    "status": "PENDING_APPROVAL"
  }
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**409 Conflict** - User already has an organization
```json
{
  "statusCode": 409,
  "message": "You are already part of an organization",
  "error": "Conflict"
}
```

**400 Bad Request** - Validation error
```json
{
  "statusCode": 400,
  "message": [
    "Product or service description must be at least 10 characters"
  ],
  "error": "Bad Request"
}
```

### cURL Example
```bash
curl -X POST http://localhost:4000/auth/organization \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Startup Inc",
    "description": "An innovative SaaS company",
    "industry": "Software Development",
    "website": "https://techstartup.com",
    "product_or_service": "We provide AI-powered business intelligence tools",
    "target_customers": "Small to medium-sized businesses in tech",
    "business_goals": "Achieve 1000 paying customers by Q4 2024",
    "current_challenges": "Limited market visibility",
    "known_competitors": ["Competitor A", "Competitor B"],
    "company_size": "10-50 employees",
    "location": "San Francisco, CA"
  }'
```

---

## 4. Get User Profile

### Endpoint
```
GET /auth/profile
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "USER",
  "profilePicture": "https://www.gravatar.com/avatar/abc123...?d=robohash",
  "isVerified": true,
  "status": "ACTIVE",
  "organization": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Tech Startup Inc",
    "status": "PENDING_APPROVAL",
    "industry": "Software Development",
    "memberRole": "OWNER"
  }
}
```

### cURL Example
```bash
curl -X GET http://localhost:4000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Verify Token

### Endpoint
```
GET /auth/me
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Success Response (200 OK)
```json
{
  "message": "Token is valid",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER",
    "organizationId": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

### cURL Example
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Complete Testing Flow

### Step 1: Register a new user
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@startup.com",
    "password": "MySecure123!"
  }'
```

### Step 2: Login to get JWT token
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@startup.com",
    "password": "MySecure123!"
  }'
```

Save the token from the response.

### Step 3: Create organization
```bash
export TOKEN="your_jwt_token_here"

curl -X POST http://localhost:4000/auth/organization \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome Startup",
    "industry": "Technology",
    "product_or_service": "Building innovative solutions for modern businesses",
    "target_customers": "Tech-savvy small business owners",
    "business_goals": "Reach 500 customers in first year"
  }'
```

### Step 4: Get profile with organization
```bash
curl -X GET http://localhost:4000/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing with Postman

1. Import the following environment variables:
   - `base_url`: `http://localhost:4000`
   - `token`: (will be set automatically after login)

2. Create a collection with the following requests:
   - Register User
   - Login
   - Create Organization
   - Get Profile
   - Verify Token

3. In the Login request, add a test script to save the token:
```javascript
pm.test("Save token", function () {
    var jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
});
```

4. For authenticated endpoints, use:
   - Authorization Type: Bearer Token
   - Token: `{{token}}`

---

## Common Issues & Solutions

### Issue: "Unauthorized" on protected routes
**Solution**: Ensure you're including the Bearer token in the Authorization header.

### Issue: Token expired
**Solution**: Login again to get a fresh token (tokens expire after 5 hours by default).

### Issue: Database connection error
**Solution**: 
1. Check PostgreSQL is running: `pg_isready`
2. Verify .env database credentials
3. Ensure database exists: `psql -l | grep market_analysis`

### Issue: "User already has an organization"
**Solution**: Each user can only create/join one organization. Use a different user account.

---

## Next Steps

After successfully testing the authentication and organization APIs:

1. Test with multiple users
2. Test edge cases (invalid data, missing fields, etc.)
3. Verify token expiration handling
4. Test organization status workflows
5. Prepare for building the research pipeline modules

---

## Support

For issues or questions:
- Check the Swagger documentation at `http://localhost:4000/api/docs`
- Review server logs in the terminal
- Ensure all dependencies are installed: `npm install`
