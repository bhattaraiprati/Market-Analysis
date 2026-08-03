# Frontend API Integration Guide

## Base URL
```
Local Development: http://localhost:3000
Production: [Your production URL]
```

## API Documentation
Swagger UI: `http://localhost:3000/api/docs`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register User
**POST** `/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "name": "string (2-100 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars, must contain uppercase, lowercase, number, special char)"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "created_at": "timestamp"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - User already exists

---

### 1.2 Login
**POST** `/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Account not active or email not verified

---

### 1.3 Create Organization
**POST** `/auth/organization`

**Access:** Private (Authenticated users)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (2-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "industry": "string (2-100 chars)",
  "website": "string (optional, valid URL)",
  "product_or_service": "string (10-2000 chars)",
  "target_customers": "string (10-2000 chars)",
  "business_goals": "string (10-2000 chars)",
  "current_challenges": "string (optional, max 2000 chars)",
  "known_competitors": ["string"] (optional array),
  "company_size": "string (optional, max 50 chars)",
  "location": "string (optional, max 200 chars)"
}
```

**Response:** `201 Created`
```json
{
  "message": "Organization created successfully",
  "organization": {
    "id": "uuid",
    "name": "string",
    "industry": "string",
    "owner_id": "uuid",
    "created_at": "timestamp"
  }
}
```

**Error Responses:**
- `409` - User already has an organization
- `401` - Unauthorized

---

### 1.4 Get User Profile
**GET** `/auth/profile`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  },
  "organization": {
    "id": "uuid",
    "name": "string",
    "industry": "string",
    "description": "string",
    "website": "string",
    "product_or_service": "string",
    "target_customers": "string",
    "business_goals": "string"
  }
}
```

---

### 1.5 Verify Token
**GET** `/auth/me`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Token is valid",
  "user": {
    "id": "uuid",
    "email": "string"
  }
}
```

---

## 2. Research Endpoints

### 2.1 Start Research
**POST** `/research/start`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "researchType": "COMPETITOR | MARKET | CUSTOMER | COMPREHENSIVE",
  "parameters": {
    "focusAreas": ["pricing", "features"]
  }
}
```

**Response:** `201 Created`
```json
{
  "job_id": "uuid",
  "status": "PENDING | IN_PROGRESS",
  "research_type": "COMPETITOR",
  "created_at": "timestamp"
}
```

---

### 2.2 Get All Research Jobs
**GET** `/research/jobs`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "id": "uuid",
      "research_type": "COMPETITOR",
      "status": "PENDING | IN_PROGRESS | COMPLETED | FAILED",
      "created_at": "timestamp",
      "completed_at": "timestamp",
      "organization_id": "uuid"
    }
  ]
}
```

---

### 2.3 Get Research Job Status
**GET** `/research/jobs/:jobId`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "research_type": "COMPETITOR",
  "status": "COMPLETED",
  "created_at": "timestamp",
  "completed_at": "timestamp",
  "output_results": {
    "competitors": [...],
    "analysis": {...},
    "report": {
      "markdown": "string"
    }
  }
}
```

---

### 2.4 Get Research Job Sources
**GET** `/research/jobs/:jobId/sources`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "sources": [
    {
      "id": "uuid",
      "url": "string",
      "title": "string",
      "content": "string",
      "scraped_at": "timestamp",
      "competitor_name": "string"
    }
  ]
}
```

---

### 2.5 Download Research Report
**GET** `/research/jobs/:jobId/report`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```
Content-Type: text/markdown

# Research Report
...markdown content...
```

**Error Responses:**
- `404` - Report not available

---

## 3. Knowledge Base Endpoints

### 3.1 Create Knowledge Base
**POST** `/knowledge-bases`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (3-255 chars)",
  "description": "string (optional, max 2000 chars)",
  "category": "string (optional, max 100 chars)",
  "tags": ["string"] (optional),
  "visibility": "PRIVATE | ORGANIZATION | PUBLIC"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Knowledge base created successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "category": "string",
    "tags": ["string"],
    "visibility": "PRIVATE",
    "created_by": "uuid",
    "organization_id": "uuid",
    "created_at": "timestamp"
  }
}
```

