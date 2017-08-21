# import-sorter
Extension which sorts TypeScript imports according to the configuration provided. The configuration defaults follow ESLint sort-imports rules.
Configuration supports regex functions to set sorting priority and rules

## Features
For now sorting supports only typescript language.

## Command
To run the sorter use `Sort Imports` command from the `Command Palette` (Ctrl+Shift+P)

## Extension Settings
an example of default configuration is provided bellow. For available options have a look at vs code settings(it should show available settings when you search for importSorter)
```json
  // Default file configuration name
  "importSorter.generalConfiguration.configurationFilePath": "./import-sorter.json",

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

  // If always/multiLine then adds a trailing comma at the end of the imports for 'single and multi' and 'multi-line' imports respectively. Default is none therefore no trailing comma
  "importSorter.importStringConfiguration.trailingComma": "none"
```
## Some settings in more details:
- `importSorter.generalConfiguration.configurationFilePath` adds an option to read configuration from file. The setting represents a relative path to the root of the open vscode workspace.
The default value is `./import-sorter.json`. Bellow is a example of the configuration:
```json
    {
      "importStringConfiguration": {
        "trailingComma": "multiLine",
        "tabSize": 4,
        "maximumNumberOfImportExpressionsPerLine": {
          "count": 50
        }
      },
      "sortConfiguration": {
        "customOrderingRules": {
          "defaultNumberOfEmptyLinesAfterGroup": 2
        }
      }
    }
```
The priority of settings is given to configuration file. If the setting does not exist in the configuration file then the value of the vscode setting will be taken. If file does not exist, then all settings will be taken from vscode.

- `importSorter.importStringConfiguration.trailingComma` is an enum which can be `always`, `multiLine`, or `none`.
  - `always` - will always append trailing comma.
  - `multiLine` - will append comma if import line is broken to multiple lines.
  - `none` - will not append comma(`This one is a default setting`)

## Future roadmap
- Better readme

- Handle external dependencies based on the most external dependencies being at the top and group based on those. Sorting will be done within those groups.

- Handle comments within import blocks

## Release Notes

### 0.0.2
- Added configuration file support
- Added `importSorter.importStringConfiguration.trailingComma`.

### 0.0.1

Initial prototype