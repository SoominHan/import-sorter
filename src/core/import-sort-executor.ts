//import { flatMap } from 'lodash';
//import { Range } from 'vscode';

import * as io from '../helpers/io';
import { IAstWalker } from './ast-walker';
import { IImportCreator } from './import-creator';
import { IImportSorter } from './import-sorter';
import { Observable, merge as mergeObservable, forkJoin as forkJoinObservable, empty as emptyObservable } from 'rxjs';
import { switchMap as switchMapObservable, flatMap as flatMapObservable, map as mapObservable, mergeAll, filter as filterObservable, delay } from 'rxjs/operators';

export class ImportSortExecuter {
    constructor(private walker: IAstWalker, private sorter: IImportSorter, private importCreator: IImportCreator) { }

    // public sortImport(filePath: string, _importText: string, _rangesToDelete: Range[]) {
    //     io.readFile(filePath).then(buffer => console.log(buffer));
    // }

    public sortImportsInDirectory(filePath: string): Promise<void> {
        const sortAllImports$ = forkJoinObservable(this.sortAllImports$(filePath)).pipe(mapObservable(_ => void 0));
        return sortAllImports$.toPromise();
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

    private sortAllImports$(startingSourcePath: string) {
        const allFilePaths$ = this.allFilePathsUnderThePath$(startingSourcePath);
        const test = allFilePaths$.pipe(
            mergeAll(),
            flatMapObservable(path => this.sortFileImports$(path))
        );
        return test;
    }

    private sortFileImports$(fullFilePath: string): Observable<void> {
        return io.readFile$(fullFilePath).pipe(
            //delay(Math.random() * 1000),
            mapObservable(file => this.getSortedSource(fullFilePath, file)),
            switchMapObservable(sortedSourceFile => {
                if (sortedSourceFile) {
                    return io.writeFile$(fullFilePath, sortedSourceFile);
                } else {
                    return emptyObservable();
                }
            })
        );
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
