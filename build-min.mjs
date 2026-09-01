// Generates minified production copies (index.min.html / style.min.css / script.min.js)
// from the readable source files. Re-run this after editing index.html / style.css / script.js.
// Usage: node build-min.mjs
import fs from 'fs';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

async function buildCss() {
  const src = fs.readFileSync('style.css', 'utf8');
  const out = new CleanCSS({ level: 2 }).minify(src);
  if (out.errors.length) throw new Error(out.errors.join('\n'));
  fs.writeFileSync('style.min.css', out.styles);
  console.log(`style.css  ${src.length.toLocaleString()} -> style.min.css  ${out.styles.length.toLocaleString()} bytes`);
}

async function buildJs() {
  const src = fs.readFileSync('script.js', 'utf8');
  const out = await minifyJs(src, { compress: true, mangle: true });
  fs.writeFileSync('script.min.js', out.code);
  console.log(`script.js  ${src.length.toLocaleString()} -> script.min.js  ${out.code.length.toLocaleString()} bytes`);
}

async function buildHtml() {
  // Point the minified HTML at the minified CSS/JS assets.
  let src = fs.readFileSync('index.html', 'utf8');
  src = src.replace('href="style.css"', 'href="style.min.css"');
  src = src.replace('src="script.js" defer', 'src="script.min.js" defer');

  const out = await minifyHtml(src, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    removeEmptyAttributes: false,
    removeRedundantAttributes: false,
  });
  fs.writeFileSync('index.min.html', out);
  console.log(`index.html ${src.length.toLocaleString()} -> index.min.html ${out.length.toLocaleString()} bytes`);
}

await buildCss();
await buildJs();
await buildHtml();
console.log('\nDone. index.min.html / style.min.css / script.min.js are the deploy copies.');
console.log('Source files (index.html / style.css / script.js) are untouched — keep editing those.');
