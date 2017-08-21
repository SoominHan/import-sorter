# import-sorter
Extension which sorts TypeScript imports according to the configuration provided. The configuration defaults follow ESLint sort-imports rules.
Configuration supports regex functions to set sorting priority and rules

## Features
For now sorting supports only typescript language.

## Command
To run the sorter use `Sort Imports` command from the `Command Palette` (Ctrl+Shift+P)

## Extension Settings
an example of default configuration is provided bellow. For available options have a look at vs code settings
```json
  // Sort Order of names in curly brackets
  "importSorter.sortConfiguration.importMembers.order": "caseInsensitive",

  // Sort Direction of names in curly brackets
  "importSorter.sortConfiguration.importMembers.direction": "asc",

  // Sort Order of paths
  "importSorter.sortConfiguration.importPaths.order": "caseInsensitive",

  // Sort Direction of paths
  "importSorter.sortConfiguration.importPaths.direction": "asc",

  // Combine imports with the same path
  "importSorter.sortConfiguration.joinImportPaths": true,

  // The default order level of everything which is not include into rules
  "importSorter.sortConfiguration.customOrderingRules.defaultOrderLevel": 20,

  // The default number of empty lines after any group. This has lesser priority then empty lines in rules
  "importSorter.sortConfiguration.customOrderingRules.defaultNumberOfEmptyLinesAfterGroup": 1,

  // The default order level of everything which is not include into rules
  "importSorter.sortConfiguration.customOrderingRules.rules": [
    {
      "regex": "^@angular",
      "orderLevel": 0,
      "numberOfEmptyLinesAfterGroup": 0
    },
    {
      "regex": "^[@]",
      "orderLevel": 10
    },
    {
      "regex": "^[.]",
      "orderLevel": 30
    }
  ],

  // Left number of spaces for the new lined imports
  "importSorter.importStringConfiguration.tabSize": 4,

  // The number of new lines after the last sorted import
  "importSorter.importStringConfiguration.numberOfEmptyLinesAfterAllImports": 1,

  // The path quotes
  "importSorter.importStringConfiguration.quoteMark": "single",

  // The type of length restriction, before import is moved to a new line
  "importSorter.importStringConfiguration.maximumNumberOfImportExpressionsPerLine.type": "maxLineLength",

  // The count of units before import is newlined
  "importSorter.importStringConfiguration.maximumNumberOfImportExpressionsPerLine.count": 100,

  // Number of spaces after {
  "importSorter.importStringConfiguration.spacingPerImportExpression.afterStartingBracket": 1,

  // Number of spaces before }
  "importSorter.importStringConfiguration.spacingPerImportExpression.beforeEndingBracket": 1,

  // Number of spaces before comma
  "importSorter.importStringConfiguration.spacingPerImportExpression.beforeComma": 0,

  // Number of spaces after comma
  "importSorter.importStringConfiguration.spacingPerImportExpression.afterComma": 1,
```

## Future roadmap
- Better readme

- Read settings from the file so it can be shared with the project.

- Handle external dependencies based on the most external at the top and group based on this. Sorting will be done within those groups.

- Handle comments within import blocks

## Release Notes

### 0.0.1

Initial prototype