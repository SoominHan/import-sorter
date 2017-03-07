import { window, StatusBarAlignment, StatusBarItem, TextDocument, TextEditorEdit, Range, Position } from 'vscode';
import { AstWalker, ImportCreator, ImportSorter, defaultSortConfiguration, defaultImportStringConfiguration } from './core';
import { chain } from 'lodash';

export class ImportSorterExtension {
    private statusBarItem: StatusBarItem;
    private walker: AstWalker;
    private sorter: ImportSorter;
    private importCreator: ImportCreator;

    public initialise() {
        this.walker = new AstWalker();
        this.sorter = new ImportSorter(defaultSortConfiguration);
        this.importCreator = new ImportCreator(defaultImportStringConfiguration);
        if (!this.statusBarItem) {
            //todo: consider using for stats
            this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }
    }

    public sortActiveDocumentImports() {
        if (!this.walker) {
            console.error('ImportSorterExtension: has not been initialised');
        }
        if (!this.isSortAllowed()) {
            return;
        }
        const doc: TextDocument = window.activeTextEditor.document;
        const text = doc.getText();
        const imports = this.walker.parseImports(doc.uri.fsPath, text);
        const sortedImports = this.sorter.sortImportElements(imports);
        const importText = this.importCreator.createImportText(sortedImports.sorted);

        const rangesToDelete: Range[] = [];
        chain(sortedImports.sorted)
            .concat(sortedImports.duplicates)
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

        window.activeTextEditor
            .edit((editBuilder: TextEditorEdit) => {
                rangesToDelete.forEach(x => {
                    editBuilder.delete(x);
                });
                editBuilder.insert(new Position(0, 0), importText);
            })
            .then(x => {
                if (!x) {
                    console.error('Sort Imports was unsuccessful', x);
                }
            });
    }
    public dispose() {
        this.statusBarItem.dispose();
    }
    private isSortAllowed(): boolean {
        const editor = window.activeTextEditor;
        if (!editor) {
            return false;
        }

        if (editor.document.languageId !== 'typescript') {
            window.showErrorMessage('Import Sorter currently only supports typescript language files');
            return false;
        }

        return true;
    }
}