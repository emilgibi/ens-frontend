import antfu from '@antfu/eslint-config'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default antfu(
  {
    formatters: true,
    react: true,
    ignores: ['**/dist', '**/node_modules', '**/src/components/ui', 'coverage', 'build', 'out'],
  },
  ...compat.config({
    extends: [
      'plugin:@next/next/recommended',
    ],
    rules: {
        'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',
    }
  }),
)