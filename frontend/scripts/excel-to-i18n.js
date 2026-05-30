#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Converts Excel translations to JSON files
 * 
 * Excel format:
 * | Key                | FR                    | EN                  |
 * |--------------------|----------------------|---------------------|
 * | HomePage.title     | Titre en français    | Title in English    |
 * | Auth.login         | Connexion            | Login               |
 */

function convertExcelToJson(excelFilePath) {
  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON array
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Initialize translation objects
  const translations = {
    fr: {},
    en: {}
  };

  // Process each row
  data.forEach(row => {
    const key = row.Key || row.key;
    const fr = row.FR || row.fr;
    const en = row.EN || row.en;

    if (!key) {
      console.warn('⚠️  Skipping row without key:', row);
      return;
    }

    // Split key by dots to create nested structure
    // Example: "HomePage.title" -> { HomePage: { title: "..." } }
    const keys = key.split('.');

    // Set French translation
    if (fr) {
      let current = translations.fr;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = fr;
    }

    // Set English translation
    if (en) {
      let current = translations.en;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = en;
    }
  });

  // Write JSON files
  const messagesDir = path.join(__dirname, '../messages');

  // Ensure messages directory exists
  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
  }

  // Write fr.json
  fs.writeFileSync(
    path.join(messagesDir, 'fr.json'),
    JSON.stringify(translations.fr, null, 2),
    'utf-8'
  );

  // Write en.json
  fs.writeFileSync(
    path.join(messagesDir, 'en.json'),
    JSON.stringify(translations.en, null, 2),
    'utf-8'
  );

  console.log('✅ Translations generated successfully!');
  console.log(`📁 French: messages/fr.json`);
  console.log(`📁 English: messages/en.json`);
  console.log(`📊 Total keys: ${data.length}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: Please provide an Excel file path');
  console.log('\nUsage:');
  console.log('  node scripts/excel-to-i18n.js <excel-file.xlsx>');
  console.log('\nExample:');
  console.log('  node scripts/excel-to-i18n.js translations.xlsx');
  process.exit(1);
}

const excelFile = args[0];

if (!fs.existsSync(excelFile)) {
  console.error(`❌ Error: File not found: ${excelFile}`);
  process.exit(1);
}

try {
  convertExcelToJson(excelFile);
} catch (error) {
  console.error('❌ Error converting Excel to JSON:', error.message);
  process.exit(1);
}
