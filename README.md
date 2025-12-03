# Zig Index Registry

The official registry of Zig packages and applications for [Zig Index](https://zig-index.github.io).

## Structure

```
repositories/
├── applications/    # Applications built with Zig
│   ├── bun.json
│   ├── tigerbeetle.json
│   └── zig-compiler.json
└── packages/        # Zig libraries and packages
    ├── capy.json
    ├── mach.json
    ├── zig-std.json
    └── zls.json
```

## Adding Your Project

### 1. Fork this repository

### 2. Create a JSON file

For **packages** (libraries/modules), create a file in `repositories/packages/`:

```json
{
  "name": "Your Package Name",
  "owner": "github-username",
  "repo": "repository-name",
  "description": "A brief description of your package",
  "homepage": "https://your-docs-site.com",
  "license": "MIT",
  "category": "networking"
}
```

For **applications** (tools/software), create a file in `repositories/applications/`:

```json
{
  "name": "Your Application Name",
  "owner": "github-username",
  "repo": "repository-name",
  "description": "A brief description of your application",
  "homepage": "https://your-app-site.com",
  "license": "MIT",
  "category": "development-tools"
}
```

### 3. Submit a Pull Request

Submit a PR with your changes. We'll review and merge it!

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Display name of the project |
| `owner` | string | ✅ | GitHub username or organization |
| `repo` | string | ✅ | GitHub repository name |
| `description` | string | ✅ | Brief description (max 200 chars) |
| `homepage` | string | ❌ | Project website or documentation URL |
| `license` | string | ❌ | SPDX license identifier (e.g., "MIT", "Apache-2.0") |
| `category` | string | ❌ | Category for filtering (e.g., "gui", "networking", "game-engine") |

## Guidelines

- Only submit **Zig-related** projects
- Projects must be **open source** on GitHub
- Provide accurate and helpful descriptions
- Use existing topic tags when possible

## License

This registry is open source under the MIT License.

## Links

- **Website**: https://zig-index.github.io
- **Main Repository**: https://github.com/Zig-Index/website
- **Zig Language**: https://ziglang.org
