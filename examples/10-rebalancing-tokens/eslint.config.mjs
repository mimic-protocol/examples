import eslintPluginTypeScript from "@typescript-eslint/eslint-plugin"
import eslintParserTypeScript from "@typescript-eslint/parser"
import eslintPluginImport from "eslint-plugin-import"
import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort"
import eslintConfigPrettier from "eslint-config-prettier"
import eslintPluginPrettier from "eslint-plugin-prettier"

export default [
  {
    ignores: ["node_modules/**", "**/dist/**", "**/build/**", "**/.prettierrc.*", "./src/types/**"]
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: eslintParserTypeScript,
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": eslintPluginTypeScript,
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
      "simple-import-sort": eslintPluginSimpleImportSort
    },
    rules: {
      ...eslintPluginTypeScript.configs.recommended.rules,
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      
      "prettier/prettier": [
        "error",
        {
          "semi": false,
          "singleQuote": true,
          "trailingComma": "es5",
          "arrowParens": "always",
          "bracketSpacing": true,
          "printWidth": 120,
          "tabWidth": 2,
          "useTabs": false
        }
      ],
      
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^@?\\w"],
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"]
          ]
        }
      ],
      "simple-import-sort/exports": "error",
      
      "comma-spacing": ["error", { before: false, after: true }],
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 1 }]
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json"
        }
      }
    }
  },
  // configuration for test files
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/*.test.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: eslintParserTypeScript,
      parserOptions: {
        project: "./tests/tsconfig.json"
      }
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off"
    }
  },
  eslintConfigPrettier
]