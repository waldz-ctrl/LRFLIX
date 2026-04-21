const fs = require('fs');
const content = fs.readFileSync('c:/Users/lenovo/LRFLIX/js/admin.js', 'utf8');
try {
    // Basic syntax check using Function constructor
    new Function(content);
    console.log('No syntax errors found.');
} catch (e) {
    console.log('Syntax error found:');
    console.log(e);
}
