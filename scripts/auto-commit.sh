#!/bin/bash

# Function to get the current branch name
get_branch() {
  git rev-parse --abbrev-ref HEAD
}

# Function to get staged files
get_staged_files() {
  git diff --cached --name-only
}

# Function to detect the type of change
detect_type() {
  local files="$1"
  
  # Check for specific patterns
  if echo "$files" | grep -q "package\.json\|package-lock\.json\|yarn\.lock"; then
    echo "upgrade"
  elif echo "$files" | grep -q "\.test\.\|\.spec\.\|__tests__"; then
    echo "test"
  elif echo "$files" | grep -q "\.md$\|README\|CHANGELOG"; then
    echo "docs"
  elif echo "$files" | grep -q "\.config\.\|\.env\|tsconfig\|eslint\|prettier"; then
    echo "config"
  elif echo "$files" | grep -q "schema\.prisma\|migrations"; then
    echo "feat"
  elif echo "$files" | grep -q "src/components\|src/ui"; then
    echo "feat"
  elif echo "$files" | grep -q "src/api\|src/routes"; then
    echo "feat"
  elif echo "$files" | grep -q "fix\|bug" || git log -1 --pretty=%B | grep -qi "fix\|bug"; then
    echo "fix"
  else
    echo "feat"
  fi
}

# Function to detect scope
detect_scope() {
  local files="$1"
  
  if echo "$files" | grep -q "^web/"; then
    echo "web"
  elif echo "$files" | grep -q "^mobile/"; then
    echo "mobile"
  elif echo "$files" | grep -q "^backend/"; then
    echo "backend"
  elif echo "$files" | grep -q "^shared/"; then
    echo "shared"
  elif echo "$files" | grep -q "schema\.prisma\|migrations"; then
    echo "database"
  elif echo "$files" | grep -q "auth"; then
    echo "auth"
  elif echo "$files" | grep -q "sensor"; then
    echo "sensors"
  elif echo "$files" | grep -q "package\.json\|package-lock\.json"; then
    echo "deps"
  elif echo "$files" | grep -q "\.config\.\|\.env\|tsconfig"; then
    echo "config"
  else
    echo "general"
  fi
}

# Function to generate description
generate_description() {
  local type="$1"
  local scope="$2"
  local files="$3"
  
  # Get number of files changed
  local file_count=$(echo "$files" | wc -l)
  
  # Generate description based on context
  case "$type" in
    "feat")
      if echo "$files" | grep -q "component"; then
        echo "add new component functionality"
      elif echo "$files" | grep -q "api\|route"; then
        echo "implement new api endpoint"
      elif echo "$files" | grep -q "auth"; then
        echo "enhance authentication features"
      else
        echo "implement new feature"
      fi
      ;;
    "fix")
      echo "resolve issue with functionality"
      ;;
    "upgrade")
      echo "update dependencies to latest versions"
      ;;
    "test")
      echo "add test coverage for components"
      ;;
    "docs")
      echo "update documentation"
      ;;
    "config")
      echo "update configuration settings"
      ;;
    "refactor")
      echo "improve code structure and organization"
      ;;
    *)
      echo "update $scope implementation"
      ;;
  esac
}

# Main function
main() {
  local staged_files=$(get_staged_files)
  
  if [ -z "$staged_files" ]; then
    echo "No staged files found. Please stage your changes first."
    exit 1
  fi
  
  local type=$(detect_type "$staged_files")
  local scope=$(detect_scope "$staged_files")
  local description=$(generate_description "$type" "$scope" "$staged_files")
  
  # Generate the commit message
  local commit_msg="$type($scope): $description"
  
  # Show the generated message and ask for confirmation
  echo "Generated commit message:"
  echo "  $commit_msg"
  echo ""
  read -p "Use this message? (y/n/e for edit): " choice
  
  case "$choice" in
    y|Y|yes|Yes)
      git commit -m "$commit_msg"
      ;;
    e|E|edit|Edit)
      echo "Enter your custom commit message:"
      read -r custom_msg
      git commit -m "$custom_msg"
      ;;
    *)
      echo "Commit cancelled."
      exit 1
      ;;
  esac
}

# Run the main function
main "$@"