import type { PrettierConfig } from '@trivago/prettier-plugin-sort-imports';

export default {
  trailingComma: 'all',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 120,
  arrowParens: 'always',
  endOfLine: 'lf',
  importOrder: ['<THIRD_PARTY_MODULES>', '^(src|@)/.*$', '^[./].*$'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
} satisfies PrettierConfig;
