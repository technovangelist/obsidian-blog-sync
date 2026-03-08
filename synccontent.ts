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

interface SyncStats {
  categoriesScanned: number;
  missingCategories: number;
  filesMatched: number;
  filesProcessed: number;
  filesSkipped: number;
  filesErrored: number;
}

function getDirPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx > 0 ? normalized.slice(0, idx) : '.';
}

async function writeTextFileSafe(targetPath: string, content: string): Promise<void> {
  const targetDir = getDirPath(targetPath);
  await Deno.mkdir(targetDir, { recursive: true });

  try {
    await Deno.writeTextFile(targetPath, content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(targetDir, { recursive: true });
      await Deno.writeTextFile(targetPath, content);
      return;
    }
    throw error;
  }
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

async function convertFile(sourcePath: string, category: string): Promise<boolean> {
  console.log(`[sync] Processing file: ${sourcePath}`);
  const content = await Deno.readTextFile(sourcePath);
  
  // Extract front matter
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    console.warn(`Skipping file without valid front matter: ${sourcePath}`);
    return false;
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
  console.log(`[sync] Front matter title: ${newFrontMatter.title}, date: ${newFrontMatter.date ?? '(none)'}`);
  console.log(`[sync] Writing file: ${targetPath}`);

  await writeTextFileSafe(targetPath, finalContent);

  return true;
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
  const stats: SyncStats = {
    categoriesScanned: 0,
    missingCategories: 0,
    filesMatched: 0,
    filesProcessed: 0,
    filesSkipped: 0,
    filesErrored: 0,
  };
  
  for (const category of categories) {
    stats.categoriesScanned += 1;
    const sourceDir = `${settings.obsidianVaultPath}/${category}`;
    console.log(`[sync] Scanning path: ${sourceDir}`);
    
    try {
      for await (const filePath of walkFiles(sourceDir, excludeFolders)) {
        if (!fileExtensions.some((ext: string) => filePath.endsWith(ext))) continue;
        stats.filesMatched += 1;

        try {
          const converted = await convertFile(filePath, category);
          if (converted) {
            stats.filesProcessed += 1;
          } else {
            stats.filesSkipped += 1;
          }
        } catch (error) {
          stats.filesErrored += 1;
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[sync] Error processing file: ${filePath} (${message})`);
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
      stats.missingCategories += 1;
      console.warn(`[sync] Skipping missing category path: ${sourceDir}`);
    }
  }

  console.log('[sync] Summary');
  console.log(`[sync] Categories scanned: ${stats.categoriesScanned}`);
  console.log(`[sync] Missing category paths: ${stats.missingCategories}`);
  console.log(`[sync] Files matched extension: ${stats.filesMatched}`);
  console.log(`[sync] Files processed: ${stats.filesProcessed}`);
  console.log(`[sync] Files skipped: ${stats.filesSkipped}`);
  console.log(`[sync] Files errored: ${stats.filesErrored}`);
}

// Run the sync
await syncContent();
