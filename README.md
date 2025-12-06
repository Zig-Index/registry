# Zig Index Registry

**Zig Index is an independent and unofficial registry of Zig projects. It is not affiliated with, endorsed by, or maintained by the Zig Software Foundation or any of its founders. All projects listed on this website are owned and maintained by their respective developers and the community. No ownership or responsibility is claimed over any third-party software hosted or indexed. I do not own or claim any rights to trademarks, logos, or names referenced or displayed; all such assets belong to their respective owners.**

> **Update:** Based on community feedback, the registry functionality has been changed to be fully automated! no need for Fork PR anymore, Thank you for all your feedback!
> All new projects will appear on the live site within few hours automatically!

## 🌟 Overview

Zig Index is a community-driven registry for discovering and sharing Zig projects. It provides:

- **📦 Project Discovery**: Browse and search through curated Zig projects
- **🚀 Project Showcase**: Find tools and software built with Zig
- **📊 Live Statistics**: Real-time GitHub stats (stars, forks, issues)
- **📖 README Display**: View project documentation directly
- **🔧 Installation Commands**: Copy-to-clipboard `zig fetch` commands
- **👤 Developer Profiles**: View contributors and their Zig projects
- **🔍 Advanced Search**: Filter by category, license, topic, and more

## 📁 Structure

```
database/
├── username/              # GitHub username or organization
│   ├── repo-name.json     # Repository details
│   └── another-repo.json
└── another-user/
    └── project.json
```

## ➕ Adding Your Project

###  Add GitHub Topics

You **must** add one of the following topics to your GitHub repository:

- **For Packages**: Add `zig-package`
- **For Applications**: Add `zig-application`

Optionally, you can also add `zig-index` to show support.


## 🔧 Installation

### For Projects

Users can install projects directly using `zig fetch`:

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

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Add Projects**: Add zig-index & zig-package/zig-application topics to your repo
2. **Report Issues**: Found a bug? Open an issue
3. **Improve Code**: PRs for bug fixes and features welcome
4. **Spread the Word**: Share Zig Index with the community!

---

<p align="center">
  Made with ❤️ by the Zig Community
</p>
