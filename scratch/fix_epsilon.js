
import fs from 'fs';
import path from 'path';

const files = [
  'src/utils/subset.js',
  'src/utils/svgHelpers.js',
  'src/utils/thompson.js',
  'src/components/AnimationOverlay.jsx',
  'src/components/AutomatonSVG.jsx',
  'src/components/AutomatonStats.jsx',
  'src/components/BuildControls.jsx',
  'src/components/CanvasPanel.jsx',
  'src/components/LearnModal.jsx',
  'src/components/RightPanel.jsx',
  'src/components/StepBuilderSidebar.jsx',
  'src/components/TransitionTable.jsx'
];

files.forEach(file => {
  const fullPath = path.resolve('/Users/jaisal/Downloads/regex-automaton', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/ε/g, '\\u03b5');
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
