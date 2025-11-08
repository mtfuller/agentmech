#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Source and destination directories
const srcDir = path.join(__dirname, '..', 'src', 'views');
const destDir = path.join(__dirname, '..', 'dist', 'views');

// Check if source directory exists
if (!fs.existsSync(srcDir)) {
  console.error(`Error: Source directory does not exist: ${srcDir}`);
  console.error('Please ensure the src/views directory exists before building.');
  process.exit(1);
}

// Create destination directory if it doesn't exist
try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('Created directory:', destDir);
  }
} catch (error) {
  console.error(`Error creating destination directory: ${error.message}`);
  process.exit(1);
}

// Read all HTML and CSS files from source directory
let files;
try {
  files = fs.readdirSync(srcDir).filter(file => file.endsWith('.html') || file.endsWith('.css'));
} catch (error) {
  console.error(`Error reading source directory: ${error.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.warn('Warning: No HTML or CSS files found in src/views/');
  process.exit(0);
}

// Copy each file
let successCount = 0;
let errorCount = 0;

files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  
  try {
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${file} to dist/views/`);
    successCount++;
  } catch (error) {
    console.error(`Error copying ${file}: ${error.message}`);
    errorCount++;
  }
});

if (errorCount > 0) {
  console.error(`Failed to copy ${errorCount} file(s)`);
  process.exit(1);
}

console.log(`Successfully copied ${successCount} file(s)`);
