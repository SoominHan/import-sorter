import { ImportElementSortResult } from './models/import-element-sort-result';
//import { flatMap } from 'lodash';
//import { Range } from 'vscode';

import * as io from '../helpers/io';
import { IAstWalker } from './ast-walker';
import { IImportCreator } from './import-creator';
import { IImportSorter } from './import-sorter';
import { Observable, merge as mergeObservable, forkJoin as forkJoinObservable, empty as emptyObservable } from 'rxjs';
import { switchMap as switchMapObservable, flatMap as flatMapObservable, map as mapObservable, mergeAll } from 'rxjs/operators';
import { chain } from 'lodash';

class LineRange {
    public startLine: number;
    public startCharacter: number;
    public endLine: number;
    public endCharacter: number;
    public isLineIntersecting(range: LineRange): boolean {
        //line comparison
        const min = this.startLine < range.startLine ? this : range;
        const max = min === this ? range : this;
        //lines do not intersect
        if (min.endLine < max.startLine) {
            return false;
        }
        return true;
    }
    public union(range: LineRange): LineRange {
        const min = this.startLine < range.startLine ? this : range;
        const max = min === this ? range : this;

        return new LineRange({
            startLine: min.startLine,
            startCharacter: min.startCharacter,
            endLine: max.endLine,
            endCharacter: max.endCharacter
        });
    }
    constructor(json: Pick<LineRange, 'startLine' | 'startCharacter' | 'endLine' | 'endCharacter'>) {
        Object.assign(this, json);
    }
}

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
        const fileSourceArray = fileSource.split('\n');
        const importTextArray = importText.split('\n');
        const isSorted = this.isSourceAlreadySorted({ data: importTextArray, text: importText }, { data: fileSourceArray, text: fileSource });
        if (isSorted) {
            return null;
        }

        const rangesToDelete = this.getRangesToDelete(sortedImports, fileSourceArray, fileSource);
        console.log(rangesToDelete);

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
            mapObservable(file => this.getSortedSource(fullFilePath, file)),
            switchMapObservable(sortedSourceFile => {
                if (sortedSourceFile) {
                    emptyObservable();
                    //return io.writeFile$(fullFilePath, sortedSourceFile);
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

    private isLineEmptyOrWhiteSpace(line: string): boolean {
        if (!line) {
            return true;
        }
        const trimmedLine = line.trim();

        return trimmedLine === '';
    }

    private isSourceAlreadySorted(sortedImport: { data: string[], text: string }, source: { data: string[], text: string }): boolean {
        if (source.data.length >= sortedImport.data.length &&
            this.isLineEmptyOrWhiteSpace(source.data[sortedImport.data.length - 1]) &&
            (
                (source.data.length > sortedImport.data.length && !this.isLineEmptyOrWhiteSpace(source.data[sortedImport.data.length])) ||
                (source.data.length === sortedImport.data.length + 1 && this.isLineEmptyOrWhiteSpace(source.data[sortedImport.data.length])) ||
                source.data.length === sortedImport.data.length
            ) &&
            source.text.replace(/\r/g, '').startsWith(sortedImport.text)) {
            return true;
        }
        return false;
    }

    private getPositionByOffset(offset: number, text: string) {
        const before = text.slice(0, offset);
        const newLines = before.match(/\n/g);
        const line = newLines ? newLines.length : 0;
        const preCharacters = before.match(/(\n|^).*$/g);
        let character: number = 0;
        if (line !== 0) {
            character = preCharacters && preCharacters[0].length ? preCharacters[0].length - 1 : 0;
        } else {
            character = preCharacters ? preCharacters[0].length : 0;
        }
        return {
            line,
            character
        };
    }

    private getNextNonEmptyLine(startLineIndex: number, fileSourceArray: string[]): { lineNumber: number, isLast: boolean } {

        const nextLineIndex = startLineIndex + 1;
        if (fileSourceArray.length < 0) {
            return null;
        }
        if (nextLineIndex > fileSourceArray.length - 1) {
            return { lineNumber: nextLineIndex - 1, isLast: true };
        }
        const nextLine = fileSourceArray[nextLineIndex];
        if (!nextLine) {
            return null;
        } else if (!this.isLineEmptyOrWhiteSpace(nextLine)) {
            return { lineNumber: nextLineIndex, isLast: false };
        } else {
            return this.getNextNonEmptyLine(nextLineIndex, fileSourceArray);
        }
    }

    private getRangesToDelete(sortedImportsResult: ImportElementSortResult, fileSourceArray: string[], fileSourceText: string): LineRange[] {
        const sortedImports = chain(sortedImportsResult.groups).flatMap(x => x.elements).value();

        const rangesToDelete: LineRange[] = [];

        chain(sortedImports)
            .concat(sortedImportsResult.duplicates)
            .sortBy(x => x.startPosition.line)
            .forEach(x => {
                const previousRange = rangesToDelete[rangesToDelete.length - 1];
                const firstLeadingComment = x.importComment.leadingComments[0];
                const lastTrailingComment = x.importComment.trailingComments.reverse()[0];

                const startPosition = firstLeadingComment ? this.getPositionByOffset(firstLeadingComment.range.pos, fileSourceText) : x.startPosition;
                const endPosition = lastTrailingComment ? this.getPositionByOffset(lastTrailingComment.range.end, fileSourceText) : x.endPosition;

                let currentRange = new LineRange({
                    startLine: startPosition.line,
                    startCharacter: startPosition.character,
                    endLine: endPosition.line + 1,
                    endCharacter: 0
                });

                const nextNonEmptyLine = this.getNextNonEmptyLine(currentRange.endLine - 1, fileSourceArray);

                if (nextNonEmptyLine && !nextNonEmptyLine.isLast && nextNonEmptyLine.lineNumber !== currentRange.endLine) {
                    currentRange = new LineRange({
                        startLine: currentRange.startLine,
                        startCharacter: currentRange.startCharacter,
                        endLine: nextNonEmptyLine.lineNumber,
                        endCharacter: 0
                    });
                }

                if (nextNonEmptyLine && nextNonEmptyLine.isLast) {
                    const lastLine = fileSourceArray[fileSourceArray.length - 1];
                    currentRange = new LineRange({
                        startLine: currentRange.startLine,
                        startCharacter: currentRange.startCharacter,
                        endLine: fileSourceArray.length - 1,
                        endCharacter: lastLine.length
                    });
                }

                if (!previousRange) {
                    rangesToDelete.push(currentRange);
                    return;
                }

                if (previousRange.isLineIntersecting(currentRange)) {
                    rangesToDelete[rangesToDelete.length - 1] = previousRange.union(currentRange);
                    return;
                }

                rangesToDelete.push(currentRange);
            })
            .value();
        return rangesToDelete;
    }
}
