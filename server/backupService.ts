import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';

export class BackupService {
  private excludePatterns = [
    'node_modules',
    '.git',
    '.env',
    'dist',
    'build',
    '.replit',
    'replit.nix',
    '.upm',
    '.tmp',
    '*.log',
    '.DS_Store',
    'Thumbs.db'
  ];

  async createBackup(res: Response): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `my-life-assistant-backup-${timestamp}.zip`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Pipe archive to response
    archive.pipe(res);

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    try {
      // Add source code directories
      await this.addDirectoryToArchive(archive, 'client', 'client');
      await this.addDirectoryToArchive(archive, 'server', 'server');
      await this.addDirectoryToArchive(archive, 'shared', 'shared');
      
      // Add configuration files
      await this.addFileIfExists(archive, 'package.json');
      await this.addFileIfExists(archive, 'package-lock.json');
      await this.addFileIfExists(archive, 'tsconfig.json');
      await this.addFileIfExists(archive, 'vite.config.ts');
      await this.addFileIfExists(archive, 'tailwind.config.ts');
      await this.addFileIfExists(archive, 'drizzle.config.ts');
      await this.addFileIfExists(archive, 'postcss.config.js');
      
      // Add replit-specific files (user may want to keep for reference)
      await this.addFileIfExists(archive, 'replit.md');
      
      // Add setup instructions
      await this.addSetupInstructions(archive);
      
      // Add environment template
      await this.addEnvironmentTemplate(archive);

      console.log(`Creating backup: ${filename}`);
      
      // Finalize the archive
      await archive.finalize();
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create backup' });
      }
    }
  }

  private async addDirectoryToArchive(archive: archiver.Archiver, sourcePath: string, archivePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(sourcePath)) {
        resolve();
        return;
      }

      // Add directory with basic filtering
      archive.directory(sourcePath, archivePath);
      resolve();
    });
  }

  private async addFileIfExists(archive: archiver.Archiver, filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filePath });
    }
  }

  private shouldExclude(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    return this.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Handle wildcard patterns
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName) || regex.test(relativePath);
      }
      return fileName === pattern || relativePath.includes(pattern);
    });
  }

  private async addSetupInstructions(archive: archiver.Archiver): Promise<void> {
    const setupInstructions = `# My Life Assistant - Standalone Setup Guide

## Overview
This backup contains your complete Life Assistant application that can be run independently of Replit.

## Prerequisites
- Node.js 18 or higher
- PostgreSQL database (local or cloud)
- Git (optional, for version control)

## Setup Instructions

### 1. Extract Files
Extract this zip file to your desired directory:
\`\`\`bash
unzip my-life-assistant-backup-*.zip
cd my-life-assistant-backup-*
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Database Setup
Create a PostgreSQL database and update the connection string in your environment variables.

#### Option A: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database: \`createdb mylifeassistant\`
3. Update DATABASE_URL in .env file

#### Option B: Cloud Database
1. Use services like Supabase, PlanetScale, or AWS RDS
2. Get connection string from your provider
3. Update DATABASE_URL in .env file

### 4. Environment Configuration
Copy and configure environment variables:
\`\`\`bash
cp .env.template .env
\`\`\`

Edit .env file with your actual values:
- DATABASE_URL: Your PostgreSQL connection string
- JWT_SECRET: Generate a secure random string
- OPENAI_API_KEY: Your OpenAI API key (optional)
- Other API keys as needed

### 5. Database Migration
Run database migrations to set up tables:
\`\`\`bash
npm run db:push
\`\`\`

### 6. Build and Start
For development:
\`\`\`bash
npm run dev
\`\`\`

For production:
\`\`\`bash
npm run build
npm start
\`\`\`

## Available Scripts
- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm start\` - Start production server
- \`npm run db:push\` - Apply database schema changes
- \`npm run db:studio\` - Open database browser (Drizzle Studio)

## Important Notes
- This backup was created on: ${new Date().toISOString()}
- Make sure to secure your environment variables
- Set up proper SSL certificates for production
- Configure your database for production use
- Consider setting up process managers like PM2 for production

## Deployment Options
1. **VPS/Cloud Server**: Deploy to DigitalOcean, AWS EC2, etc.
2. **Platform as a Service**: Vercel, Netlify, Railway, etc.
3. **Container**: Use Docker for containerized deployment
4. **Local**: Run on your local machine

## Troubleshooting
- Ensure all environment variables are set correctly
- Check database connection and permissions
- Verify Node.js version compatibility
- Check firewall settings for database access

## Support
This is a self-contained backup of your Life Assistant application.
All original functionality should work once properly configured.

Happy deploying! 🚀
`;

    archive.append(setupInstructions, { name: 'SETUP_INSTRUCTIONS.md' });
  }

  private async addEnvironmentTemplate(archive: archiver.Archiver): Promise<void> {
    const envTemplate = `# Environment Variables Template
# Copy this file to .env and fill in your actual values

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/mylifeassistant"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-here"

# OpenAI API Key (optional - for AI features)
OPENAI_API_KEY="your-openai-api-key-here"

# Application Settings
NODE_ENV="development"
PORT="5000"

# Additional API Keys (add as needed)
# STRIPE_SECRET_KEY="your-stripe-secret-key"
# VITE_STRIPE_PUBLIC_KEY="your-stripe-public-key"
# TWILIO_ACCOUNT_SID="your-twilio-account-sid"
# TWILIO_AUTH_TOKEN="your-twilio-auth-token"

# Database Connection Details (for manual setup)
PGHOST="localhost"
PGPORT="5432"
PGDATABASE="mylifeassistant"
PGUSER="your-username"
PGPASSWORD="your-password"
`;

    archive.append(envTemplate, { name: '.env.template' });
  }
}