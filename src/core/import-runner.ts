import { chain } from 'lodash';
import {
    empty as emptyObservable, forkJoin as forkJoinObservable, merge as mergeObservable, Observable
} from 'rxjs';
import {
    flatMap as flatMapObservable, map as mapObservable, mergeAll, switchMap as switchMapObservable
} from 'rxjs/operators';

import * as io from '../helpers/io';
import { AstParser } from './ast-parser';
import { ImportCreator } from './import-creator';
import { ImportSorter } from './import-sorter';
import { ImportSorterConfiguration, LineRange, SortedImportData } from './models';
import { ImportElementSortResult } from './models/import-element-sort-result';

export interface ConfigurationProvider {
    getConfiguration(): ImportSorterConfiguration;
}

export interface ImportRunner {
    sortImportsInDirectory(directoryPath: string): Observable<void>;
    getSortImportData(filePath: string, fileSource: string): SortedImportData;
}

export class SimpleImportRunner implements ImportRunner {
    constructor(
        private parser: AstParser,
        private sorter: ImportSorter,
        private importCreator: ImportCreator,
        private configurationProvider: ConfigurationProvider
    ) { }

    public getSortImportData(filePath: string, fileSource: string): SortedImportData {
        this.resetConfiguration();
        return this.getSortedData(filePath, fileSource);
    }

    public sortImportsInDirectory(directoryPath: string): Observable<void> {
        this.resetConfiguration();
        const sortAllImports$ = forkJoinObservable(this.sortAllImports$(directoryPath)).pipe(mapObservable(_ => void 0));
        return sortAllImports$;
    }

    private resetConfiguration(): void {
        const configuration = this.configurationProvider.getConfiguration();
        this.sorter.initialise(configuration.sortConfiguration);
        this.importCreator.initialise(configuration.importStringConfiguration);
    }

    private getSortedData(filePath: string, fileSource: string): SortedImportData {
        const imports = this.parser.parseImports(filePath, fileSource);
        if (!imports.length) {
            return {
                isSortRequired: false,
                sortedImportsText: null,
                rangesToDelete: null
            };
        }
        const sortedImports = this.sorter.sortImportElements(imports);
        const sortedImportsText = this.importCreator.createImportText(sortedImports.groups);
        const fileSourceArray = fileSource.split('\n');
        const importTextArray = sortedImportsText.split('\n');
        const isSorted = this.isSourceAlreadySorted(
            { data: importTextArray, text: sortedImportsText },
            { data: fileSourceArray, text: fileSource }
        );
        if (isSorted) {
            return {
                isSortRequired: false,
                sortedImportsText,
                rangesToDelete: null
            };
        }

        const rangesToDelete = this.getRangesToDelete(sortedImports, fileSourceArray, fileSource);

        return {
            isSortRequired: true,
            sortedImportsText,
            rangesToDelete
        };
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
            mapObservable(file => this.getSortedData(fullFilePath, file)),
            switchMapObservable(sortedData => {
                if (sortedData.isSortRequired) {
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
                if (!nextNonEmptyLine) {
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
