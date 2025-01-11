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
  if (!dateStr) return '';
  
  // Handle Obsidian's date format: "Friday, August 9 2024, 1:06:22 pm"
  const match = dateStr.match(/(\w+), (\w+) (\d+) (\d+), (\d+):(\d+):(\d+) (am|pm)/i);
  if (!match) return '';
  
  const [_, _dayName, month, day, year, hours, minutes, seconds, ampm] = match;
  const monthMap: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  
  let hour = parseInt(hours);
  if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
  
  const date = new Date(
    parseInt(year),
    monthMap[month],
    parseInt(day),
    hour,
    parseInt(minutes),
    parseInt(seconds)
  );
  
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
    date: parseDate(frontMatterData['date_created'] || ''),
    updated: parseDate(frontMatterData['date_modified'] || ''),
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
        if (!settings.fileExtensions.some((ext: string) => entry.name.endsWith(ext))) continue;
        if (settings.excludeFolders.some((folder: string) => entry.name.includes(folder))) continue;
        
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
