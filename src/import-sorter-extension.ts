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
    workspace,
    TextEdit,
    TextDocumentWillSaveEvent
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

    public sortActiveDocumentImportsFromCommand(): void {
        if (!this.isSortAllowed(false)) {
            return;
        }
        return this.sortActiveDocumentImports();
    }

    public sortActiveDocumentImportsFromOnBeforeSaveCommand(event: TextDocumentWillSaveEvent): void {
        const isSortOnBeforeSaveEnabled =
            workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<GeneralConfiguration>('generalConfiguration').sortOnBeforeSave;
        if (!isSortOnBeforeSaveEnabled) {
            return;
        }
        if (!this.isSortAllowed(true)) {
            return;
        }
        return this.sortActiveDocumentImports(event);
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    private sortActiveDocumentImports(event?: TextDocumentWillSaveEvent): void {
        if (!this.walker) {
            console.error('Typescript import sorter - ImportSorterExtension: has not been initialized');
            return;
        }
        try {
            this.setConfig();

            const doc: TextDocument = window.activeTextEditor.document;
            const text = doc.getText();
            const imports = this.walker.parseImports(doc.uri.fsPath, text);
            if (!imports.length) {
                return;
            }
            const sortedImports = this.sorter.sortImportElements(imports);
            const importText = this.importCreator.createImportText(sortedImports.groups);
            const numberOfImportLines = importText.split('\n').length;

            if (doc.lineCount >= numberOfImportLines &&
                doc.lineAt(numberOfImportLines - 1).isEmptyOrWhitespace &&
                (
                    (doc.lineCount > numberOfImportLines && !doc.lineAt(numberOfImportLines).isEmptyOrWhitespace) ||
                    (doc.lineCount === numberOfImportLines + 1 && doc.lineAt(numberOfImportLines).isEmptyOrWhitespace) ||
                    doc.lineCount === numberOfImportLines
                ) &&
                text.replace(/\r/g, '').startsWith(importText)) {
                return;
            }

            const rangesToDelete = this.getRangesToDelete(chain(sortedImports.groups).flatMap(x => x.elements).value(), sortedImports.duplicates, doc);

            const lastRange = rangesToDelete[rangesToDelete.length - 1];
            if (!lastRange) {
                return;
            }
            const deleteEdits = rangesToDelete.map(x => TextEdit.delete(x));
            const insertEdit = TextEdit.insert(new Position(0, 0), importText + '\n');

            event.waitUntil(Promise.resolve([...deleteEdits, insertEdit]));
        } catch (error) {
            window.showErrorMessage(`Typescript import sorter failed with - ${error.message}. Please log a bug.`);
        }
    }

    private setConfig() {
        const configuration = this.getConfiguration();
        this.sorter.initialise(configuration.sortConfiguration);
        this.importCreator.initialise(configuration.importStringConfiguration);
        return configuration;
    }

    private getRangesToDelete(sortedImports: ImportElement[], duplicates: ImportElement[], doc: TextDocument) {
        const rangesToDelete: Range[] = [];
        chain(sortedImports)
            .concat(duplicates)
            .sortBy(x => x.startPosition.line)
            .forEach(x => {
                const previousRange = rangesToDelete[rangesToDelete.length - 1];
                let currentRange = new Range(x.startPosition.line, x.startPosition.character, x.endPosition.line + 1, 0);
                const nextNonEmptyLine = this.getNextNonEmptyLine(currentRange.end.line - 1, doc);

                if (nextNonEmptyLine && !nextNonEmptyLine.isLast && nextNonEmptyLine.line.lineNumber !== currentRange.end.line) {
                    currentRange = new Range(currentRange.start.line, currentRange.start.character, nextNonEmptyLine.line.lineNumber, 0);
                }

                if (nextNonEmptyLine && nextNonEmptyLine.isLast) {
                    const lastLine = doc.lineAt(doc.lineCount - 1);
                    currentRange = new Range(currentRange.start.line, currentRange.start.character, lastLine.lineNumber, lastLine.range.end.character);
                }

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

    private getNextNonEmptyLine(startLineIndex: number, doc: TextDocument): { line: TextLine, isLast: boolean } {

        const nextLineIndex = startLineIndex + 1;
        if (doc.lineCount < 0) {
            return null;
        }
        if (nextLineIndex > doc.lineCount - 1) {
            return { line: null, isLast: true };
        }
        const nextLine = doc.lineAt(nextLineIndex);
        if (!nextLine) {
            return null;
        } else if (!nextLine.isEmptyOrWhitespace) {
            return { line: nextLine, isLast: false };
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
