module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'chore',    // Build process or auxiliary tool changes
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commit
        'upgrade',  // Package upgrades
        'config',   // Configuration changes
        'security', // Security fixes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'web',      // Web frontend changes
        'mobile',   // Mobile app changes
        'backend',  // Backend API changes
        'shared',   // Shared library changes
        'database', // Database schema changes
        'auth',     // Authentication changes
        'sensors',  // Sensor-related features
        'ui',       // UI component changes
        'api',      // API endpoint changes
        'types',    // TypeScript type changes
        'deps',     // Dependency updates
        'config',   // Configuration changes
        'docs',     // Documentation
        'tests',    // Test-related changes
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 10],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};