# Auto Commit Message Generator

This project includes an intelligent commit message generator that automatically creates conventional commit messages based on your staged changes.

## 🚀 Quick Start

### Method 1: Using npm script (Recommended)
```bash
# Stage your changes
git add .

# Generate and commit with auto message
npm run commit
```

### Method 2: Direct script execution
```bash
# Stage your changes
git add .

# Run the auto-commit script
node scripts/auto-commit.js
```

### Method 3: Bash script (Linux/Mac/WSL)
```bash
# Make script executable
chmod +x scripts/auto-commit.sh

# Stage your changes
git add .

# Run the script
./scripts/auto-commit.sh
```

## 📋 Commit Types

The generator automatically detects the appropriate commit type:

- **feat** - New features
- **fix** - Bug fixes  
- **upgrade** - Package updates
- **test** - Test additions/updates
- **docs** - Documentation changes
- **config** - Configuration changes
- **refactor** - Code refactoring
- **style** - Code formatting
- **perf** - Performance improvements
- **chore** - Build/tool changes

## 🎯 Scopes

Scopes are automatically detected based on file paths:

- **web** - Frontend changes (`web/`)
- **mobile** - Mobile app changes (`mobile/`)  
- **backend** - Backend API changes (`backend/`)
- **shared** - Shared library changes (`shared/`)
- **database** - Database schema changes
- **auth** - Authentication related
- **sensors** - Sensor functionality
- **ui** - UI components
- **api** - API endpoints
- **deps** - Dependency updates
- **config** - Configuration files
- **tests** - Test files

## 🔍 How It Works

1. **File Analysis**: Scans staged files to determine context
2. **Type Detection**: Identifies commit type based on:
   - File patterns (package.json → upgrade)
   - Directory structure (web/ → web scope)
   - Content analysis (test files → test type)
3. **Smart Descriptions**: Generates contextual descriptions
4. **Validation**: Uses commitlint to ensure conventional format

## 📝 Examples

```bash
# Package updates
feat(deps): update dependencies to latest versions

# New component
feat(ui): add new component functionality

# Bug fix
fix(auth): resolve authentication issues

# Documentation
docs(api): update api documentation

# Configuration
config(web): update build configuration
```

## ⚙️ Configuration

### Commit Message Rules
Edit `commitlint.config.js` to customize:
- Available types and scopes
- Message length limits
- Validation rules

### Auto-detection Logic
Modify `scripts/auto-commit.js` to adjust:
- Type detection patterns
- Scope mapping rules  
- Description templates

## 🛠️ Advanced Usage

### Interactive Mode
The script offers three options:
- **y/yes** - Use generated message
- **e/edit** - Provide custom message
- **n/no** - Cancel commit

### Custom Messages
You can still use regular git commit:
```bash
git commit -m "custom message"
```

### Bypass Validation
For emergency commits:
```bash
git commit -m "emergency fix" --no-verify
```

## 🔗 Integration

### VS Code
Add to `.vscode/tasks.json`:
```json
{
  "label": "Auto Commit",
  "type": "shell", 
  "command": "npm run commit",
  "group": "build"
}
```

### Git Aliases
Add to `.gitconfig`:
```ini
[alias]
  ac = !npm run commit
```

## 📊 Benefits

✅ **Consistent Format** - All commits follow conventional format  
✅ **Time Saving** - No more thinking about commit messages  
✅ **Context Aware** - Messages reflect actual changes  
✅ **Team Standard** - Enforces project conventions  
✅ **Changelog Ready** - Compatible with automated changelog tools

## 🔧 Troubleshooting

### No staged files
```bash
Error: No staged files found
Solution: git add <files> first
```

### Commitlint errors
```bash
Error: subject must not be sentence-case
Solution: Adjust commitlint.config.js rules
```

### Permission issues (Linux/Mac)
```bash
chmod +x scripts/auto-commit.sh
```

## 🎨 Customization

Feel free to modify the scripts to match your project's specific needs:
- Add new commit types
- Adjust scope detection logic
- Customize description templates
- Add project-specific patterns

Happy committing! 🎉