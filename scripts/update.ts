#!/usr/bin/env npx tsx

/**
 * Zig Registry Auto-Generator
 * 
 * This script automatically fetches Zig packages and applications from GitHub
 * using the GraphQL API for efficiency.
 * 
 * Features:
 * - Tracks state in `registry.json` to avoid redundant work.
 * - Prioritizes NEW repositories.
 * - Handles Rate Limits by pausing and resuming automatically.
 * - Updates existing repositories only if changed (using commit hash).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the registry root
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Configuration
const CONFIG = {
  graphqlUrl: 'https://api.github.com/graphql',
  outputDir: path.join(__dirname, '..', 'database'),
  registryFile: path.join(__dirname, '..', 'registry.json'),
  batchSize: 20,
};

function getGitHubToken(): string | undefined {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
}

function getHeaders(): Record<string, string> {
  const token = getGitHubToken();
  if (!token) {
    console.error('Error: GH_TOKEN or GITHUB_TOKEN is not set in .env file.');
    process.exit(1);
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Zig-Registry-Generator',
  };
}

// --- State Management ---

interface RegistryState {
  lastSync: string;
  repos: Record<string, {
    id: string;
    name: string;
    owner: string;
    type: 'package' | 'application' | 'project';
    updatedAt: string; // GitHub's updatedAt
    commitHash?: string; // Last processed commit hash
    lastSynced: string; // Local sync timestamp
  }>;
}

function loadState(): RegistryState {
  if (fs.existsSync(CONFIG.registryFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.registryFile, 'utf-8'));
  }
  return { lastSync: '', repos: {} };
}

function saveState(state: RegistryState) {
  fs.writeFileSync(CONFIG.registryFile, JSON.stringify(state, null, 2));
}

// --- GraphQL Queries ---

const DISCOVERY_QUERY = `
  query ($query: String!, $cursor: String) {
    search(query: $query, type: REPOSITORY, first: 100, after: $cursor) {
      repositoryCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Repository {
          id
          name
          nameWithOwner
          updatedAt
          defaultBranchRef {
            target {
              ... on Commit {
                oid
              }
            }
          }
          owner {
            login
          }
        }
      }
    }
  }
`;

const REPO_FRAGMENT = `
  fragment RepoDetails on Repository {
    id
    name
    nameWithOwner
    url
    description
    homepageUrl
    stargazerCount
    forkCount
    watchers { totalCount }
    pushedAt
    createdAt
    updatedAt
    defaultBranchRef {
      target {
        ... on Commit {
          oid
        }
      }
    }
    isArchived
    isDisabled
    isFork
    primaryLanguage { name }
    licenseInfo { spdxId name }
    owner {
      login
      avatarUrl
      ... on User {
        name
        bio
        company
        location
        websiteUrl
        twitterUsername
        followers { totalCount }
        following { totalCount }
        createdAt
      }
      ... on Organization {
        name
        description
        location
        websiteUrl
        twitterUsername
        createdAt
      }
    }
    repositoryTopics(first: 10) {
      nodes {
        topic { name }
      }
    }
    releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        tagName
        name
        description
        isPrerelease
        publishedAt
        url
        releaseAssets(first: 20) {
          nodes {
            name
            downloadUrl
            size
            contentType
          }
        }
      }
    }
    zon: object(expression: "HEAD:build.zig.zon") {
      ... on Blob { text }
    }
    readme: object(expression: "HEAD:README.md") {
      ... on Blob { text }
    }
    readmeLower: object(expression: "HEAD:readme.md") {
      ... on Blob { text }
    }
  }
`;

const DETAILS_QUERY = `
  query ($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        ...RepoDetails
      }
    }
  }
  ${REPO_FRAGMENT}
`;

// --- Types ---

interface RegistryEntry {
  name: string;
  owner: string;
  repo: string;
  description: string;
  type: 'package' | 'application' | 'project';
  category?: string;
  license?: string;
  homepage?: string;
  readme?: string;
  dependencies?: { name: string; url: string; hash?: string }[];
  minimum_zig_version?: string;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  updated_at: string;
  owner_avatar_url?: string;
  owner_bio?: string | null;
  owner_company?: string | null;
  owner_location?: string | null;
  owner_blog?: string | null;
  owner_twitter_username?: string | null;
  owner_followers?: number;
  owner_following?: number;
  owner_public_repos?: number;
  owner_public_gists?: number;
  owner_created_at?: string;
  releases: any[];
}

interface DiscoveryItem {
  id: string;
  name: string;
  owner: string;
  nameWithOwner: string;
  updatedAt: string;
  commitHash?: string;
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractZonMetadata(zonContent: string): { dependencies: { name: string; url: string; hash?: string }[], minimum_zig_version?: string } {
  const deps: { name: string; url: string; hash?: string }[] = [];
  let minimum_zig_version: string | undefined;

  // Extract minimum_zig_version
  const minVerMatch = zonContent.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/);
  if (minVerMatch) {
    minimum_zig_version = minVerMatch[1];
  }

  // Extract dependencies
  const startRegex = /\.dependencies\s*=\s*\.\{/g;
  const startMatch = startRegex.exec(zonContent);
  if (startMatch) {
    const startIndex = startMatch.index + startMatch[0].length;
    let depth = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < zonContent.length; i++) {
      if (zonContent[i] === '{') depth++;
      if (zonContent[i] === '}') {
        if (depth === 0) {
          endIndex = i;
          break;
        }
        depth--;
      }
    }
    
    if (endIndex !== -1) {
      const inner = zonContent.substring(startIndex, endIndex);
      const entryRegex = /\.([a-zA-Z0-9_-]+)\s*=\s*\.\{([^}]*)\}/g;
      
      let match;
      while ((match = entryRegex.exec(inner)) !== null) {
        const name = match[1];
        const content = match[2];
        const urlMatch = content.match(/\.url\s*=\s*"([^"]+)"/);
        const hashMatch = content.match(/\.hash\s*=\s*"([^"]+)"/);
        const pathMatch = content.match(/\.path\s*=\s*"([^"]+)"/);

        if (urlMatch) {
          deps.push({
            name,
            url: urlMatch[1],
            hash: hashMatch ? hashMatch[1] : undefined
          });
        } else if (pathMatch) {
          deps.push({
            name,
            url: pathMatch[1],
            hash: undefined
          });
        }
      }
    }
  }
  
  return { dependencies: deps, minimum_zig_version };
}

function determineCategory(topics: string[], isApplication: boolean): string | undefined {
  const commonCategories = [
    'game-engine', 'graphics', 'audio', 'gui', 'web', 'networking', 
    'database', 'embedded', 'math', 'physics', 'parser', 'compiler',
    'system', 'cli', 'tui', 'filesystem', 'crypto', 'security'
  ];
  for (const topic of topics) {
    if (commonCategories.includes(topic.toLowerCase())) return topic.toLowerCase();
  }
  return isApplication ? 'cli' : 'library';
}

// --- Core Logic ---

async function fetchGraphQL(query: string, variables: any): Promise<{ data: any, headers: Headers }> {
  const response = await fetch(CONFIG.graphqlUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    // Check for rate limit
    if (response.status === 403 || response.status === 429) {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date(Date.now() + 3600000);
      throw { type: 'RATE_LIMIT', resetDate };
    }
    throw new Error(`GraphQL Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    // Check if errors contain rate limit info
    const isRateLimit = result.errors.some((e: any) => e.type === 'RATE_LIMITED');
    if (isRateLimit) {
       // Default to 1 hour if we can't find a header (headers might be on the response object, handled above)
       throw { type: 'RATE_LIMIT', resetDate: new Date(Date.now() + 3600000) };
    }
    const msg = result.errors.map((e: any) => e.message).join(', ');
    throw new Error(`GraphQL Query Errors: ${msg}`);
  }

  return { data: result.data, headers: response.headers };
}

async function discoverRepos(query: string): Promise<DiscoveryItem[]> {
  console.log(`\n[Discovery] Searching for: ${query}`);
  let cursor: string | null = null;
  let hasNextPage = true;
  const items: DiscoveryItem[] = [];
  
  while (hasNextPage) {
    try {
      const { data } = await fetchGraphQL(DISCOVERY_QUERY, { query, cursor });
      const search = data.search;
      
      for (const node of search.nodes) {
        items.push({
          id: node.id,
          name: node.name,
          owner: node.owner.login,
          nameWithOwner: node.nameWithOwner,
          updatedAt: node.updatedAt,
          commitHash: node.defaultBranchRef?.target?.oid,
        });
      }
      process.stdout.write(`\rFound ${items.length} repos...`);
      
      hasNextPage = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
      if (hasNextPage) await sleep(500);
    } catch (error: any) {
      if (error.type === 'RATE_LIMIT') {
        console.log(`\n[Discovery] Rate limit reached. Waiting until ${error.resetDate.toLocaleTimeString()}...`);
        const waitTime = error.resetDate.getTime() - Date.now() + 1000; // +1s buffer
        if (waitTime > 0) await sleep(waitTime);
        continue; // Retry current page
      }
      console.error(`\n[Discovery] Error: ${error.message || error}`);
      // For other errors, maybe skip or break. Let's break to be safe.
      break;
    }
  }
  console.log(`\n[Discovery] Complete. Found ${items.length} total.`);
  return items;
}

async function processBatch(ids: string[], state: RegistryState) {
  const { data } = await fetchGraphQL(DETAILS_QUERY, { ids });
  const repos = data.nodes;

  for (const repo of repos) {
    if (!repo) continue;
    if (repo.isArchived || repo.isDisabled) continue;

    const owner = repo.owner.login;
    const name = repo.name;
    const commitHash = repo.defaultBranchRef?.target?.oid;

    // Determine type based on topics and build.zig.zon presence
    const topics = repo.repositoryTopics.nodes.map((n: any) => n.topic.name);
    const hasZon = !!(repo.zon && repo.zon.text);
    const topicSet = new Set(topics.map((t: string) => t.toLowerCase()));
    const hasPackageTopic = topicSet.has('zig-package');
    const hasAppTopic = topicSet.has('zig-application');

    let type: 'package' | 'application' | 'project' = 'project'; // Default
    
    // Process releases
    const releases = repo.releases.nodes.map((r: any) => ({
      tag_name: r.tagName,
      name: r.name,
      body: r.description,
      prerelease: r.isPrerelease,
      published_at: r.publishedAt,
      html_url: r.url,
      assets: r.releaseAssets.nodes.map((a: any) => ({
        name: a.name,
        url: a.downloadUrl,
        size: a.size,
        content_type: a.contentType
      }))
    }));

    // Process dependencies and metadata
    let dependencies: { name: string; url: string; hash?: string }[] = [];
    let minimum_zig_version: string | undefined;
    
    if (repo.zon && repo.zon.text) {
      const metadata = extractZonMetadata(repo.zon.text);
      dependencies = metadata.dependencies;
      minimum_zig_version = metadata.minimum_zig_version;
    }

    // Process README
    const readme = repo.readme?.text || repo.readmeLower?.text || null;

    // Construct Entry
    const entry: RegistryEntry = {
      name: name,
      owner: owner,
      repo: name,
      description: repo.description || '',
      type: type,
      topics: topics,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      watchers: repo.watchers.totalCount,
      updated_at: repo.updatedAt,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      minimum_zig_version: minimum_zig_version,
      readme: readme || undefined,
      owner_avatar_url: repo.owner.avatarUrl,
      releases,
      owner_bio: repo.owner.bio || repo.owner.description,
      owner_company: repo.owner.company,
      owner_location: repo.owner.location,
      owner_blog: repo.owner.websiteUrl,
      owner_twitter_username: repo.owner.twitterUsername,
      owner_followers: repo.owner.followers?.totalCount,
      owner_following: repo.owner.following?.totalCount,
      owner_public_repos: repo.owner.publicRepositories?.totalCount,
      owner_public_gists: repo.owner.publicGists?.totalCount,
      owner_created_at: repo.owner.createdAt,
    };

    if (repo.homepageUrl) entry.homepage = repo.homepageUrl;
    if (repo.licenseInfo?.spdxId && repo.licenseInfo.spdxId !== 'NOASSERTION') {
      entry.license = repo.licenseInfo.spdxId;
    }

    const category = determineCategory(entry.topics, hasAppTopic);
    if (category) entry.category = category;

    // Save to file
    const userDir = path.join(CONFIG.outputDir, owner);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    const filepath = path.join(userDir, `${name}.json`);
    
    console.log(`    Updating ${repo.nameWithOwner}`);
    fs.writeFileSync(filepath, JSON.stringify(entry, null, 2));

    // Update State
    state.repos[repo.id] = {
      id: repo.id,
      name: name,
      owner: owner,
      type: type,
      updatedAt: repo.updatedAt,
      commitHash: commitHash,
      lastSynced: new Date().toISOString()
    };
  }
  
  // Save state after every batch
  saveState(state);
}

async function processQueue(items: DiscoveryItem[], state: RegistryState, label: string) {
  const chunks = [];
  for (let i = 0; i < items.length; i += CONFIG.batchSize) {
    chunks.push(items.slice(i, i + CONFIG.batchSize));
  }

  console.log(`\n[${label}] Processing ${items.length} repos in ${chunks.length} batches...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const ids = chunk.map(item => item.id);
    
    while (true) {
      try {
        await processBatch(ids, state);
        process.stdout.write(`\rBatch ${i + 1}/${chunks.length} done.`);
        await sleep(1000);
        break;
      } catch (error: any) {
        if (error.type === 'RATE_LIMIT') {
          console.log(`\n[${label}] Rate limit reached. Waiting until ${error.resetDate.toLocaleTimeString()}...`);
          const waitTime = error.resetDate.getTime() - Date.now() + 1000;
          if (waitTime > 0) await sleep(waitTime);
          continue; // Retry batch
        }
        console.error(`\n[${label}] Error processing batch: ${error.message || error}`);
        // Skip this batch on non-rate-limit error to avoid infinite loop
        break;
      }
    }
  }
  console.log(`\n[${label}] Complete.`);
}

async function main() {
  console.log(' Zig Registry Auto-Generator (Stateful Mode)');
  
  const token = getGitHubToken();
  if (token) {
    console.log(` Token found: ${token.substring(0, 10)}...`);
  } else {
    console.log(' No GH_TOKEN found in environment!');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  // 1. Load State
  const state = loadState();
  console.log(` Loaded state: ${Object.keys(state.repos).length} tracked repos.`);

  // 2. Discovery
  // Search for both packages and applications
  const packages = await discoverRepos('topic:zig-package fork:false');
  const applications = await discoverRepos('topic:zig-application fork:false');
  
  const allDiscovered = [...packages, ...applications];
  // Deduplicate by ID
  const uniqueDiscovered = Array.from(new Map(allDiscovered.map(item => [item.id, item])).values());

  // 3. Reconciliation
  const newRepos: DiscoveryItem[] = [];
  const updatedRepos: DiscoveryItem[] = [];
  const removedRepos: string[] = [];

  const discoveredIds = new Set(uniqueDiscovered.map(i => i.id));

  // Identify New & Updated
  for (const item of uniqueDiscovered) {
    const tracked = state.repos[item.id];
    if (!tracked) {
      newRepos.push(item);
    } else {
      // Check if updated on GitHub since last sync
      // We compare GitHub's commit hash with our stored commit hash
      // If commit hash is missing in discovery (e.g. empty repo), fallback to updatedAt
      const hasNewCommit = item.commitHash && item.commitHash !== tracked.commitHash;
      const hasNewUpdate = item.updatedAt !== tracked.updatedAt;
      
      // If we have commit hash tracking, rely on it. Otherwise fallback to updatedAt.
      if (item.commitHash) {
        if (hasNewCommit) updatedRepos.push(item);
      } else if (hasNewUpdate) {
        updatedRepos.push(item);
      }
    }
  }

  // Identify Removed
  for (const id in state.repos) {
    if (!discoveredIds.has(id)) {
      removedRepos.push(id);
    }
  }

  console.log(`\n[Plan]`);
  console.log(` New: ${newRepos.length}`);
  console.log(` Updated: ${updatedRepos.length}`);
  console.log(` Removed: ${removedRepos.length}`);

  // 4. Process New (Priority)
  if (newRepos.length > 0) {
    await processQueue(newRepos, state, 'New Repos');
  }

  // 5. Process Updated
  if (updatedRepos.length > 0) {
    await processQueue(updatedRepos, state, 'Updated Repos');
  }

  // 6. Handle Removed (Optional: Log for now)
  if (removedRepos.length > 0) {
    console.log('\n[Removed] The following repos are no longer found in search:');
    removedRepos.forEach(id => {
      const r = state.repos[id];
      console.log(` - ${r.owner}/${r.name} (${id})`);
      // Optionally delete file:
      // const p = path.join(CONFIG.outputDir, r.owner, `${r.name}.json`);
      // if (fs.existsSync(p)) fs.unlinkSync(p);
      // delete state.repos[id];
    });
    // saveState(state);
  }

  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log('\n Done!');
}

main().catch(console.error);
