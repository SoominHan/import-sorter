//import { flatMap } from 'lodash';
//import { Range } from 'vscode';

import * as io from '../helpers/io';
import { IAstWalker } from './ast-walker';
import { IImportCreator } from './import-creator';
import { IImportSorter } from './import-sorter';
import { Observable, merge as mergeObservable, forkJoin as forkJoinObservable } from 'rxjs';
import { switchMap as switchMapObservable, map as mapObservable, mergeAll, filter as filterObservable } from 'rxjs/operators';

export class ImportSortExecuter {
    constructor(private walker: IAstWalker, private sorter: IImportSorter, private importCreator: IImportCreator) { }

    // public sortImport(filePath: string, _importText: string, _rangesToDelete: Range[]) {
    //     io.readFile(filePath).then(buffer => console.log(buffer));
    // }

    public sortImportsInDirectory(filePath: string): Promise<void> {
        const allUpdatedSourceFiles$ = this.allFilesUnderThePath$(filePath).pipe(mapObservable(data => {
            const sortedSourceFile = this.getSortedSource(data.filePath, data.file);
            return { filePath: data.filePath, sortedSourceFile: sortedSourceFile };
        }));
        const allWrites$ = allUpdatedSourceFiles$.pipe(
            filterObservable(data => data && data.sortedSourceFile !== null),
            switchMapObservable(data => io.writeFile$(data.filePath, data.sortedSourceFile))
        );
        const allFinishedWrites$ = forkJoinObservable(allWrites$).pipe(mapObservable(_ => { return; }));
        return allFinishedWrites$.toPromise();
    }

    private getSortedSource(filePath: string, fileSource: string): string {
        const imports = this.walker.parseImports(filePath, fileSource);
        if (!imports.length) {
            return null;
        }
        const sortedImports = this.sorter.sortImportElements(imports);
        const importText = this.importCreator.createImportText(sortedImports.groups);
        return importText;
    }

    private allFilesUnderThePath$(startingSourcePath: string): Observable<{ filePath: string, file: string }> {
        const allFilePaths$ = this.allFilePathsUnderThePath$(startingSourcePath);
        const fileData$ = allFilePaths$.pipe(
            switchMapObservable(filePaths => {
                const files$ = filePaths.map(path => io.readFile$(path).pipe(mapObservable(file => ({ filePath: path, file: file }))));
                return files$;
            }),
            mergeAll()
        );
        return fileData$;
    }

    private allFilePathsUnderThePath$(startingSourcePath: string): Observable<string[]> {
        if (!startingSourcePath) {
            throw new Error('No directory selected.');
        }

        const allFilesPatterns = ['**/*.ts', '**/*.tsx'];
        const ignore = [];
        const filesPaths$ = allFilesPatterns.map(pattern => io.filePaths$(startingSourcePath, pattern, ignore));
        return mergeObservable(...filesPaths$);
    }
}
