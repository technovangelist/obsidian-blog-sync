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
  description?: string;
  date?: string;
  updated?: string;
  videoId?: string;
  ytpublishdate?: string;
  tags: string[];
}

function extractTags(content: string, frontMatterTags?: string): string[] {
  const tags: string[] = [];
  
  // Extract inline hashtags with leading whitespace; avoid heading markers
  const tagRegex = /(^|[^\S\r\n])#([^\s#]+)/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[2]);
  }
  
  // Add tags from front matter if present
  if (frontMatterTags?.trim()) {
    const rawTags = frontMatterTags.trim();
    let fmTags: string[] = [];

    if (rawTags.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          fmTags = parsed.map((tag) => String(tag).trim());
        }
      } catch {
        fmTags = rawTags
          .replace(/^\[/, '')
          .replace(/\]$/, '')
          .split(',')
          .map((tag) => tag.trim());
      }
    } else {
      fmTags = rawTags.split(',').map((tag) => tag.trim());
    }

    tags.push(...fmTags.filter(Boolean));
  }
  
  return tags;
}

function convertWikiLinks(content: string, category?: string): string {
  return content.replace(/\[\[(.*?)\]\]/g, (_, link) => {
    const [targetPart, aliasPart] = link.split('|', 2);
    const target = targetPart?.trim() ?? '';
    if (!target) return _;

    const displayText = aliasPart?.trim() || target;
    const baseTarget = target.split('#')[0].split('^')[0].trim();
    const slug = baseTarget
      .split('/')
      .map((segment: string) => encodeURIComponent(segment.trim().toLowerCase()))
      .join('/');

    return `[${displayText}](/${category}/${slug})`;
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
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    console.warn(`Skipping file without valid front matter: ${sourcePath}`);
    return;
  }
  
  const [_, frontMatter, bodyContent = ''] = match;
  const frontMatterInputLines = frontMatter.split(/\r?\n/);
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
    ...(frontMatterData['description'] && { 
      description: frontMatterData['description'].replace(/^"(.*)"$/, '$1').trim()
    }),
    ...(frontMatterData['date created'] && { date: parseDate(frontMatterData['date created']) }),
    ...(frontMatterData['date modified'] && { updated: parseDate(frontMatterData['date modified']) }),
    ...(frontMatterData['id'] && { videoId: frontMatterData['id'] }),
    ...(frontMatterData['ytpublishdate'] && { ytpublishdate: frontMatterData['ytpublishdate'] }),
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
    .replace(/(^|[^\S\r\n])#[^\s#]+/g, '$1') // Remove inline tags, keep headings
    .trim();
  
  const convertedBody = convertWikiLinks(cleanBody, category);
  
  // Create final content with optional fields
  const frontMatterOutputLines = [
    '---',
    `title: ${newFrontMatter.title}`,
    ...(newFrontMatter.description ? [`description: ${newFrontMatter.description}`] : []),
    ...(newFrontMatter.date ? [`date: ${newFrontMatter.date}`] : []),
    ...(newFrontMatter.updated ? [`updated: ${newFrontMatter.updated}`] : []),
    ...(newFrontMatter.videoId ? [`videoId: ${newFrontMatter.videoId}`] : []),
    ...(newFrontMatter.ytpublishdate ? [`ytpublishdate: ${newFrontMatter.ytpublishdate}`] : []),
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

async function* walkFiles(dir: string, excludeFolders: string[]): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const entryPath = `${dir}/${entry.name}`;

    if (entry.isDirectory) {
      if (excludeFolders.includes(entry.name)) continue;
      yield* walkFiles(entryPath, excludeFolders);
      continue;
    }

    if (entry.isFile) {
      yield entryPath;
    }
  }
}

async function syncContent() {
  const { categories, fileExtensions, excludeFolders } = settings as Settings;
  
  for (const category of categories) {
    const sourceDir = `${settings.obsidianVaultPath}/${category}`;
    
    try {
      for await (const filePath of walkFiles(sourceDir, excludeFolders)) {
        if (!fileExtensions.some((ext: string) => filePath.endsWith(ext))) continue;
        
        await convertFile(filePath, category);
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
