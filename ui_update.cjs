const fs = require('fs');
const path = require('path');

const directoriesToSearch = [
    './',
    './components',
    './components/sprint-planner'
];

const extensions = ['.tsx', '.ts'];

const replacements = [
    { from: /indigo-/g, to: 'violet-' },
    { from: /rounded-lg/g, to: 'rounded-2xl' },
    { from: /rounded-md/g, to: 'rounded-xl' },
    { from: /shadow-md/g, to: 'shadow-lg' },
    { from: /shadow-sm/g, to: 'shadow-md' }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

directoriesToSearch.forEach(dir => {
    const absoluteDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(absoluteDir)) return;

    const files = fs.readdirSync(absoluteDir);
    files.forEach(file => {
        if (extensions.includes(path.extname(file))) {
            processFile(path.join(absoluteDir, file));
        }
    });
});
