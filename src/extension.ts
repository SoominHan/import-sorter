import { commands, Disposable, ExtensionContext, workspace } from 'vscode';
import { ImportSorterExtension } from './import-sorter-extension';

export const activate = (context: ExtensionContext) => {
    const importSorterExtension = new ImportSorterExtension();
    importSorterExtension.initialise();

    const sortImportsCommand: Disposable = commands.registerCommand('extension.sortImports', () => {
        importSorterExtension.sortActiveDocumentImportsFromCommand();
    });

    const onWillSaveTextDocument = workspace.onWillSaveTextDocument(event =>
        event.waitUntil(Promise.resolve(importSorterExtension.sortActiveDocumentImportsFromOnBeforeSaveCommand()))
    );

    context.subscriptions.push(sortImportsCommand);
    context.subscriptions.push(importSorterExtension);
    context.subscriptions.push(onWillSaveTextDocument);
};

// this method is called when your extension is deactivated
export const deactivate = () => {/* */ };