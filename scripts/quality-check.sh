#!/bin/bash

# Code Quality Check Script
echo "🔍 Running code quality checks..."

echo "📝 Checking TypeScript..."
npx tsc --noEmit

echo "🧹 Checking ESLint..."
npx eslint . --ext .ts,.tsx,.js,.jsx

echo "💅 Checking Prettier formatting..."
npx prettier --check .

echo "🔒 Running security audit..."
npm audit --audit-level moderate

echo "✅ Quality checks complete!"