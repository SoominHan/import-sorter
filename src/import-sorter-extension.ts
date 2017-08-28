import { window, StatusBarAlignment, StatusBarItem, TextDocument, TextEditorEdit, Range, Position, workspace, TextLine } from 'vscode';
import {
    AstWalker, ImportCreator, ImportElement,
    ImportSorter, ImportStringConfiguration, SortConfiguration, ImportSorterConfiguration, GeneralConfiguration, defaultGeneralConfiguration
} from './core';
import { chain, range, merge } from 'lodash';
import * as fs from 'fs';
import { sep } from 'path';
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

    public sortActiveDocumentImports() {
        if (!this.walker) {
            console.error('ImportSorterExtension: has not been initialized');
        }
        if (!this.isSortAllowed()) {
            return;
        }
        try {
            const configuration = this.setConfig();
            const doc: TextDocument = window.activeTextEditor.document;
            const text = doc.getText();
            const imports = this.walker.parseImports(doc.uri.fsPath, text);
            const sortedImports = this.sorter.sortImportElements(imports);
            const importText = this.importCreator.createImportText(sortedImports.groups);

            const rangesToDelete = this.getRangesToDelete(chain(sortedImports.groups).flatMap(x => x.elements).value(), sortedImports.duplicates);
            this.getConfiguration();
            window.activeTextEditor
                .edit((editBuilder: TextEditorEdit) => {
                    rangesToDelete.forEach(x => {
                        editBuilder.delete(x);
                    });
                    editBuilder.insert(new Position(0, 0), importText + '\n');
                })
                .then(x => {
                    if (!x) {
                        console.error('Sort Imports was unsuccessful', x);
                        return;
                    }
                    window.activeTextEditor
                        .edit((editBuilder: TextEditorEdit) =>
                            this.addEmptyLinesAfterAllImports(editBuilder, importText, configuration.importStringConfiguration.numberOfEmptyLinesAfterAllImports)
                        )
                        .then(y => {
                            if (!y) {
                                console.error('Sort Imports was unsuccessful', x);
                            }
                        });
                });
        } catch (error) {
            window.showErrorMessage(error.message);
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    private setConfig() {
        const configuration = this.getConfiguration();
        this.sorter.initialise(configuration.sortConfiguration);
        this.importCreator.initialise(configuration.importStringConfiguration);
        return configuration;
    }

    private addEmptyLinesAfterAllImports(textEditorEdit: TextEditorEdit, importText: string, numberOfEmptyLinesAfterAllImports: number) {
        const numberOfImportTextLines = importText.split('\n').length;
        const firstLine = this.getFirstNonEmptyLineAfterImport(numberOfImportTextLines);
        const lineDifference = firstLine ? firstLine.lineNumber - numberOfImportTextLines : 0;
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

    private getFirstNonEmptyLineAfterImport(numberOfImportTextLines: number): TextLine {
        const doc: TextDocument = window.activeTextEditor.document;
        const firstNonEmptyLineAfterImports = range(numberOfImportTextLines, doc.lineCount).find(x => !doc.lineAt(x).isEmptyOrWhitespace);
        if (firstNonEmptyLineAfterImports) {
            return doc.lineAt(firstNonEmptyLineAfterImports);
        }
        return null;
    }

    private getRangesToDelete(sortedImports: ImportElement[], duplicates: ImportElement[]) {
        const rangesToDelete: Range[] = [];
        chain(sortedImports)
            .concat(duplicates)
            .sortBy(x => x.startPosition.line)
            .forEach(x => {
                const previousRange = rangesToDelete[rangesToDelete.length - 1];
                const currentRange = new Range(x.startPosition.line, x.startPosition.character, x.endPosition.line + 1, 0);
                if (!previousRange) {
                    rangesToDelete.push(currentRange);
                    return;
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

    private isSortAllowed(): boolean {
        const editor = window.activeTextEditor;
        if (!editor) {
            return false;
        }

        if ((editor.document.languageId === 'typescript') || (editor.document.languageId === 'typescriptreact')) {
            return true;
        }

        window.showErrorMessage('Import Sorter currently only supports typescript (.ts) or typescriptreact (.tsx) language files');
        return false;
    }
}