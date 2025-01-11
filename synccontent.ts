// read settings from json file
const settings = JSON.parse(Deno.readTextFileSync("settings.json"));

interface Settings {
  obsidianVaultPath: string;
  astroContentPath: string;
  fileExtensions: string[];
  excludeFolders: string[];
  categories: string[];
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const tagRegex = /#([^\s#]+)/g;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }
  
  return tags;
}

function convertWikiLinks(content: string): string {
  return content.replace(/\[\[(.*?)\]\]/g, (_, link) => {
    // Remove any text after | if it exists
    const cleanLink = link.split('|')[0];
    return `[${cleanLink}](./${cleanLink})`;
  });
}

function parseDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

async function convertFile(sourcePath: string, category: string) {
  const content = await Deno.readTextFile(sourcePath);
  
  // Extract front matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) return;
  
  const [_, frontMatter, bodyContent] = match;
  const frontMatterLines = frontMatter.split('\n');
  const frontMatterData: Record<string, string> = {};
  
  frontMatterLines.forEach(line => {
    const [key, ...values] = line.split(':').map(s => s.trim());
    if (key && values.length) {
      frontMatterData[key] = values.join(':');
    }
  });
  
  // Get filename without extension as title
  const fileName = sourcePath.split('/').pop()?.replace('.md', '') || '';
  
  // Create new front matter
  const newFrontMatter = {
    title: fileName,
    description: frontMatterData['description']?.replace(/^"(.*)"$/, '$1') || '',
    date: parseDate(frontMatterData['date created'] || ''),
    updated: parseDate(frontMatterData['date modified'] || ''),
    tags: [...new Set([...extractTags(content), category])], // Add category as a tag and deduplicate
  };
  
  // Convert body content
  const cleanBody = bodyContent
    .replace(/#[^\s#]+/g, '') // Remove tags
    .trim();
  
  const convertedBody = convertWikiLinks(cleanBody);
  
  // Create final content
  const finalContent = `---
title: ${newFrontMatter.title}
description: ${newFrontMatter.description}
date: ${newFrontMatter.date}
updated: ${newFrontMatter.updated}
tags: ${JSON.stringify(newFrontMatter.tags)}
---

${convertedBody}`;

  // Create target path
  const targetPath = sourcePath
    .replace(settings.obsidianVaultPath, settings.astroContentPath);
  
  // Ensure target directory exists
  await Deno.mkdir(new URL(targetPath, import.meta.url).pathname.replace(/\/[^/]+$/, ''), { recursive: true });
  
  // Write file
  await Deno.writeTextFile(targetPath, finalContent);
}

async function syncContent() {
  const { categories } = settings as Settings;
  
  for (const category of categories) {
    const sourceDir = `${settings.obsidianVaultPath}/${category}`;
    
    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (!entry.isFile) continue;
        if (!settings.fileExtensions.some(ext => entry.name.endsWith(ext))) continue;
        if (settings.excludeFolders.some(folder => entry.name.includes(folder))) continue;
        
        await convertFile(`${sourceDir}/${entry.name}`, category);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
      // Directory doesn't exist, skip it
    }
  }
}

// Run the sync
await syncContent();