---

### 3.2 Get All Knowledge Bases
**GET** `/knowledge-bases`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Knowledge bases retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "category": "string",
      "visibility": "PRIVATE",
      "file_count": 0,
      "total_chunks": 0,
      "created_at": "timestamp"
    }
  ],
  "count": 1
}
```

---

### 3.3 Get Knowledge Base by ID
**GET** `/knowledge-bases/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Knowledge base retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "files": [
      {
        "id": "uuid",
        "file_name": "string",
        "file_type": "PDF | DOCX | TXT",
        "file_size": 1024,
        "status": "PENDING | PROCESSING | COMPLETED | FAILED",
        "chunk_count": 10,
        "uploaded_at": "timestamp"
      }
    ]
  }
}
```

---

### 3.4 Update Knowledge Base
**PATCH** `/knowledge-bases/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "category": "string (optional)",
  "tags": ["string"] (optional),
  "visibility": "PRIVATE | ORGANIZATION | PUBLIC (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Knowledge base updated successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "updated_at": "timestamp"
  }
}
```

---

### 3.5 Delete Knowledge Base
**DELETE** `/knowledge-bases/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Knowledge base deleted successfully"
}
```

---

### 3.6 Upload Files to Knowledge Base
**POST** `/knowledge-bases/:id/files`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
files: File[] (max 10 files, each max 50MB)
Supported types: PDF, DOCX, TXT
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "5 file(s) uploaded and queued for processing",
  "data": [
    {
      "id": "uuid",
      "file_name": "document.pdf",
      "file_type": "PDF",
      "file_size": 1024000,
      "status": "PENDING",
      "uploaded_at": "timestamp"
    }
  ],
  "info": "Files are being processed in the background. Check the file status for processing updates."
}
```

---

### 3.7 Query Knowledge Bases
**POST** `/knowledge-bases/query`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "string (required)",
  "knowledge_base_ids": ["uuid"] (optional, filter by specific KBs),
  "top_k": 10 (optional, default 10),
  "min_score": 0.7 (optional, default 0.7)
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Query executed successfully",
  "data": [
    {
      "chunk_id": "uuid",
      "content": "string",
      "similarity_score": 0.85,
      "metadata": {
        "file_name": "string",
        "knowledge_base_name": "string",
        "page_number": 1
      }
    }
  ],
  "count": 5
}
```

---

### 3.8 Get Knowledge Base Statistics
**GET** `/knowledge-bases/:id/statistics`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "total_files": 10,
    "total_chunks": 250,
    "total_size_bytes": 10485760,
    "files_by_status": {
      "COMPLETED": 8,
      "PROCESSING": 1,
      "FAILED": 1
    },
    "files_by_type": {
      "PDF": 5,
      "DOCX": 3,
      "TXT": 2
    }
  }
}
```

---

### 3.9 Delete File from Knowledge Base
**DELETE** `/knowledge-bases/:id/files/:fileId`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## 4. Persona Endpoints

### 4.1 Create Persona
**POST** `/personas`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (3-255 chars)",
  "description": "string (optional, max 2000 chars)",
  "primary_focus_role": "COMPETITIVE_ANALYST | MARKET_RESEARCHER | CUSTOMER_SUCCESS_EXPERT | BUSINESS_STRATEGIST | GENERAL_ASSISTANT",
  "knowledge_base_ids": ["uuid"] (optional),
  "web_search_enabled": true (optional),
  "external_data_sources_enabled": false (optional),
  "avatar_url": "string (optional)",
  "system_prompt": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Persona created successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "primary_focus_role": "COMPETITIVE_ANALYST",
    "web_search_enabled": true,
    "created_by": "uuid",
    "organization_id": "uuid",
    "created_at": "timestamp"
  }
}
```

---

### 4.2 Get All Personas
**GET** `/personas`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Personas retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "primary_focus_role": "COMPETITIVE_ANALYST",
      "avatar_url": "string",
      "knowledge_bases": [
        {
          "id": "uuid",
          "name": "string"
        }
      ],
      "created_at": "timestamp"
    }
  ],
  "count": 5
}
```

