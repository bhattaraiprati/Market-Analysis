# Knowledge Base API - Complete Examples

## Table of Contents
1. [Authentication](#authentication)
2. [Create Knowledge Base](#1-create-knowledge-base)
3. [List Knowledge Bases](#2-list-all-knowledge-bases)
4. [Get Single Knowledge Base](#3-get-single-knowledge-base)
5. [Update Knowledge Base](#4-update-knowledge-base)
6. [Upload Files](#5-upload-files-to-knowledge-base)
7. [Query Knowledge Base](#6-query-knowledge-base-semantic-search)
8. [Get Statistics](#7-get-file-statistics)
9. [Delete File](#8-delete-specific-file)
10. [Delete Knowledge Base](#9-delete-knowledge-base)

---

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

To get a JWT token, first login or register:

### Register Organization & User
```http
POST http://localhost:4000/auth/register
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organization": {
    "name": "Acme Corporation",
    "industry": "Technology",
    "website": "https://acme.com",
    "product_or_service": "SaaS platform",
    "target_customers": "B2B enterprises",
    "business_goals": "Market expansion"
  }
}
```

### Login
```http
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "admin@company.com",
    "organizationId": "org-uuid"
  }
}
```

---

## 1. Create Knowledge Base

Create a new knowledge base for your organization.

### Request
```http
POST http://localhost:4000/knowledge-bases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Sales Documentation",
  "description": "All sales-related documents, training materials, and playbooks",
  "category": "sales",
  "tags": ["sales", "training", "documentation", "playbooks"],
  "visibility": "organization"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Knowledge base created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "org-uuid-here",
    "created_by": "user-uuid-here",
    "name": "Sales Documentation",
    "description": "All sales-related documents, training materials, and playbooks",
    "category": "sales",
    "tags": ["sales", "training", "documentation", "playbooks"],
    "type": "file_upload",
    "status": "active",
    "visibility": "organization",
    "indexing_status": "pending",
    "total_documents": 0,
    "total_chunks": 0,
    "total_tokens": 0,
    "usage_count": 0,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Field Descriptions
- `name`: Required. 3-255 characters. Display name for the knowledge base.
- `description`: Optional. Detailed description of what this KB contains.
- `category`: Optional. Category for organizing KBs (e.g., "sales", "marketing", "support").
- `tags`: Optional. Array of tags for filtering and search.
- `visibility`: Optional. Who can access this KB:
  - `private`: Only creator
  - `team`: Specific team members
  - `organization`: All organization members

---

## 2. List All Knowledge Bases

Get all knowledge bases for your organization.

### Request
```http
GET http://localhost:4000/knowledge-bases
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Knowledge bases retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Sales Documentation",
      "description": "All sales-related documents...",
      "category": "sales",
      "tags": ["sales", "training"],
      "type": "file_upload",
      "status": "active",
      "visibility": "organization",
      "total_documents": 5,
      "total_chunks": 247,
      "total_tokens": 12350,
      "indexed_at": "2024-01-15T11:00:00.000Z",
      "usage_count": 15,
      "last_used_at": "2024-01-16T09:30:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "files": [
        {
          "id": "file-uuid-1",
          "original_filename": "sales_playbook.pdf",
          "file_type": ".pdf",
          "file_size_bytes": 2048576,
          "processing_status": "completed",
          "indexed": true,
          "uploaded_at": "2024-01-15T10:35:00.000Z"
        },
        {
          "id": "file-uuid-2",
          "original_filename": "product_guide.docx",
          "file_type": ".docx",
          "file_size_bytes": 1024000,
          "processing_status": "processing",
          "indexed": false,
          "uploaded_at": "2024-01-15T10:40:00.000Z"
        }
      ]
    },
    {
      "id": "kb-uuid-2",
      "name": "Marketing Resources",
      "description": "Brand guidelines, templates, case studies",
      "category": "marketing",
      "tags": ["marketing", "branding"],
      "type": "file_upload",
      "status": "active",
      "total_documents": 3,
      "total_chunks": 156,
      "created_at": "2024-01-14T15:20:00.000Z",
      "files": []
    }
  ],
  "count": 2
}
```

---

## 3. Get Single Knowledge Base

Get detailed information about a specific knowledge base.

### Request
```http
GET http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Knowledge base retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "org-uuid",
    "created_by": "user-uuid",
    "name": "Sales Documentation",
    "description": "All sales-related documents, training materials, and playbooks",
    "category": "sales",
    "tags": ["sales", "training", "documentation"],
    "type": "file_upload",
    "status": "active",
    "visibility": "organization",
    "indexing_status": "completed",
    "total_documents": 5,
    "total_chunks": 247,
    "total_tokens": 12350,
    "indexed_at": "2024-01-15T11:00:00.000Z",
    "usage_count": 15,
    "last_used_at": "2024-01-16T09:30:00.000Z",
    "metadata": {},
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "files": [
      {
        "id": "file-uuid-1",
        "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
        "original_filename": "sales_playbook.pdf",
        "file_type": ".pdf",
        "file_size_bytes": 2048576,
        "mime_type": "application/pdf",
        "storage_path": "knowledge-base/org-uuid/kb-uuid/file-uuid-1",
        "storage_url": "https://res.cloudinary.com/...",
        "processing_status": "completed",
        "chunk_count": 89,
        "chunk_strategy": "sliding_window",
        "chunk_size": 512,
        "chunk_overlap": 50,
        "indexed": true,
        "indexed_at": "2024-01-15T10:45:00.000Z",
        "uploaded_at": "2024-01-15T10:35:00.000Z",
        "processed_at": "2024-01-15T10:45:00.000Z",
        "extracted_metadata": {
          "pageCount": 25,
          "wordCount": 5230,
          "charCount": 32145,
          "extractionMethod": "pdf-parse"
        }
      }
    ]
  }
}
```

---

## 4. Update Knowledge Base

Update knowledge base metadata.

### Request
```http
PATCH http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Sales & Marketing Documentation",
  "description": "Updated description with more details",
  "tags": ["sales", "marketing", "training", "updated"],
  "category": "sales-marketing",
  "visibility": "team"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Knowledge base updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Sales & Marketing Documentation",
    "description": "Updated description with more details",
    "tags": ["sales", "marketing", "training", "updated"],
    "category": "sales-marketing",
    "visibility": "team",
    "updated_at": "2024-01-16T10:15:00.000Z"
  }
}
```

---

## 5. Upload a File to a Knowledge Base

Upload one file to a knowledge base. The file is stored as a raw Cloudinary asset and processed asynchronously.

### Supported File Types
- PDF (`.pdf`)
- Word Documents (`.docx`, `.doc`)
- Text files (`.txt`)

### File Limits
- **Max file size**: 50MB
- **Files per request**: 1

### Request (Multipart Form Data)
```http
POST http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000/files
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

file: sales_playbook.pdf
```

### cURL Example
```bash
curl -X POST \
  http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/sales_playbook.pdf"
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "File uploaded and queued for processing",
  "data": {
      "id": "file-uuid-1",
      "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
      "original_filename": "sales_playbook.pdf",
      "file_type": ".pdf",
      "file_size_bytes": 2048576,
      "mime_type": "application/pdf",
      "storage_path": "knowledge-base/org-uuid/kb-uuid/file-uuid-1",
      "storage_url": "https://res.cloudinary.com/your-cloud/raw/upload/v1234567890/knowledge-base/org-uuid/kb-uuid/file-uuid-1.pdf",
      "processing_status": "pending",
      "indexed": false,
      "uploaded_at": "2024-01-15T10:35:00.000Z"
  },
  "info": "The file is being processed in the background. Check its status for processing updates."
}
```

### Processing Status Flow
1. **pending**: File uploaded, waiting to be processed
2. **processing**: Currently extracting text and generating embeddings
3. **completed**: Successfully processed and indexed
4. **failed**: Processing failed (check `processing_error` field)

---

## 6. Query Knowledge Base (Semantic Search)

Perform semantic search across your knowledge bases using natural language queries.

### Request
```http
POST http://localhost:4000/knowledge-bases/query
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "query": "What are the best practices for closing enterprise deals?",
  "knowledge_base_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "top_k": 5,
  "min_score": 0.75
}
```

### Parameters
- `query`: Required. Natural language search query.
- `knowledge_base_ids`: Optional. Array of KB IDs to search. If empty, searches all accessible KBs.
- `top_k`: Optional. Number of results to return (default: 10).
- `min_score`: Optional. Minimum similarity score 0-1 (default: 0.7). Higher = more relevant.

### Response (200 OK)
```json
{
  "success": true,
  "message": "Query executed successfully",
  "data": [
    {
      "id": "file-uuid-1_chunk_45",
      "score": 0.89,
      "metadata": {
        "organization_id": "org-uuid",
        "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
        "file_id": "file-uuid-1",
        "chunk_index": 45,
        "original_text": "Enterprise sales require a consultative approach. Key practices include: 1) Understanding the client's business challenges deeply before proposing solutions. 2) Building relationships with multiple stakeholders across different departments. 3) Demonstrating clear ROI through data-driven case studies. 4) Providing proof of concepts tailored to their specific use case...",
        "file_name": "sales_playbook.pdf",
        "file_type": ".pdf",
        "source_type": "file",
        "timestamp": "2024-01-15T10:45:00.000Z"
      }
    },
    {
      "id": "file-uuid-1_chunk_67",
      "score": 0.85,
      "metadata": {
        "organization_id": "org-uuid",
        "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
        "file_id": "file-uuid-1",
        "chunk_index": 67,
        "original_text": "Closing enterprise deals typically involves a formal procurement process. Best practices: Maintain communication with procurement teams throughout the sales cycle. Prepare comprehensive security and compliance documentation in advance. Be prepared for legal reviews and contract negotiations...",
        "file_name": "sales_playbook.pdf",
        "file_type": ".pdf",
        "source_type": "file",
        "timestamp": "2024-01-15T10:45:00.000Z"
      }
    },
    {
      "id": "file-uuid-2_chunk_23",
      "score": 0.81,
      "metadata": {
        "organization_id": "org-uuid",
        "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
        "file_id": "file-uuid-2",
        "chunk_index": 23,
        "original_text": "Enterprise customers value long-term partnerships. To close deals effectively: demonstrate commitment to their success, provide dedicated support resources, establish clear success metrics, and offer flexible contract terms that align with their budget cycles...",
        "file_name": "product_guide.docx",
        "file_type": ".docx",
        "source_type": "file",
        "timestamp": "2024-01-15T10:50:00.000Z"
      }
    }
  ],
  "count": 3
}
```

### Using Results in Your Application
```javascript
// Example: Display results to user
results.data.forEach(result => {
  console.log(`Relevance: ${(result.score * 100).toFixed(1)}%`);
  console.log(`Source: ${result.metadata.file_name}`);
  console.log(`Content: ${result.metadata.original_text}`);
  console.log('---');
});
```

---

## 7. Get File Statistics

Get processing statistics for files in a knowledge base.

### Request
```http
GET http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000/statistics
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": [
    {
      "processing_status": "completed",
      "count": "3"
    },
    {
      "processing_status": "processing",
      "count": "1"
    },
    {
      "processing_status": "pending",
      "count": "1"
    },
    {
      "processing_status": "failed",
      "count": "0"
    }
  ]
}
```

---

## 8. Delete Specific File

Delete a file from a knowledge base. This removes the file from storage, deletes its vectors from Pinecone, and updates statistics.

### Request
```http
DELETE http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000/files/file-uuid-1
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## 9. Delete Knowledge Base

