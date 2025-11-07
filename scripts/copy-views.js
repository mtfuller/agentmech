#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Source and destination directories
const srcDir = path.join(__dirname, '..', 'src', 'views');
const destDir = path.join(__dirname, '..', 'dist', 'views');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('Created directory:', destDir);
}

// Read all HTML files from source directory
const files = fs.readdirSync(srcDir).filter(file => file.endsWith('.html'));

// Copy each HTML file
files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  fs.copyFileSync(srcFile, destFile);
  console.log(`Copied ${file} to dist/views/`);
});

console.log(`Successfully copied ${files.length} HTML file(s)`);
