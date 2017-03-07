import { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditorEdit, Range, Position } from 'vscode';
import { AstWalker, ImportCreator, ImportSorter, defaultSortConfiguration, defaultImportStringConfiguration } from './core';

export const activate = (context: ExtensionContext) => {
    const importSorterExtension = new ImportSorterExtension();
    importSorterExtension.initialise();
    const sortImportsCommand: Disposable = commands.registerCommand('extension.sortImports', () => {
        importSorterExtension.sortActiveDocumentImports();
    });
    context.subscriptions.push(sortImportsCommand);
    context.subscriptions.push(importSorterExtension);
};

// this method is called when your extension is deactivated
export const deactivate = () => {/* */ };

class ImportSorterExtension {
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

        const rangesToDelete =
            [...sortedImports.sorted, ...sortedImports.duplicates]
                .map(x => {
                    const lastTextLine = window.activeTextEditor.document.lineAt(x.endPosition.line);
                    const endRange = lastTextLine.rangeIncludingLineBreak;
                    return new Range(x.startPosition.line, x.startPosition.character, endRange.end.line, endRange.end.character);
                });

        window.activeTextEditor.edit((editBuilder: TextEditorEdit) => {
            rangesToDelete.forEach(x => {
                editBuilder.delete(x);
            });
            editBuilder.insert(new Position(0, 0), importText);
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