Delete an entire knowledge base. This soft-deletes the KB, removes all files from storage, and deletes all vectors from Pinecone.

### Request
```http
DELETE http://localhost:4000/knowledge-bases/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Knowledge base deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "name must be at least 3 characters long",
    "tags must be an array"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized - Missing/Invalid Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden - Access Denied
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this knowledge base"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Knowledge base with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### 413 Payload Too Large
```json
{
  "statusCode": 413,
  "message": "File too large. Maximum size is 50MB"
}
```

### 415 Unsupported Media Type
```json
{
  "statusCode": 415,
  "message": "Unsupported file type. Supported types: PDF, DOCX, TXT"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Failed to process file",
  "error": "Internal Server Error"
}
```

---

## Complete Workflow Example

### Step-by-step guide for setting up and using a knowledge base:

```javascript
// 1. Create knowledge base
const createKB = await fetch('http://localhost:4000/knowledge-bases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Sales Knowledge Base',
    description: 'Sales training and documentation',
    tags: ['sales']
  })
});

const kb = await createKB.json();
const kbId = kb.data.id;

// 2. Upload one file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const upload = await fetch(`http://localhost:4000/knowledge-bases/${kbId}/files`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// 3. Wait for processing (check status)
const checkStatus = async () => {
  const stats = await fetch(`http://localhost:4000/knowledge-bases/${kbId}/statistics`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await stats.json();
  
  const completed = data.data.find(s => s.processing_status === 'completed')?.count || 0;
  const processing = data.data.find(s => s.processing_status === 'processing')?.count || 0;
  
  return { completed, processing };
};

// 4. Query the knowledge base
const query = await fetch('http://localhost:4000/knowledge-bases/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'How do I close enterprise deals?',
    knowledge_base_ids: [kbId],
    top_k: 5
  })
});

const results = await query.json();
console.log('Search results:', results.data);
```

---

## Postman Collection

Import this JSON into Postman to test all endpoints:

[See separate file: `postman_collection.json`]

---

## Testing with cURL

### Create KB
```bash
curl -X POST http://localhost:4000/knowledge-bases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test KB","description":"Testing","tags":["test"]}'
```

### Upload File
```bash
curl -X POST http://localhost:4000/knowledge-bases/KB_ID/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@document.pdf"
```

### Query
```bash
curl -X POST http://localhost:4000/knowledge-bases/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"test query","top_k":5}'
```

---

## Rate Limits & Best Practices

1. **File Upload**: One file per request, 50MB maximum
2. **Query Rate**: Recommend max 10 queries/second per organization
3. **Processing**: File processing is asynchronous; expect 10-30 seconds per file
4. **Chunk Size**: Default 512 words works for most documents
5. **Min Score**: Start with 0.7, adjust based on result quality
6. **Top K**: Use 5-10 for most queries, increase for broader search

---

For more details, see the main documentation: `KNOWLEDGE_BASE_SETUP.md`
