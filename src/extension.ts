import { commands, Disposable, ExtensionContext, Uri, workspace } from 'vscode';

import { ImportSorterExtension } from './import-sorter-extension';

export const activate = (context: ExtensionContext) => {
    const importSorterExtension = new ImportSorterExtension();
    importSorterExtension.initialise();

    const sortImportsCommand: Disposable = commands.registerCommand('extension.sortImports', () => {
        importSorterExtension.sortActiveDocumentImportsFromCommand();
    });

    const sortImportsInDirectoryCommand: Disposable = commands.registerCommand('extension.sortImportsInDirectory', (uri: Uri) => {
        importSorterExtension.sortImportsInDirectories(uri);
    });

    workspace.onDidOpenTextDocument((e) => {
        if (['typescript', 'javascript'].indexOf(e.languageId) === -1) {
            return;
        }
        importSorterExtension.collapseImports();
    });

    const onWillSaveTextDocument = workspace.onWillSaveTextDocument(event => importSorterExtension.sortModifiedDocumentImportsFromOnBeforeSaveCommand(event));

    context.subscriptions.push(sortImportsCommand);
    context.subscriptions.push(sortImportsInDirectoryCommand);
    context.subscriptions.push(importSorterExtension);
    context.subscriptions.push(onWillSaveTextDocument);
};

// this method is called when your extension is deactivated
export const deactivate = () => {/* */ };