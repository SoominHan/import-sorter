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