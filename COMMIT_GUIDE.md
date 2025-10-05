# Quick Usage Examples

## 🎯 Auto Commit Scenarios

### 1. Feature Development
```bash
# Working on a new sensor component
git add src/components/sensors/new-sensor-form.tsx
npm run commit
# Output: feat(ui): add new component functionality
```

### 2. Bug Fixes  
```bash
# Fixed authentication issue
git add backend/src/auth/
npm run commit
# Output: fix(auth): resolve authentication issues
```

### 3. Package Updates
```bash
# Updated dependencies
git add package.json package-lock.json
npm run commit  
# Output: upgrade(deps): update dependencies to latest versions
```

### 4. Documentation
```bash
# Updated API docs
git add docs/api.md README.md
npm run commit
# Output: docs(api): update documentation
```

### 5. Configuration Changes
```bash
# Updated build config
git add webpack.config.js tsconfig.json
npm run commit
# Output: config(build): update configuration settings
```

### 6. Tests
```bash
# Added new tests
git add src/**/*.test.ts
npm run commit
# Output: test(web): add test coverage
```

## 🔄 Alternative Methods

### Method 1: npm script (Recommended)
```bash
git add .
npm run commit
```

### Method 2: Direct node execution
```bash
git add .
node scripts/auto-commit.js
```

### Method 3: Git alias (after setup)
```bash
git config alias.ac '!npm run commit'
git add .
git ac
```

### Method 4: VS Code Task
Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Auto Commit"

## 🎨 Customization Tips

### Add Custom Types
Edit `commitlint.config.js`:
```js
'type-enum': [2, 'always', [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'chore', 'ci', 'build',
  'security',  // Add security type
  'hotfix',    // Add hotfix type
  'wip'        // Add work-in-progress type
]]
```

### Add Custom Scopes
```js
'scope-enum': [2, 'always', [
  'web', 'mobile', 'backend', 'shared',
  'notifications',  // Add notification scope
  'reports',       // Add reports scope
  'analytics'      // Add analytics scope
]]
```

### Bypass Auto-commit
```bash
# Use traditional commit
git commit -m "emergency: fix critical bug" --no-verify
```

## 📈 Benefits in Action

✅ **Before**: Inconsistent messages
```
git log --oneline
a1b2c3d updated stuff
e4f5g6h fix
h7i8j9k changes
```

✅ **After**: Professional conventional commits  
```
git log --oneline
a1b2c3d feat(sensors): implement new sensor validation
e4f5g6h fix(auth): resolve token expiration handling
h7i8j9k docs(api): update endpoint documentation
```

## 🛠️ Pro Tips

1. **Stage selectively** for better detection:
   ```bash
   git add src/components/  # UI changes
   git add src/api/        # API changes
   ```

2. **Use with conventional changelog** tools:
   ```bash
   npm install conventional-changelog-cli
   npm run changelog
   ```

3. **Integrate with CI/CD** for automated releases based on commit types

4. **Review before pushing**:
   ```bash
   git log --oneline -10  # Check recent commits
   ```