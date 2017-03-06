import { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from 'vscode';
import { AstWalker, ImportCreator, ImportSorter, defaultSortConfiguration, defaultImportStringConfiguration } from "./core";
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export const activate = (context: ExtensionContext) => {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable: Disposable = commands.registerCommand('extension.sortImports', () => {
        const importSorterExtension = new ImportSorterExtension();
        importSorterExtension.sortActiveDocumentImports();
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export const deactivate = () => {
}

class ImportSorterExtension {
    private statusBarItem: StatusBarItem;

    public sortActiveDocumentImports() {
        if (!this.isSortAllowed()) {
            return;
        }
        const doc: TextDocument = window.activeTextEditor.document;
        const text = doc.getText();
        const walker = new AstWalker();
        const imports = walker.parseImports(doc.uri.fsPath, text);
        const sorter = new ImportSorter(defaultSortConfiguration);
        const sortedImports = sorter.sortImportElements(imports);
        const importCreator = new ImportCreator(defaultImportStringConfiguration);
        const importStrings = importCreator.createImportStrings(sortedImports);
        console.log(JSON.stringify(importStrings, null, 2));
    }

    private isSortAllowed(): boolean {
        if (!this.statusBarItem) {
            //todo: consider using.
            this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }
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

    public dispose() {
        this.statusBarItem.dispose();
    }
}