const path = require('path');

// 项目根目录（向上三级：themes/lowkey/config → 根）
const rootDir = path.join(__dirname, '..', '..', '..');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    `${rootDir}/themes/**/layouts/**/*.html`,
    `${rootDir}/layouts/**/*.html`,
    `${rootDir}/content/**/*.html`,
    `${rootDir}/content/**/*.md`,
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'avenir next', 'avenir', 'segoe ui', 'helvetica neue', 'helvetica', 'Cantarell', 'Ubuntu', 'roboto', 'noto', 'arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
