import { flatMap } from 'lodash';
import { Range } from 'vscode';

import * as io from '../helpers/io';
import { IAstWalker } from './ast-walker';
import { IImportCreator } from './import-creator';
import { IImportSorter } from './import-sorter';

export class ImportSortExecuter {
    constructor(private walker: IAstWalker, private sorter: IImportSorter, private importCreator: IImportCreator) { }

    // public sortImport(filePath: string, _importText: string, _rangesToDelete: Range[]) {
    //     io.readFile(filePath).then(buffer => console.log(buffer));
    // }

    public sortImportsInDirectory(filePath: string): Promise<void> {
        const allSourceFiles = this.getAllFilePathsUnderThePath(filePath).then(filePaths => {
            return Promise.all(filePaths.map(path => io.readFile(path).then(fileSource => ({ path, data: fileSource }))));
        });

        return allSourceFiles.then(fileSources => {
            const sortedSources = fileSources.map(source => this.getSortedSource(source.path, source.data));
            return Promise.all(sortedSources).then(_ => void 0);
        });
    }

    private getSortedSource(filePath: string, fileSource: string) {
        const imports = this.walker.parseImports(filePath, fileSource);
        if (!imports.length) {
            return;
        }
        const sortedImports = this.sorter.sortImportElements(imports);
        const importText = this.importCreator.createImportText(sortedImports.groups);
        const numberOfImportLines = importText.split('\n').length;

        return io.writeFile(filePath, importText);
    }

    private getAllFilePathsUnderThePath(srcPath: string): Promise<string[]> {
        if (!srcPath) {
            throw new Error('No directory selected.');
        }

        const allFilesPatterns = ['**/*.ts', '**/*.tsx'];
        const excludes = [];
        const filesAsync = allFilesPatterns.map(pattern => io.getFiles(srcPath, pattern, excludes));
        return Promise.all(filesAsync).then(files => flatMap(files));
    }
}
