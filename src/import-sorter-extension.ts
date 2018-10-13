import * as fs from 'fs';
import { chain, cloneDeep, flatMap, merge } from 'lodash';
import { sep } from 'path';
import {
    Position, Range, StatusBarAlignment, StatusBarItem, TextDocument, TextDocumentWillSaveEvent,
    TextEdit, TextEditorEdit, TextLine, Uri, window, workspace
} from 'vscode';

import {
    AstWalker, defaultGeneralConfiguration, GeneralConfiguration, ImportCreator, ImportElement,
    ImportSorter, ImportSorterConfiguration, ImportStringConfiguration, SortConfiguration
} from './core';
import * as io from './helpers/io';

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
        if (!window.activeTextEditor || !this.isSortAllowed(window.activeTextEditor.document, false)) {
            return;
        }
        return this.sortActiveDocumentImports();
    }

    public sortImportsInDirectories(uri: Uri): Promise<void[]> {
        const directories = this.getAllFilePathsUnderThePath(uri);
        return directories.then(filePaths => {
            const documentImportSorts = filePaths.map(path =>
                workspace.openTextDocument(path).then(document => this.sortActiveDocumentImports({ document: document } as any))
            );
            const results = Promise.all(documentImportSorts);
            return results;
        });
    }

    public sortModifiedDocumentImportsFromOnBeforeSaveCommand(event: TextDocumentWillSaveEvent): void {
        const configuration = this.getConfiguration();
        const isSortOnBeforeSaveEnabled = configuration.generalConfiguration.sortOnBeforeSave;
        if (!isSortOnBeforeSaveEnabled) {
            return;
        }
        if (!this.isSortAllowed(event.document, true)) {
            return;
        }
        return this.sortActiveDocumentImports(event);
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    private getAllFilePathsUnderThePath(uri: Uri): Promise<string[]> {
        const srcPath = uri.fsPath;
        if (!uri) {
            throw new Error('No directory selected in the sidebar explorer.');
        }

        const allFilesPatterns = ['**/*.ts', '**/*.tsx'];
        const excludes = [];
        const filesAsync = allFilesPatterns.map(pattern => io.getFiles(srcPath, pattern, excludes));
        return Promise.all(filesAsync).then(files => flatMap(files));
    }

    private sortActiveDocumentImports(event?: TextDocumentWillSaveEvent): void {
        if (!this.walker) {
            console.error('Typescript import sorter - ImportSorterExtension: has not been initialized');
            return;
        }
        try {
            const configuration = this.setConfig();
            const doc: TextDocument = event ? event.document : window.activeTextEditor.document;

            if (this.isFileExcludedFromSorting(configuration.generalConfiguration, doc)) {
                return;
            }

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

            if (event) {
                const insertEdit = TextEdit.insert(new Position(0, 0), importText + '\n');
                if (event.waitUntil) {
                    event.waitUntil(Promise.resolve([...deleteEdits, insertEdit]));
                } else {
                    window.showTextDocument(doc).then(editor => {
                        editor.edit((editBuilder: TextEditorEdit) => {
                            deleteEdits.forEach(x => {
                                editBuilder.delete(x.range);
                            });
                            editBuilder.insert(new Position(0, 0), importText + '\n');
                        });
                    });
                }
            } else {
                window.activeTextEditor
                    .edit((editBuilder: TextEditorEdit) => {
                        deleteEdits.forEach(x => {
                            editBuilder.delete(x.range);
                        });
                        editBuilder.insert(new Position(0, 0), importText + '\n');
                    });
            }
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
                const firstLeadingComment = x.importComment.leadingComments[0];
                const lastTrailingComment = x.importComment.trailingComments.reverse()[0];

                const startPosition = firstLeadingComment ? doc.positionAt(firstLeadingComment.range.pos) : x.startPosition;
                const endPosition = lastTrailingComment ? doc.positionAt(lastTrailingComment.range.end) : x.endPosition;

                let currentRange = new Range(startPosition.line, startPosition.character, endPosition.line + 1, 0);

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
        const generalConfigProxy: GeneralConfiguration | ProxyHandler<GeneralConfiguration> =
            workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<GeneralConfiguration>('generalConfiguration');
        const generalConfig = cloneDeep(generalConfigProxy);

        const configPath = `${workspace.rootPath}${sep}${generalConfig.configurationFilePath}`;
        const isConfigExist = fs.existsSync(configPath);

        if (!isConfigExist && generalConfig.configurationFilePath !== defaultGeneralConfiguration.configurationFilePath) {
            console.error('configurationFilePath is not found by the following path, import sorter will proceed with defaults from settings', configPath);
            window.showErrorMessage('configurationFilePath is not found by the following path, import sorter will proceed with defaults from settings', configPath);
        }

        const fileConfigurationString = isConfigExist ? fs.readFileSync(configPath, 'utf8') : '{}';
        const fileConfig = JSON.parse(fileConfigurationString) as ImportSorterConfiguration;

        const sortConfigProxy: SortConfiguration | ProxyHandler<SortConfiguration>
            = workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<SortConfiguration>('sortConfiguration');
        const sortConfig = cloneDeep(sortConfigProxy);

        const importStringConfigProxy: ImportStringConfiguration | ProxyHandler<ImportStringConfiguration>
            = workspace.getConfiguration(EXTENSION_CONFIGURATION_NAME).get<ImportStringConfiguration>('importStringConfiguration');
        const importStringConfig = cloneDeep(importStringConfigProxy);

        const sortConfiguration = merge(sortConfig, fileConfig.sortConfiguration || {});
        const importStringConfiguration = merge(importStringConfig, fileConfig.importStringConfiguration || {});
        const generalConfiguration = merge(generalConfig, fileConfig.generalConfiguration || {});
        return {
            sortConfiguration,
            importStringConfiguration,
            generalConfiguration
        };
    }

    private isSortAllowed(document: TextDocument, isFileExtensionErrorIgnored: boolean): boolean {
        if (!document) {
            return false;
        }

        if ((document.languageId === 'typescript') || (document.languageId === 'typescriptreact')) {
            return true;
        }

        if (isFileExtensionErrorIgnored) {
            return false;
        }

        window.showErrorMessage('Import Sorter currently only supports typescript (.ts) or typescriptreact (.tsx) language files');
        return false;
    }

    private isFileExcludedFromSorting(generalConfiguration: GeneralConfiguration, doc: TextDocument) {
        const excludedFiles = generalConfiguration.exclude || [];
        if (!excludedFiles.length) {
            return false;
        }
        const filePath = doc.uri.fsPath.replace(new RegExp('\\' + sep, 'g'), '/');
        const isExcluded = excludedFiles.some(fileToExclude => filePath.match(fileToExclude) !== null);
        return isExcluded;
    }
}
