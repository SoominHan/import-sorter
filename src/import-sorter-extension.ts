import * as fs from 'fs';
import { chain, merge } from 'lodash';
import { sep } from 'path';
import {
    Position,
    Range,
    StatusBarAlignment,
    StatusBarItem,
    TextDocument,
    TextEditorEdit,
    TextLine,
    window,
    workspace
} from 'vscode';

import {
    AstWalker,
    defaultGeneralConfiguration,
    GeneralConfiguration,
    ImportCreator,
    ImportElement,
    ImportSorter,
    ImportSorterConfiguration,
    ImportStringConfiguration,
    SortConfiguration
} from './core';

const EXTENSION_CONFIGURATION_NAME = 'importSorter';

export class ImportSorterExtension {
    private statusBarItem: StatusBarItem;
    private walker: AstWalker;
    private sorter: ImportSorter;
    private importCreator: ImportCreator;

    public initialise() {
        this.walker = new AstWalker();
        this.sorter = new ImportSorter();
        this.importCreator = new ImportCreator();
        if (!this.statusBarItem) {
            //todo: consider using for stats
            this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }
    }

    public sortActiveDocumentImportsFromCommand(): Promise<boolean> {
        if (!this.isSortAllowed(false)) {
            return Promise.reject('Sort is not allowed');
        }
        return this.getSortActiveDocumentImports$();
    }

