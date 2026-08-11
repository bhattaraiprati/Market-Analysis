# Persona API - Complete Guide

## Overview

The Persona API allows you to create AI personas with specific roles, assign knowledge bases, control capabilities, and share personas with team members or publicly.

## Table of Contents
1. [Create Persona](#1-create-persona)
2. [List Personas](#2-list-all-personas)
3. [Get Single Persona](#3-get-single-persona)
4. [Update Persona](#4-update-persona)
5. [Delete Persona](#5-delete-persona)
6. [Share with Users](#6-share-persona-with-users)
7. [Generate Links](#7-generate-shareable-links)
8. [Revoke Links](#8-revoke-links)
9. [Access via Link](#9-access-persona-via-link)
10. [Manage Knowledge Bases](#10-manage-knowledge-bases)

---

## Authentication

All endpoints (except public link access) require JWT authentication:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. Create Persona

Create a new AI persona with specific role and capabilities.

### Request
```http
POST /personas
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Sales AI Assistant",
  "description": "AI assistant specialized in sales strategies, lead qualification, and deal closing",
  "primary_focus_role": "sales",
  "knowledge_base_ids": [
    "kb-uuid-1",
    "kb-uuid-2"
  ],
  "web_search_enabled": true,
  "external_data_sources_enabled": false
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Persona name (3-255 characters) |
| `description` | string | ❌ | Detailed description (max 2000 chars) |
| `primary_focus_role` | enum | ✅ | Role: `sales`, `marketing`, `customer_support`, `product`, `engineering`, `finance`, `operations`, `hr`, `general` |
| `knowledge_base_ids` | array | ❌ | Array of knowledge base UUIDs to assign |
| `web_search_enabled` | boolean | ❌ | Enable web search (default: `true`) |
| `external_data_sources_enabled` | boolean | ❌ | Enable external data access (default: `false`) |

### Response (201 Created)
```json
{
  "success": true,
  "message": "Persona created successfully",
  "data": {
    "id": "persona-uuid",
    "organization_id": "org-uuid",
    "created_by": "user-uuid",
    "name": "Sales AI Assistant",
    "description": "AI assistant specialized in sales...",
    "primary_focus_role": "sales",
    "web_search_enabled": true,
    "external_data_sources_enabled": false,
    "model_name": "claude-3-5-sonnet-20240620",
    "status": "active",
    "visibility": "private",
    "public_link_enabled": false,
    "organization_link_enabled": false,
    "total_conversations": 0,
    "total_messages": 0,
    "knowledgeBases": [
      {
        "id": "kb-uuid-1",
        "name": "Sales Documentation",
        "type": "file_upload",
        "total_documents": 5,
        "total_chunks": 247,
        "PersonaKnowledgeBase": {
          "priority": 1,
          "is_active": true
        }
      }
    ],
    "permissions": [
      {
        "id": "perm-uuid",
        "user_id": "user-uuid",
        "access_level": "co-owner",
        "can_chat": true,
        "can_view_config": true,
        "can_edit_config": true,
        "can_add_knowledge": true,
        "can_share": true,
        "can_delete": true
      }
    ],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 2. List All Personas

Get all personas accessible to the current user.

### Request
```http
GET /personas
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Personas retrieved successfully",
  "data": [
    {
      "id": "persona-uuid-1",
      "name": "Sales AI Assistant",
      "description": "AI assistant specialized in sales...",
      "primary_focus_role": "sales",
      "web_search_enabled": true,
      "external_data_sources_enabled": false,
      "status": "active",
      "visibility": "private",
      "total_conversations": 15,
      "total_messages": 234,
      "avg_rating": 4.8,
      "last_used_at": "2024-01-16T09:30:00.000Z",
      "knowledgeBases": [
        {
          "id": "kb-uuid-1",
          "name": "Sales Documentation",
          "total_chunks": 247
        }
      ],
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "persona-uuid-2",
      "name": "Marketing Expert",
      "primary_focus_role": "marketing",
      "visibility": "organization",
      "total_conversations": 8,
      "knowledgeBases": [],
      "created_at": "2024-01-14T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

**Filtering Logic:**
- Shows personas created by the user
- Shows organization-wide personas (`visibility: "organization"`)
- Shows personas explicitly shared with the user

---

## 3. Get Single Persona

Get detailed information about a specific persona.

### Request
```http
GET /personas/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Persona retrieved successfully",
  "data": {
    "id": "persona-uuid",
    "name": "Sales AI Assistant",
    "description": "AI assistant specialized in sales...",
    "primary_focus_role": "sales",
    "web_search_enabled": true,
    "external_data_sources_enabled": false,
    "model_name": "claude-3-5-sonnet-20240620",
    "model_parameters": {
      "temperature": 0.7,
      "max_tokens": 4000
    },
    "status": "active",
    "visibility": "private",
    "total_conversations": 15,
    "total_messages": 234,
    "avg_rating": 4.8,
    "knowledgeBases": [
      {
        "id": "kb-uuid-1",
        "name": "Sales Documentation",
        "description": "All sales materials",
        "total_documents": 5,
        "total_chunks": 247,
        "PersonaKnowledgeBase": {
          "priority": 1,
          "weight": 1.0,
          "max_chunks": 10,
          "min_similarity": 0.7,
          "is_active": true
        }
      }
    ],
    "permissions": [
      {
        "id": "perm-uuid-1",
        "user_id": "user-uuid-2",
        "access_level": "user",
        "can_chat": true,
        "can_view_config": false,
        "granted_by": "user-uuid-1",
        "granted_at": "2024-01-15T11:00:00.000Z"
      }
    ],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T08:15:00.000Z"
  }
}
```

---

## 4. Update Persona

Update persona configuration.

### Request
```http
PATCH /personas/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Senior Sales AI Assistant",
  "description": "Updated description",
  "web_search_enabled": false,
  "knowledge_base_ids": ["kb-uuid-1", "kb-uuid-3"],
  "status": "active"
}
```

**Note:** All fields are optional. Only include fields you want to update.

### Response (200 OK)
```json
{
  "success": true,
  "message": "Persona updated successfully",
  "data": {
    "id": "persona-uuid",
    "name": "Senior Sales AI Assistant",
    "description": "Updated description",
    "web_search_enabled": false,
    "updated_at": "2024-01-16T10:15:00.000Z"
  }
}
```

---

## 5. Delete Persona

Delete a persona (soft delete).

### Request
```http
DELETE /personas/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Persona deleted successfully"
}
```

**Note:** Only the creator or users with `can_delete` permission can delete personas.

---

## 6. Share Persona with Users

Share a persona with specific users in your organization.

### Request
```http
POST /personas/:id/share
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "user_ids": [
    "user-uuid-1",
    "user-uuid-2",
    "user-uuid-3"
  ],
  "access_level": "user",
  "message": "Sharing our sales AI assistant with you!"
}
```

### Access Levels

| Level | Can Chat | View Config | Edit Config | Add Knowledge | Share | Delete |
|-------|----------|-------------|-------------|---------------|-------|--------|
| `viewer` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `contributor` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `co-owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Response (200 OK)
```json
{
  "success": true,
  "message": "Persona shared with 3 user(s)",
  "data": [
    {
      "id": "perm-uuid-1",
      "persona_id": "persona-uuid",
      "user_id": "user-uuid-1",
      "access_level": "user",
      "can_chat": true,
      "can_view_config": false,
      "granted_by": "user-uuid-owner",
      "granted_at": "2024-01-16T10:30:00.000Z"
    }
  ]
}
```

---

## 7. Generate Shareable Links

Generate public or organization-only shareable links.

### Request - Public Link
```http
POST /personas/:id/generate-link
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "link_type": "public"
}
```

### Request - Organization Link
```http
POST /personas/:id/generate-link
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "link_type": "organization"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Public link generated successfully",
  "data": {
    "link": "http://localhost:3000/personas/shared/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}
```

**Link Types:**
- **Public**: Anyone with the link can access (no authentication required)
- **Organization**: Only members of your organization can access (authentication required)

---

## 8. Revoke Links

Revoke access via shareable links.

### Request
```http
DELETE /personas/:id/revoke-link/:linkType
Authorization: Bearer YOUR_JWT_TOKEN
```

**Link Types:** `public` or `organization`

### Example
```http
DELETE /personas/persona-uuid/revoke-link/public
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Public link revoked successfully"
}
```

---

## 9. Access Persona via Link

Access a shared persona using a link token (public endpoint).

### Request
```http
GET /personas/shared/:token
```

**Note:** No authentication required for public links. Authentication required for organization links.

### Response (200 OK)
```json
{
  "success": true,
  "message": "Persona accessed successfully",
  "data": {
    "id": "persona-uuid",
    "name": "Sales AI Assistant",
    "description": "AI assistant specialized in sales...",
    "primary_focus_role": "sales",
    "web_search_enabled": true,
    "knowledgeBases": [
      {
        "id": "kb-uuid-1",
        "name": "Sales Documentation"
      }
    ]
  }
}
```

---

## 10. Manage Knowledge Bases

### 10.1 Assign Knowledge Base

Assign a knowledge base to a persona.

#### Request
```http
POST /personas/:id/knowledge-bases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "knowledge_base_id": "kb-uuid",
  "priority": 1
}
```

**Priority:** 1-10 (higher number = higher priority in search results)

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Knowledge base assigned to persona successfully",
  "data": {
    "id": "assignment-uuid",
    "persona_id": "persona-uuid",
    "knowledge_base_id": "kb-uuid",
    "priority": 1,
    "weight": 1.0,
    "max_chunks": 10,
    "min_similarity": 0.7,
    "is_active": true,
    "assigned_by": "user-uuid",
    "assigned_at": "2024-01-16T11:00:00.000Z"
  }
}
```

### 10.2 Remove Knowledge Base

Remove a knowledge base from a persona.

#### Request
```http
DELETE /personas/:id/knowledge-bases/:kbId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Knowledge base removed from persona successfully"
}
```

---

## Complete Workflow Example

### 1. Create Sales Persona
```bash
curl -X POST http://localhost:4000/personas \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales AI",
    "primary_focus_role": "sales",
    "knowledge_base_ids": ["kb-uuid-1"],
    "web_search_enabled": true,
    "external_data_sources_enabled": false
  }'
```

### 2. Assign Additional Knowledge Base
```bash
curl -X POST http://localhost:4000/personas/PERSONA_ID/knowledge-bases \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "knowledge_base_id": "kb-uuid-2",
    "priority": 2
  }'
```

### 3. Share with Team
```bash
curl -X POST http://localhost:4000/personas/PERSONA_ID/share \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["user-uuid-1", "user-uuid-2"],
    "access_level": "user"
  }'
```

### 4. Generate Organization Link
```bash
curl -X POST http://localhost:4000/personas/PERSONA_ID/generate-link \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "organization"
  }'
```

### 5. Update Capabilities
```bash
curl -X PATCH http://localhost:4000/personas/PERSONA_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "web_search_enabled": false,
    "external_data_sources_enabled": true
  }'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "primary_focus_role must be a valid enum value"
  ],
  "error": "Bad Request"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You don't have permission to edit this persona"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Persona with ID persona-uuid not found"
}
```

---

## Best Practices

1. **Naming**: Use clear, descriptive names (e.g., "Sales AI Assistant" not "AI 1")
2. **Knowledge Bases**: Assign relevant KBs only - more isn't always better
3. **Web Search**: Enable for current information, disable for internal-only data
4. **Sharing**: Use appropriate access levels - don't give `co-owner` to everyone
5. **Links**: Use organization links for internal sharing, public links sparingly
6. **Roles**: Choose the primary focus role that best matches the use case

---

## Integration with Chat

Once a persona is created, it can be used in conversations:

```javascript
// Selecting a persona does not create a conversation. The conversation is
// created only when the user submits the first message.
POST /conversations
{
  "persona_id": "persona-uuid",
  "content": "What are the top sales strategies?"
}

// The response contains data.conversation.id. Use it for follow-up messages:
POST /conversations/{conversation-id}/messages
{
  "content": "Compare the first two strategies"
}

// The persona will:
// 1. Search assigned knowledge bases
// 2. Use web search if enabled
// 3. Apply its role-specific expertise
// 4. Return contextual response
```

---

For more details on the overall system architecture, see:
- `docs/END_USER_FLOW.md` - Complete user journey
- `docs/SYSTEM_DATA_FLOW.md` - Technical data flow
- `docs/DATABASE_DESIGN.md` - Database schema
