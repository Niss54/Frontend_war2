import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const coreDir = path.join(componentsDir, 'core');
const modulesDir = path.join(componentsDir, 'modules');

// 1. Create directories
if (!fs.existsSync(coreDir)) fs.mkdirSync(coreDir, { recursive: true });
if (!fs.existsSync(modulesDir)) fs.mkdirSync(modulesDir, { recursive: true });

// 2. Move folders
const moves = [
  { from: 'layout', to: 'core/layout' },
  { from: 'ui', to: 'core/ui' },
  { from: 'alerts', to: 'modules/alerts' },
  { from: 'flights', to: 'modules/flights' },
  { from: 'gates', to: 'modules/gates' },
  { from: 'retail', to: 'modules/retail' },
  { from: 'paxbag', to: 'modules/paxbag' },
  { from: 'baggage', to: 'modules/paxbag/baggage' },
  { from: 'passengers', to: 'modules/paxbag/passengers' },
  { from: 'ops', to: 'modules/ops' },
  { from: 'security', to: 'modules/ops/security' },
  { from: 'staff', to: 'modules/ops/staff' },
  { from: 'maintenance', to: 'modules/ops/maintenance' },
];

for (const move of moves) {
  const src = path.join(componentsDir, move.from);
  const dest = path.join(componentsDir, move.to);
  if (fs.existsSync(src)) {
    // If destination already exists (like modules/paxbag), we should move contents
    // Actually, fs.renameSync doesn't merge folders.
    // We can just move contents of baggage into modules/paxbag/baggage?
    // The prompt says "Consolidate baggage, passengers, and paxbag". 
    // It's cleaner to just move the entire baggage folder into modules/paxbag/baggage.
    fs.renameSync(src, dest);
    console.log(`Moved ${move.from} to ${move.to}`);
  }
}

// 3. Fix Imports in all files
function walkFiles(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) walkFiles(dirPath, callback);
    else callback(dirPath);
  });
}

const fixImports = (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Fix App.tsx
  if (path.basename(filePath) === 'App.tsx') {
    content = content.replace(/'\.\/components\/(layout|ui)\//g, "'./components/core/$1/");
    content = content.replace(/'\.\/components\/(alerts|flights|gates|retail|paxbag|ops)\//g, "'./components/modules/$1/");
  } 
  else if (filePath.includes(path.normalize('components/modules')) || filePath.includes(path.normalize('components\\modules')) || filePath.includes(path.normalize('components/core')) || filePath.includes(path.normalize('components\\core'))) {
    // Depth increased from 2 (components/folder) to 3 (components/modules/folder)
    // For baggage/passengers it went from 2 to 4 (components/modules/paxbag/baggage)
    // Let's just calculate relative path dynamically for root folders
    
    // Convert all imports to use absolute path logic, then resolve back to relative
    // To make it easy, we will just use regex to fix up known paths.
    
    // Anything going to context/types/utils/data/engine/hooks:
    // If it was '../../context', and now we are 1 level deeper, it becomes '../../../context'
    // But baggage is 2 levels deeper.
    // It's safer to use the actual file path.
    const fileDepth = filePath.split(path.sep).length - srcDir.split(path.sep).length;
    // fileDepth for App.tsx is 1. 
    // for components/modules/flights/FlightRow.tsx is 4. (src/components/modules/flights/FlightRow.tsx)
    // for components/modules/paxbag/baggage/BaggagePanel.tsx is 5.
    
    // Instead of regex hacking, let's use @/ alias in vite/tsconfig and rewrite ALL internal imports to @/.
    // Let's replace any import matching /['"](\.\.\/)+([^'"]+)['"]/
    
    content = content.replace(/['"](\.\.\/)+([^'"]+)['"]/g, (match, p1, p2) => {
      // p2 is something like 'types/airport' or 'ui/SplitFlapText'
      if (['types', 'utils', 'context', 'hooks', 'engine', 'data'].some(folder => p2.startsWith(folder))) {
        // Just construct the new relative path
        const upLevels = '../'.repeat(fileDepth - 1);
        return `'${upLevels}${p2}'`;
      }
      
      // If pointing to another component
      if (p2.startsWith('layout/') || p2.startsWith('ui/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}core/${p2}'`;
      }
      
      if (p2.startsWith('alerts/') || p2.startsWith('flights/') || p2.startsWith('gates/') || p2.startsWith('retail/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}modules/${p2}'`;
      }
      
      if (p2.startsWith('paxbag/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}modules/${p2}'`;
      }
      if (p2.startsWith('baggage/') || p2.startsWith('passengers/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}modules/paxbag/${p2}'`;
      }
      if (p2.startsWith('ops/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}modules/${p2}'`;
      }
      if (p2.startsWith('security/') || p2.startsWith('staff/') || p2.startsWith('maintenance/')) {
        const upLevels = '../'.repeat(fileDepth - 2);
        return `'${upLevels}modules/ops/${p2}'`;
      }
      
      return match;
    });

    // Handle imports like '../baggage/BaggagePanel' inside paxbag
    content = content.replace(/['"]\.\/components\/(layout|ui)\/([^'"]+)['"]/g, "'../core/$1/$2'");
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated imports in ${path.basename(filePath)}`);
  }
};

walkFiles(srcDir, fixImports);
