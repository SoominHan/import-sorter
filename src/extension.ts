import { commands, Disposable, ExtensionContext } from 'vscode';
import { ImportSorterExtension } from './import-sorter-extension';

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