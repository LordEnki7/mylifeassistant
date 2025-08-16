#!/bin/bash

# Auto-fix code issues
echo "🔧 Auto-fixing code issues..."

echo "🧹 Fixing ESLint issues..."
npx eslint . --ext .ts,.tsx,.js,.jsx --fix

echo "💅 Formatting with Prettier..."
npx prettier --write .

echo "✅ Code fixes complete!"