---

### 4.3 Get Persona by ID
**GET** `/personas/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "primary_focus_role": "COMPETITIVE_ANALYST",
    "web_search_enabled": true,
    "external_data_sources_enabled": false,
    "system_prompt": "string",
    "knowledge_bases": [...],
    "shared_with": [
      {
        "user_id": "uuid",
        "user_name": "string",
        "permission_type": "VIEW | EDIT"
      }
    ]
  }
}
```

---

### 4.4 Update Persona
**PATCH** `/personas/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "primary_focus_role": "COMPETITIVE_ANALYST (optional)",
  "web_search_enabled": true (optional),
  "external_data_sources_enabled": false (optional),
  "avatar_url": "string (optional)",
  "system_prompt": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona updated successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "updated_at": "timestamp"
  }
}
```

---

### 4.5 Delete Persona
**DELETE** `/personas/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona deleted successfully"
}
```

---

### 4.6 Share Persona with Users
**POST** `/personas/:id/share`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_ids": ["uuid"],
  "permission_type": "VIEW | EDIT"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona shared with 2 user(s)",
  "data": [
    {
      "user_id": "uuid",
      "persona_id": "uuid",
      "permission_type": "VIEW",
      "created_at": "timestamp"
    }
  ]
}
```

---

### 4.7 Generate Public Link
**POST** `/personas/:id/generate-link/public`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Public link generated successfully",
  "data": {
    "public_link_token": "random_token_string",
    "public_link_enabled": true,
    "public_link_url": "http://localhost:3000/personas/public/random_token_string"
  }
}
```

---

### 4.8 Generate Organization Link
**POST** `/personas/:id/generate-link/organization`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Organization link generated successfully",
  "data": {
    "organization_link_token": "random_token_string",
    "organization_link_enabled": true,
    "organization_link_url": "http://localhost:3000/personas/org/random_token_string"
  }
}
```

---

### 4.9 Disable Public Link
**DELETE** `/personas/:id/link/public`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Public link disabled successfully"
}
```

---

### 4.10 Disable Organization Link
**DELETE** `/personas/:id/link/organization`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Organization link disabled successfully"
}
```

---

### 4.11 Get Persona by Public Link
**GET** `/personas/public/:token`

**Access:** Public

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "primary_focus_role": "COMPETITIVE_ANALYST",
    "avatar_url": "string"
  }
}
```

---

### 4.12 Get Persona by Organization Link
**GET** `/personas/org/:token`

**Access:** Private (Must be in same organization)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Persona retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "primary_focus_role": "COMPETITIVE_ANALYST"
  }
}
```

---

### 4.13 Assign Knowledge Base to Persona
**POST** `/personas/:id/knowledge-bases`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "knowledge_base_id": "uuid"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Knowledge base assigned successfully",
  "data": {
    "persona_id": "uuid",
    "knowledge_base_id": "uuid",
    "assigned_at": "timestamp"
  }
}
```

---

### 4.14 Remove Knowledge Base from Persona
**DELETE** `/personas/:id/knowledge-bases/:kbId`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Knowledge base removed successfully"
}
```

---

## 5. Conversation Endpoints

### 5.1 Create Conversation
**POST** `/conversations`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "persona_id": "uuid",
  "title": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "persona_id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "title": "string",
    "status": "ACTIVE",
    "created_at": "timestamp"
  }
}
```

---

