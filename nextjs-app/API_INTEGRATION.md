# API Integration Documentation

## Overview

This Next.js application integrates with your existing Python backend for age verification auditing. The integration uses a **API Bridge** approach where:

- **Frontend**: Next.js handles the UI/UX and file uploads
- **Backend**: Python processes the actual audit using Ollama
- **Bridge**: Next.js API routes call the Python backend

## Architecture

```
┌─────────────────┐    HTTP POST    ┌─────────────────┐    Subprocess    ┌─────────────────┐
│   Next.js UI    │ ──────────────► │  Next.js API    │ ──────────────► │  Python Backend │
│   (Frontend)    │                 │   (/api/audit)  │                 │  (Ollama + AI)  │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
         │                                   │                                   │
         │                                   │                                   │
         ▼                                   ▼                                   ▼
   File Upload                          JSON Response                      Audit Results
   (CSV/TXT)                           (Transformed)                      (JSON/CSV)
```

## How It Works

### 1. Frontend (Next.js)
- Users upload CSV/TXT files with website URLs
- Frontend parses files and displays preview
- When "Start Audit" is clicked, sends POST to `/api/audit`

### 2. API Bridge (`/api/audit`)
- Receives website data from frontend
- Creates temporary file with URLs
- Spawns Python subprocess with your existing script
- Transforms Python results back to frontend format

### 3. Python Backend
- Uses your existing `age_verification_audit.py`
- Processes websites with Ollama AI
- Returns JSON results
- Handles all the heavy lifting (web scraping, AI analysis)

## API Endpoint

### POST `/api/audit`

**Request Body:**
```json
{
  "websites": [
    {
      "url": "https://example.com",
      "name": "Example Site",
      "category": "Adult Content"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "totalWebsites": 1,
  "processedWebsites": 1,
  "results": [
    {
      "website": "https://example.com",
      "has_age_verification": true,
      "verification_type": "Age Gate",
      "confidence_score": 0.95,
      "details": "Found age verification popup",
      "timestamp": "2024-01-01T12:00:00Z",
      "name": "Example Site",
      "category": "Adult Content"
    }
  ]
}
```

## Fallback Mode

If the Python backend fails (not running, missing dependencies, etc.), the frontend automatically falls back to **Demo Mode** with simulated results based on website categories.

## Setup Requirements

1. **Python Backend**: Your existing `age_verification_audit.py` must be in the parent directory
2. **Dependencies**: All Python dependencies must be installed
3. **Ollama**: Must be running with the phi3 model
4. **File Permissions**: Next.js needs permission to spawn Python processes

## Error Handling

- **API Failures**: Automatically fallback to demo mode
- **Python Errors**: Logged to console, user gets demo results
- **File Issues**: Temporary files are cleaned up automatically
- **Network Issues**: Graceful degradation with user feedback

## Benefits

✅ **Leverages Existing Work**: Uses your proven Python/Ollama pipeline  
✅ **Professional UI**: Modern Next.js frontend  
✅ **Real-time Processing**: Live audit results  
✅ **Graceful Fallback**: Demo mode if backend fails  
✅ **Easy Extension**: Add features to either layer independently  

## Testing

1. Start the Next.js dev server: `npm run dev`
2. Upload a file or use "Load Demo Data"
3. Click "Start Audit"
4. Check the browser console for API logs
5. Verify results are from real Python backend (green "Real API" badge)

## Troubleshooting

- **"Real API" badge not showing**: Check Python backend is running
- **Demo mode always active**: Verify Python script path and permissions
- **Build errors**: Check TypeScript types in API route
- **Process errors**: Ensure Python dependencies are installed 