# [3.1.0]
### New features
* Adding `maximumNumberOfImportExpressionsPerLine.type: newLineEachExpressionAfterCountLimitExceptIfOnlyOne`, to be able to integrate with behavior of prettier. This is done to address
[GitHub Prettier Issues #1954](https://github.com/prettier/prettier/issues/1954)

# [3.0.0]
### Breaking changes
* The core of the import sorter uses fs package to read files. It also uses fs to write when directory sort is performed.
### New features
* Import sorter adds a way to sort in directories, so that you could perform the sort for the whole code base (feature request #17). Do make sure that the project is managed by some version control system before performing the global source code sort.
### Bug fixes
* fixing issue #21 with null
* fixing issue #19 with length count
* fixing other minor issues

# [2.0.2]
### Bug fixes
* fixing configuration as proxy. issue #16

# [2.0.0]
### Breaking changes
* default sorting rules have been changed to:
```json
[
    {
        "type": "importMember",
        "regex": "^$",
        "orderLevel": 10,
        "disableSort": true
    },
    {
        "regex": "^[@]",
        "orderLevel": 30
    },
    {
        "regex": "^[.]",
        "orderLevel": 40
    }
]
```

### New features
* added support of the comments blocks.
* added `importSorter.sortConfiguration.customOrderingRules.disableDefaultOrderSort` and `importSorter.sortConfiguration.customOrderingRules.rules.disableSort` which allows to
disable sort for the group of imports
### Bug fixes
* fixing semi-relative import paths
* correcting `newLineEachExpressionAfterCountLimit`

# [1.2.0]
### New features
* added `importSorter.generalConfiguration.exclude` to define the type of characters for new-lined imports
### Bug fixes
* fixing multisave sort: so if auto save is enabled, then multiple files are sorted correctly.

# [1.1.1]
### Bug fixes
* fixing behavior of on before save sorting.

# [1.1.0]
### New features
* added an option to sort imports before each save of the document. The corresponding config record is "importSorter.generalConfiguration.sortOnBeforeSave". The default value is false, which disables sort on save.

# [1.0.0]
### New features
* added logo, so can finally switch to version 1.0.0
* added `importSorter.importStringConfiguration.tabType` to define the type of characters for new-lined imports
* updated `importSorter.importStringConfiguration.maximumNumberOfImportExpressionsPerLine.type` to have `newLineEachExpressionAfterCountLimit` value. See readme for explanations of the feature.

# [0.0.5]
* added gif example

# [0.0.4]
### New features
* added support for .tsx;

# [0.0.3]
### New features
* added support for optional semicolons which is toggled through `importSorter.importStringConfiguration.hasSemicolon`;

# [0.0.2]
### New features
* added support for trailing commas. `importSorter.importStringConfiguration.trailingComma` is an enum which can be `always`, `multiLine`, or `none`.

* added configuration file support. Configuration can be read from json file. The file is specified by `importSorter.generalConfiguration.configurationFilePath` setting.

* bug fixes.

# Initial version 0.0.1
First prototype is released