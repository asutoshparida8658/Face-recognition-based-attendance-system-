const fs = require('fs');
const path = require('path');


function ensureDirectories() {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/faces'),
    path.join(__dirname, '../uploads/temp')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    } else {
      console.log(`Directory exists: ${dir}`);
    }
  });
  
  console.log('All required directories are in place');
}

module.exports = ensureDirectories;