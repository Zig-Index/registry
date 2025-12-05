# Zig Index Registry

The official registry of Zig packages and applications for [Zig Index](https://zig-index.github.io).

## 🌟 Overview

Zig Index is a community-driven registry for discovering and sharing Zig packages, libraries, and applications. It provides:

- **📦 Package Discovery**: Browse and search through curated Zig packages
- **🚀 Application Showcase**: Find tools and software built with Zig
- **📊 Live Statistics**: Real-time GitHub stats (stars, forks, issues)
- **📖 README Display**: View project documentation directly
- **🔧 Installation Commands**: Copy-to-clipboard `zig fetch` commands
- **👤 Developer Profiles**: View contributors and their Zig projects
- **🔍 Advanced Search**: Filter by category, license, and more

## 📁 Structure

```
repositories/
├── applications/           # Applications built with Zig
│   ├── bun.json           # Bun JavaScript runtime
│   ├── tigerbeetle.json   # TigerBeetle database
│   └── zig-compiler.json  # Zig compiler itself
└── packages/              # Zig libraries and packages
    ├── capy.json          # Cross-platform GUI library
    ├── logly.json         # Logging library
    ├── mach.json          # Game engine & graphics toolkit
    ├── zig-std.json       # Standard library docs
    └── zls.json           # Zig Language Server
```

## ➕ Adding Your Project

### Step 1: Fork this repository

Fork the [Zig Index registry repository](https://github.com/Zig-Index/zig-index.github.io) on GitHub.

### Step 2: Create a JSON file

#### For Packages (libraries/modules)

Create a file in `src/registry/repositories/packages/your-package.json`:

```json
{
  "name": "Your Package Name",
  "owner": "github-username",
  "repo": "repository-name",
  "description": "A brief description of your package (max 200 chars)",
  "homepage": "https://your-docs-site.com",
  "license": "MIT",
  "category": "networking"
}
```

#### For Applications (tools/software)

Create a file in `src/registry/repositories/applications/your-app.json`:

```json
{
  "name": "Your Application Name",
  "owner": "github-username",
  "repo": "repository-name",
  "description": "A brief description of your application",
  "homepage": "https://your-app-site.com",
  "license": "MIT",
  "category": "development-tools",
  "download_url": "https://example.com/your-app-installer.exe"
}
```

### Step 3: Submit a Pull Request

Submit a PR with your changes. We'll review and merge it!

## 📋 JSON Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Display name of the project |
| `owner` | string | ✅ | GitHub username or organization |
| `repo` | string | ✅ | GitHub repository name |
| `description` | string | ✅ | Brief description (max 200 chars) |
| `homepage` | string | ❌ | Project website or documentation URL |
| `license` | string | ❌ | SPDX license identifier (e.g., "MIT", "Apache-2.0") |
| `category` | string | ❌ | Category for filtering (see categories below) |
| `download_url` | string | ❌ | Direct download URL for binary releases |

### Required Fields

- **`name`** - The display name shown on the website
- **`owner`** - Your GitHub username or organization name  
- **`repo`** - The exact repository name on GitHub
- **`description`** - A brief description of your project (keep it under 200 characters)

### Optional Fields

- **`homepage`** - Link to your documentation or project website
- **`license`** - Use [SPDX identifiers](https://spdx.org/licenses/) (MIT, Apache-2.0, GPL-3.0, etc.)
- **`category`** - Helps users filter and discover your project
- **`download_url`** - Direct download link for pre-built binaries


## 🔧 Installation

### For Packages

Users can install packages directly using `zig fetch`:

```bash
# Using .tar.gz (recommended)
zig fetch --save https://github.com/{owner}/{repo}/archive/refs/tags/{version}.tar.gz

# Using .zip
zig fetch --save https://github.com/{owner}/{repo}/archive/refs/tags/{version}.zip
```

For repositories **without releases**, the main branch is used:

```bash
# Main branch (latest commit)
zig fetch --save https://github.com/{owner}/{repo}/archive/refs/heads/main.tar.gz
```

The website automatically generates these commands with copy-to-clipboard functionality!

### build.zig.zon Integration

After running `zig fetch --save`, add the dependency to your `build.zig`:

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Add dependency
    const dep = b.dependency("package-name", .{
        .target = target,
        .optimize = optimize,
    });

    const exe = b.addExecutable(.{
        .name = "my-app",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    // Import module from dependency
    exe.root_module.addImport("package-name", dep.module("package-name"));
    
    b.installArtifact(exe);
}
```

## 🌐 Website Features

### Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Overview with stats and featured projects |
| Packages | `/packages` | Browse all Zig packages |
| Applications | `/applications` | Browse all Zig applications |
| Search | `/search` | Advanced search with filters |
| Repository | `/repo?owner=xxx&name=yyy` | Detailed project view |
| User Profile | `/u?username=xxx` | Developer profile & projects |
| How to Add | `/how-to-add` | Submission guide |

## 📜 Guidelines

### Do Submit
- ✅ Open source Zig projects on GitHub
- ✅ Projects with `build.zig` or `build.zig.zon`
- ✅ Well-documented projects with READMEs
- ✅ Active projects (updated within the last year)

### Don't Submit
- ❌ Closed source projects
- ❌ Non-Zig projects
- ❌ Abandoned/archived repositories
- ❌ Forks without significant changes
- ❌ Tutorial/example code (unless it's a library)

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Tech Stack
- **Framework**: [Astro](https://astro.build) v5
- **UI**: React + [Tailwind CSS](https://tailwindcss.com) v4
- **Components**: [shadcn/ui](https://ui.shadcn.com)
- **Animations**: [Framer Motion](https://framer.com/motion)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Caching**: IndexedDB via [Dexie.js](https://dexie.org)
- **Hosting**: GitHub Pages

## 📄 License

This registry is open source under the **MIT License**.

## 🔗 Links

- **Website**: https://zig-index.github.io
- **Repository**: https://github.com/Zig-Index/zig-index.github.io
- **Zig Language**: https://ziglang.org
- **Zig Discord**: https://discord.gg/ziglang

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Add Projects**: Submit PRs to add Zig packages/applications
2. **Report Issues**: Found a bug? Open an issue
3. **Improve Code**: PRs for bug fixes and features welcome
4. **Spread the Word**: Share Zig Index with the community!

---

<p align="center">
  Made with ❤️ by the Zig Community
</p>