### 5.2 Get All Conversations
**GET** `/conversations?persona_id=uuid`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `persona_id` (optional): Filter by specific persona

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "persona_id": "uuid",
      "persona_name": "string",
      "title": "string",
      "status": "ACTIVE | ARCHIVED",
      "last_message_at": "timestamp",
      "message_count": 10,
      "created_at": "timestamp"
    }
  ],
  "count": 5
}
```

---

### 5.3 Get Conversation with Messages
**GET** `/conversations/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "persona_id": "uuid",
    "persona": {
      "id": "uuid",
      "name": "string",
      "avatar_url": "string"
    },
    "title": "string",
    "status": "ACTIVE",
    "messages": [
      {
        "id": "uuid",
        "role": "USER | ASSISTANT | SYSTEM",
        "content": "string",
        "rating": 5,
        "feedback": "string",
        "sources_used": [
          {
            "type": "KNOWLEDGE_BASE | WEB_SEARCH | EXTERNAL_API",
            "reference": "string",
            "relevance_score": 0.85
          }
        ],
        "created_at": "timestamp"
      }
    ],
    "created_at": "timestamp",
    "last_message_at": "timestamp"
  }
}
```

---

### 5.4 Send Message
**POST** `/conversations/:id/messages`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "string (max 10000 chars)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversation_id": "uuid",
    "role": "USER",
    "content": "string",
    "created_at": "timestamp"
  },
  "message": "Message sent. Response will be generated shortly."
}
```

---

### 5.5 Rate Message
**POST** `/conversations/:id/messages/:messageId/rate`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "rating": 1 | 2 | 3 | 4 | 5,
  "feedback": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Message rated successfully"
}
```

---

### 5.6 Archive Conversation
**DELETE** `/conversations/:id/archive`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Conversation archived successfully"
}
```

---

### 5.7 Delete Conversation
**DELETE** `/conversations/:id`

**Access:** Private

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Invalid or missing token)
- `403` - Forbidden (Valid token but insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Resource already exists)
- `500` - Internal Server Error

---

## CORS Configuration

The API allows CORS requests from:
- Local development: `http://localhost:3000`
- Configure `FRONTEND_URL` environment variable for production

Credentials are enabled for cookie-based authentication.

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production.

---

## WebSocket Support

For real-time message streaming in conversations, consider implementing WebSocket connections. Currently, the API uses polling (GET `/conversations/:id` after sending a message).

---

## Best Practices

1. **Token Storage**: Store JWT tokens securely (httpOnly cookies or secure storage)
2. **Token Refresh**: Implement token refresh mechanism
3. **Error Handling**: Always handle error responses appropriately
4. **Loading States**: Show loading indicators during API calls
5. **File Uploads**: Use FormData for file uploads with progress indicators
6. **Pagination**: Implement pagination for list endpoints (future enhancement)
7. **Caching**: Cache GET requests where appropriate
8. **Retry Logic**: Implement retry logic for failed requests
9. **Request Cancellation**: Cancel pending requests when component unmounts

---

## Example API Client (TypeScript/Axios)

```typescript
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: RegisterDto) {
    return this.client.post('/auth/register', data);
  }

  async login(data: LoginDto) {
    const response = await this.client.post('/auth/login', data);
    localStorage.setItem('access_token', response.data.access_token);
    return response;
  }

  // Research
  async startResearch(data: StartResearchDto) {
    return this.client.post('/research/start', data);
  }

  async getResearchJobs() {
    return this.client.get('/research/jobs');
  }

  // Knowledge Bases
  async createKnowledgeBase(data: CreateKnowledgeBaseDto) {
    return this.client.post('/knowledge-bases', data);
  }

  async uploadFiles(kbId: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return this.client.post(`/knowledge-bases/${kbId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Personas
  async createPersona(data: CreatePersonaDto) {
    return this.client.post('/personas', data);
  }

  async getPersonas() {
    return this.client.get('/personas');
  }

  // Conversations
  async createConversation(data: CreateConversationDto) {
    return this.client.post('/conversations', data);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.client.post(`/conversations/${conversationId}/messages`, { content });
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
```

---

## Environment Variables

Create a `.env.local` file in your frontend project:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

---

## Testing the API

Use the Swagger UI at `http://localhost:3000/api/docs` to test all endpoints interactively.

Or use curl:

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Test@123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Test@123"}'

# Get Profile (with token)
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Additional Notes

1. All timestamps are in ISO 8601 format
2. All IDs are UUIDs (v4)
3. The API uses PostgreSQL for data storage
4. File processing happens asynchronously in the background
5. Conversation responses are generated by AI agents and may take a few seconds
6. Knowledge base queries use vector similarity search (pgvector)

---

**Last Updated:** 2026-08-03
**API Version:** 1.0
