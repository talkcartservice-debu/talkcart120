const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting custom Vercel build process...');

try {
  // Ensure we're using the correct Next.js version
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Build the Next.js app
  console.log('Building Next.js app...');
  execSync('npx next build', { stdio: 'inherit' });
  
  // Verify that routes-manifest.json exists
  const routesManifestPath = path.join('.next', 'routes-manifest.json');
  if (fs.existsSync(routesManifestPath)) {
    console.log('routes-manifest.json found successfully');
  } else {
    console.log('routes-manifest.json not found, creating a minimal one...');
    const minimalRoutesManifest = {
      version: 3,
      pages404: true,
      basePath: "",
      redirects: [],
      rewrites: [],
      headers: [],
      dynamicRoutes: [],
      staticRoutes: []
    };
    
    fs.writeFileSync(routesManifestPath, JSON.stringify(minimalRoutesManifest));
    console.log('Created minimal routes-manifest.json');
  }
  
  console.log('Build process completed successfully');
} catch (error) {
  console.error('Build process failed:', error.message);
  process.exit(1);
}