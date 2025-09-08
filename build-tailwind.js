const tailwindcss = require('tailwindcss');
const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

async function buildTailwindCss() {
  const config = require(path.resolve(__dirname, 'tailwind.config.js'));
  const css = fs.readFileSync(path.resolve(__dirname, 'src/input.css'), 'utf8');

  try {
    const result = await postcss(tailwindcss(config)).process(css, {
      from: path.resolve(__dirname, 'src/input.css'),
      to: path.resolve(__dirname, 'dist/output.css'),
    });

    fs.writeFileSync(path.resolve(__dirname, 'dist/output.css'), result.css);
    console.log('Tailwind CSS built successfully!');
  } catch (error) {
    console.error('Error building Tailwind CSS:', error);
  }
}

buildTailwindCss();