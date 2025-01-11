# Obsidian to Astro Blog Sync

A tool to sync content from your Obsidian vault to an Astro-based blog or website. It converts Obsidian markdown files to Astro-compatible markdown, handling front matter, wiki-links, and tags.

## Features

- Syncs content from Obsidian vault to Astro content directory
- Converts wiki-style links (`[[link]]`) to markdown links (`[link](./link)`)
- Extracts tags from Obsidian's `#tag` syntax
- Preserves front matter with proper date formatting
- Automatically adds category tags based on content type
- Supports multiple content types (blogs, notes, videos)
- Maintains directory structure

## Quick Start (Using Pre-compiled Binary)

1. Download the latest release from the releases page
2. Create a `settings.json` file in the same directory as the binary:
   ```json
   {
     "obsidianVaultPath": "/path/to/obsidian/vault/content",
     "astroContentPath": "/path/to/astro/site/content",
     "fileExtensions": [".md"],
     "excludeFolders": ["templates", ".obsidian"],
     "categories": ["blogs", "notes", "videos"]
   }
   ```
3. Run the binary:
   ```bash
   ./obsidian-blog-sync
   ```

## Directory Structure

Your directories should be organized like this:

```
/path/to/obsidian/vault/
  content/
    blogs/
    notes/
    videos/

/path/to/astro/site/
  content/
    blogs/
    notes/
    videos/
```

## Building from Source

### Prerequisites

- [Deno](https://deno.land/) v1.38 or later

### Steps to Build

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/obsidian-blog-sync.git
   cd obsidian-blog-sync
   ```

2. Create your `settings.json`:
   ```bash
   cp settings.example.json settings.json
   ```

3. Edit `settings.json` with your paths:
   ```json
   {
     "obsidianVaultPath": "/path/to/obsidian/vault/content",
     "astroContentPath": "/path/to/astro/site/content",
     "fileExtensions": [".md"],
     "excludeFolders": ["templates", ".obsidian"],
     "categories": ["blogs", "notes", "videos"]
   }
   ```

4. Run with Deno:
   ```bash
   deno run --allow-read --allow-write synccontent.ts
   ```

5. (Optional) Compile to executable:
   ```bash
   deno compile --allow-read --allow-write synccontent.ts
   ```

## Settings Reference

- `obsidianVaultPath`: Path to your Obsidian vault's content directory
- `astroContentPath`: Path to your Astro site's content directory
- `fileExtensions`: Array of file extensions to process (usually just [".md"])
- `excludeFolders`: Array of folder names to ignore
- `categories`: Array of content categories to sync

## Content Conversion

### Front Matter
- Title is generated from filename
- Dates are converted from Obsidian format to ISO format
- Tags are extracted from `#tag` syntax
- Category is automatically added as a tag

Example Obsidian file:
```markdown
---
date created: Friday, August 9 2024, 1:06:22 pm
date modified: Sunday, January 5 2025, 6:00:47 pm
description: "A sample description"
---
Content with #tag1 #tag2
```

Converts to:
```markdown
---
title: filename
description: "A sample description"
date: 2024-08-09
updated: 2025-01-05
tags: ["tag1", "tag2", "category"]
---
Content
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
