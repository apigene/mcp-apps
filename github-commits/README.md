# GitHub Commits Viewer MCP App

A beautiful GitHub-style commit history viewer that displays commits with expandable details, author information, and diff views.

## Features

- **GitHub-style UI**: Matches GitHub's commit history page look and feel
- **Commit Details**: Expandable commit cards with full information
- **Author Information**: Shows commit author and committer with avatars
- **Relative Time**: Displays "2 hours ago", "3 days ago" format
- **Verification Badges**: Shows verified commit badges
- **Parent Commits**: Links to parent commits
- **Diff View**: Placeholder for diff loading (requires additional API call)
- **Dark Mode**: Full dark mode support matching GitHub's dark theme
- **Responsive**: Works on mobile and desktop

## Data Format

The app expects GitHub API commits response format:

```json
{
  "body": [
    {
      "sha": "778d51ed95d070719eb37eca88d75137e7552578",
      "commit": {
        "author": {
          "name": "aleksey-apigene",
          "email": "aleksey@apigene.ai",
          "date": "2026-02-05T20:10:31Z"
        },
        "committer": {
          "name": "GitHub",
          "email": "noreply@github.com",
          "date": "2026-02-05T20:10:31Z"
        },
        "message": "fix: pass scp (#92)\n\n* fix: pass scp\n\n* support comma separated values"
      },
      "author": {
        "login": "aleksey-apigene",
        "avatar_url": "https://avatars.githubusercontent.com/u/241711210?v=4"
      },
      "html_url": "https://github.com/apigene/apigene-backend/commit/778d51ed95d070719eb37eca88d75137e7552578",
      "parents": [
        {
          "sha": "06a01689bd6dd16a820756dab95ddb47edef851c",
          "html_url": "..."
        }
      ]
    }
  ]
}
```

The app also handles:
- Direct array of commits
- Nested in `body` property
- Standard table format with `rows` array

## Usage

1. Ensure your MCP server returns GitHub commits API response format
2. The app will automatically render commits in GitHub style
3. Click on any commit to expand details
4. Click "Load diff" to view changes (requires additional API integration)

## Styling

The app uses GitHub's color scheme:
- Light mode: `#ffffff` background, `#24292f` text
- Dark mode: `#0d1117` background, `#c9d1d9` text
- Links: `#0969da` (light) / `#58a6ff` (dark)
- Borders: `#d0d7de` (light) / `#21262d` (dark)

## Diff View

The app supports loading diffs via the MCP protocol. When a user clicks "Load diff", the app sends a request to the host:

```typescript
sendRequest('ui/request-data', {
  type: 'github-commit-diff',
  sha: '<commit-sha>',
  params: {
    sha: '<commit-sha>'
  }
})
```

### Server-Side Implementation

Your MCP server needs to handle the `ui/request-data` request and fetch the diff from GitHub API:

```python
# Example Python implementation
@router.post("/ui/request-data")
async def handle_request_data(request: Request):
    data = await request.json()
    
    if data.get('type') == 'github-commit-diff':
        sha = data.get('sha')
        # Extract owner/repo from context or request params
        owner = data.get('params', {}).get('owner')
        repo = data.get('params', {}).get('repo')
        
        # Fetch from GitHub API
        response = await github_client.get(
            f"/repos/{owner}/{repo}/commits/{sha}"
        )
        
        commit_data = response.json()
        
        # Return the files array with diff data
        return {
            "data": {
                "files": commit_data.get("files", [])
            }
        }
```

### Diff Data Format

The app expects the response in one of these formats:

**Format 1: GitHub API commit response**
```json
{
  "data": {
    "files": [
      {
        "filename": "path/to/file.py",
        "status": "modified",
        "additions": 10,
        "deletions": 5,
        "changes": 15,
        "patch": "@@ -1,5 +1,10 @@\n ..."
      }
    ]
  }
}
```

**Format 2: Direct files array**
```json
{
  "data": [
    {
      "filename": "path/to/file.py",
      "patch": "@@ -1,5 +1,10 @@\n ..."
    }
  ]
}
```

**Format 3: Raw patch string**
```json
{
  "data": "@@ -1,5 +1,10 @@\n ..."
}
```

### Fallback Behavior

If the diff request fails, the app will:
1. Show an error message
2. Extract repo info from the commit URL if available
3. Provide a link to view the diff on GitHub
4. Show instructions for configuring the server

## CSP Configuration

If using external avatar images, ensure CSP is configured:

```typescript
resourceDomains: [
  "https://avatars.githubusercontent.com",
  "https://ui-avatars.com"
]
```

## Files

- `mcp-app.html` - Main HTML file
- `src/mcp-app.ts` - TypeScript logic
- `src/mcp-app.css` - GitHub-style styles
- `src/global.css` - Base styles (from template)