    public sortActiveDocumentImportsFromOnBeforeSaveCommand(): Promise<boolean> {
        const isSortOnBeforeSaveEnabled =
            workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<GeneralConfiguration>('generalConfiguration').sortOnBeforeSave;
        if (!isSortOnBeforeSaveEnabled) {
            return Promise.resolve(true);
        }
        if (!this.isSortAllowed(true)) {
            return Promise.resolve(true);
        }
        return this.getSortActiveDocumentImports$();
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    private getSortActiveDocumentImports$(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.walker) {
                console.error('ImportSorterExtension: has not been initialized');
                reject('ImportSorterExtension: has not been initialized');
            }
            try {
                const configuration = this.setConfig();
                const doc: TextDocument = window.activeTextEditor.document;
                const text = doc.getText();
                const imports = this.walker.parseImports(doc.uri.fsPath, text);
                const sortedImports = this.sorter.sortImportElements(imports);
                const importText = this.importCreator.createImportText(sortedImports.groups);

                const rangesToDelete = this.getRangesToDelete(chain(sortedImports.groups).flatMap(x => x.elements).value(), sortedImports.duplicates, doc);
                this.getConfiguration();
                window.activeTextEditor
                    .edit((editBuilder: TextEditorEdit) => {
                        const lastRange = rangesToDelete[rangesToDelete.length - 1];
                        if (!lastRange) {
                            return;
                        }
                        rangesToDelete.forEach(x => {
                            editBuilder.delete(x);
                        });
                        editBuilder.insert(new Position(0, 0), importText);
                    })
                    .then(x => {
                        if (!x) {
                            console.error('Sort Imports was unsuccessful', x);
                            return Promise.reject('Sort Imports was unsuccessful');

                        }
                        if (!rangesToDelete.length) {
                            Promise.resolve();
                        }

                        return window.activeTextEditor
                            .edit((editBuilder: TextEditorEdit) =>
                                this.addEmptyLinesAfterAllImports(editBuilder, importText, configuration.importStringConfiguration.numberOfEmptyLinesAfterAllImports, doc)
                            )
                            .then(y => {
                                if (!y) {
                                    console.error('Sort Imports was unsuccessful', x);
                                    return Promise.reject('Sort Imports was unsuccessful');
                                }
                                Promise.resolve();
                            });
                    })
                    .then(
                    _ => {
                        resolve();
                    },
                    err => {
                        reject(err);
                    });

            } catch (error) {
                window.showErrorMessage(error.message);
                reject(error.message);
            }
        });
    }

    private setConfig() {
        const configuration = this.getConfiguration();
        this.sorter.initialise(configuration.sortConfiguration);
        this.importCreator.initialise(configuration.importStringConfiguration);
        return configuration;
    }

    private addEmptyLinesAfterAllImports(textEditorEdit: TextEditorEdit, importText: string, numberOfEmptyLinesAfterAllImports: number, doc: TextDocument) {
        const numberOfImportTextLines = importText.split('\n').length;
        const firstLine = this.getNextNonEmptyLine(numberOfImportTextLines - 1, doc);
        const lineDifference = firstLine
            ? firstLine.lineNumber - numberOfImportTextLines
            : doc.lineCount - numberOfImportTextLines;
        const lineNumbersToAdd = numberOfEmptyLinesAfterAllImports - lineDifference;
        if (lineNumbersToAdd > 0) {
            const stringToInsert = '\n'.repeat(lineNumbersToAdd);
            textEditorEdit.insert(new Position(numberOfImportTextLines, 0), stringToInsert);
        }
        if (lineNumbersToAdd < 0) {
            const rangeToDelete = new Range(numberOfImportTextLines, 0, numberOfImportTextLines + Math.abs(lineNumbersToAdd), 0);
            textEditorEdit.delete(rangeToDelete);
        }
    }

    private getRangesToDelete(sortedImports: ImportElement[], duplicates: ImportElement[], doc: TextDocument) {
        const rangesToDelete: Range[] = [];
        chain(sortedImports)
            .concat(duplicates)
            .sortBy(x => x.startPosition.line)
            .forEach((x, ind, data) => {
                const previousRange = rangesToDelete[rangesToDelete.length - 1];
                let currentRange = data.length - 1 !== ind
                    ? new Range(x.startPosition.line, x.startPosition.character, x.endPosition.line + 1, 0)
                    : new Range(x.startPosition.line, x.startPosition.character, x.endPosition.line, x.endPosition.character);
                if (!previousRange) {
                    rangesToDelete.push(currentRange);
                    return;
                }
                const nextNonEmptyLine = data.length - 1 !== ind ? this.getNextNonEmptyLine(currentRange.end.line - 1, doc) : null;

                if (nextNonEmptyLine && nextNonEmptyLine.lineNumber !== currentRange.end.line) {
                    currentRange = new Range(currentRange.start.line, currentRange.start.character, nextNonEmptyLine.lineNumber, 0);
                }

                if (previousRange.intersection(currentRange)) {
                    rangesToDelete[rangesToDelete.length - 1] = previousRange.union(currentRange);
                    return;
                }
                rangesToDelete.push(currentRange);
            })
            .value();
        return rangesToDelete;
    }

    private getNextNonEmptyLine(startLineIndex: number, doc: TextDocument): TextLine {

        const nextLineIndex = startLineIndex + 1;
        if (doc.lineCount < 0 || nextLineIndex > doc.lineCount - 1) {
            return null;
        }
        const nextLine = doc.lineAt(nextLineIndex);
        if (!nextLine) {
            return null;
        } else if (!nextLine.isEmptyOrWhitespace) {
            return nextLine;
        } else {
            return this.getNextNonEmptyLine(nextLineIndex, doc);
        }
    }

    private getConfiguration(): ImportSorterConfiguration {
        const generalConfig = workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<GeneralConfiguration>('generalConfiguration');
        const configPath = `${workspace.rootPath}${sep}${generalConfig.configurationFilePath}`;
        const isConfigExist = fs.existsSync(configPath);

        if (!isConfigExist && generalConfig.configurationFilePath !== defaultGeneralConfiguration.configurationFilePath) {
            console.error('configurationFilePath is not found by the following path, import sorter will proceed with defaults from settings', configPath);
            window.showErrorMessage('configurationFilePath is not found by the following path, import sorter will proceed with defaults from settings', configPath);
        }

        const fileConfigurationString = isConfigExist ? fs.readFileSync(configPath, 'utf8') : '{}';
        const fileConfig = JSON.parse(fileConfigurationString);
        const sortConfig = workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<SortConfiguration>('sortConfiguration');
        const importStringConfig = workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<ImportStringConfiguration>('importStringConfiguration');
        const sortConfiguration = merge(sortConfig, fileConfig.sortConfiguration || {});
        const importStringConfiguration = merge(importStringConfig, fileConfig.importStringConfiguration || {});
        return {
            sortConfiguration,
            importStringConfiguration
        };
    }

    private isSortAllowed(isFileExtensionErrorIgnored: boolean): boolean {
        const editor = window.activeTextEditor;
        if (!editor) {
            return false;
        }

        if ((editor.document.languageId === 'typescript') || (editor.document.languageId === 'typescriptreact')) {
            return true;
        }

        if (isFileExtensionErrorIgnored) {
            return false;
        }

        window.showErrorMessage('Import Sorter currently only supports typescript (.ts) or typescriptreact (.tsx) language files');
        return false;
    }
}