import tseslint from "typescript-eslint";

export default [
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				sourceType: "module"
			}
		},
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
		],
		plugins: {
			"@typescript-eslint": tseslint.plugin
		},
		rules: {
			"no-unused-vars": "off",
			"quotes": [
				"error",
				"single",
				{
					"avoidEscape": true
				}
			],
			"no-mixed-spaces-and-tabs": "error",
			"indent": [
				"error",
				"tab",
				{
					"SwitchCase": 1
				}
			],
			"arrow-parens": [
				"error",
				"always"
			],
			"eol-last": [
				"error",
				"always"
			],
			"func-call-spacing": [
				"error",
				"never"
			],
			"comma-dangle": [
				"error",
				"always-multiline"
			],
			"no-multi-spaces": "error",
			"no-trailing-spaces": "error",
			"no-whitespace-before-property": "off",
			"semi": [
				"error",
				"always"
			],
			"semi-style": [
				"error",
				"last"
			],
			"space-in-parens": [
				"error",
				"never"
			],
			"block-spacing": [
				"error",
				"always"
			],
			"object-curly-spacing": [
				"error",
				"always"
			],
			"eqeqeq": [
				"error",
				"always",
				{
					"null": "ignore"
				}
			],
			"spaced-comment": [
				"error",
				"always",
				{
					"markers": [
						"!"
					]
				}
			],
			"yoda": "error",
			"prefer-destructuring": [
				"error",
				{
					"object": true,
					"array": false
				}
			],
			"operator-assignment": [
				"error",
				"always"
			],
			"no-useless-computed-key": "error",
			"no-unneeded-ternary": [
				"error",
				{
					"defaultAssignment": false
				}
			],
			"no-invalid-regexp": "error",
			"no-constant-condition": [
				"error",
				{
					"checkLoops": false
				}
			],
			"no-duplicate-imports": "error",
			"no-extra-semi": "error",
			"dot-notation": "error",
			"no-useless-escape": "error",
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/consistent-type-definitions': [
				'error',
				'interface'],
			'@typescript-eslint/explicit-function-return-type': 'warn',
			'@typescript-eslint/ban-ts-comment': 'warn',
			'array-bracket-spacing': [
				'error', 'never'],
			'linebreak-style': [
				'error',
				'unix'
			],
			'no-nested-ternary': 'error',
			'no-shadow': 'error',
			'no-return-await': 'error',
			'no-else-return': 'error',
			'no-empty-function': 'warn',
			'complexity': [
				'warn',
				10
			],
			'max-len': [
				'warn', {
					code: 100
				}
			],
			'no-inline-comments': 'warn',
			'no-magic-numbers': [
				'warn', {
					ignore: [0, 1],
					enforceConst: true
				}
			],
		}
	}
];
