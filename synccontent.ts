// read settings from json file
const settings = JSON.parse(Deno.readTextFileSync("settings.json"));

interface Settings {
  obsidianVaultPath: string;
  astroContentPath: string;
  fileExtensions: string[];
  excludeFolders: string[];
  categories: string[];
}

interface FrontMatter {
  title: string;
  description: string;
  date?: string;
  updated?: string;
  videoId?: string;
  tags: string[];
}

function extractTags(content: string, frontMatterTags?: string): string[] {
  const tags: string[] = [];
  
  // Extract hashtags from content
  const tagRegex = /#([^\s#]+)/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }
  
  // Add tags from front matter if present
  if (frontMatterTags) {
    // Handle both array and comma-separated string formats
    const fmTags = frontMatterTags.startsWith('[') 
      ? JSON.parse(frontMatterTags)
      : frontMatterTags.split(',').map(t => t.trim());
    tags.push(...fmTags);
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
  const frontMatterInputLines = frontMatter.split('\n');
  const frontMatterData: Record<string, string> = {};
  
  frontMatterInputLines.forEach(line => {
    const [key, ...values] = line.split(':').map(s => s.trim());
    if (key && values.length) {
      frontMatterData[key] = values.join(':');
    }
  });
  
  // Get filename without extension as title
  const fileName = sourcePath.split('/').pop()?.replace('.md', '') || '';
  
  // Create new front matter
  const newFrontMatter: FrontMatter = {
    title: fileName,
    description: frontMatterData['description']?.replace(/^"(.*)"$/, '$1') || '',
    ...(frontMatterData['date created'] && { date: parseDate(frontMatterData['date created']) }),
    ...(frontMatterData['date modified'] && { updated: parseDate(frontMatterData['date modified']) }),
    ...(frontMatterData['id'] && { videoId: frontMatterData['id'] }),
    tags: [] // Initialize with empty array
  };

  // Handle tags
  const allTags = extractTags(content, frontMatterData['tags']);
  if (frontMatterData['id']) {
    allTags.push('videos');
  }
  if (allTags.length > 0) {
    newFrontMatter.tags = [...new Set(allTags)];
  } else {
    newFrontMatter.tags = frontMatterData['id'] ? ['videos'] : [];
  }

  // Remove empty fields from front matter (except description and tags)
  Object.keys(newFrontMatter).forEach(key => {
    if (!newFrontMatter[key as keyof FrontMatter] && key !== 'description' && key !== 'tags') {
      delete newFrontMatter[key as keyof FrontMatter];
    }
  });
  
  // Convert body content
  const cleanBody = bodyContent
    .replace(/#[^\s#]+/g, '') // Remove tags
    .trim();
  
  const convertedBody = convertWikiLinks(cleanBody);
  
  // Create final content with optional fields
  const frontMatterOutputLines = [
    '---',
    `title: ${newFrontMatter.title}`,
    `description: ${newFrontMatter.description}`,
    ...(newFrontMatter.date ? [`date: ${newFrontMatter.date}`] : []),
    ...(newFrontMatter.updated ? [`updated: ${newFrontMatter.updated}`] : []),
    ...(newFrontMatter.videoId ? [`videoId: ${newFrontMatter.videoId}`] : []),
    ...(newFrontMatter.tags ? [`tags: ${JSON.stringify(newFrontMatter.tags)}`] : []),
    '---',
    ''
  ];

  const finalContent = frontMatterOutputLines.join('\n') + convertedBody;
  
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
