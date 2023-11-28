import { chain, cloneDeep, range as rangeLodash } from 'lodash';
import { sep } from 'path';
import { empty as emptyObservable, merge as mergeObservable, Observable } from 'rxjs';
import {
    flatMap as flatMapObservable, mergeAll, switchMap as switchMapObservable
} from 'rxjs/operators';

import { AstParser } from './ast-parser';
import { io } from './helpers/helpers-public';
import { ImportCreator } from './import-creator';
import { ImportSorter } from './import-sorter';
import { ImportElementSortResult } from './models/import-element-sort-result';
import {
    ImportElement, ImportElementGroup, ImportSorterConfiguration, LineRange, SortedImportData
} from './models/models-public';
import { textProcessing } from './helpers/helpers-public';

export interface ConfigurationProvider {
    getConfiguration(): ImportSorterConfiguration;
}

export interface ImportRunner {
    sortImportsInDirectory(directoryPath: string): Observable<void>;
    getSortImportData(filePath: string, fileSource: string): SortedImportData;
}

export interface ImportElementExcludeUnusedResult {
    groups: ImportElementGroup[];
    toRemove: ImportElement[];
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
        return this.sortAllImports$(directoryPath);
    }

    private resetConfiguration(): void {
        const configuration = this.configurationProvider.getConfiguration();
        this.sorter.initialise(configuration.sortConfiguration);
        this.importCreator.initialise(configuration.importStringConfiguration);
    }

    private getSortedData(filePath: string, fileSource: string): SortedImportData {
        const isFileExcluded = this.isFileExcludedFromSorting(filePath, fileSource);
        if (isFileExcluded) {
            return {
                isSortRequired: false,
                sortedImportsText: null,
                rangesToDelete: null,
                firstLineNumberToInsertText: null
            };
        }
        const imports = this.parser.parseImports(filePath, fileSource);
        if (!imports.importElements.length) {
            return {
                isSortRequired: false,
                sortedImportsText: null,
                rangesToDelete: null,
                firstLineNumberToInsertText: null
            };
        }
        const sortedImports = this.sorter.sortImportElements(imports.importElements);
        const sortedImportsWithExcludedImports = this.getExcludeUnusedImports(sortedImports, imports.usedTypeReferences);
        const sortedImportsText = this.importCreator.createImportText(sortedImportsWithExcludedImports.groups);

        //normalize imports by skipping lines which should not be touched
        const fileSourceWithSkippedLineShiftArray = fileSource.split('\n').slice(imports.firstImportLineNumber);
        const fileSourceWithSkippedLineShift = fileSourceWithSkippedLineShiftArray.join('\n');
        const fileSourceArray = fileSource.split('\n');
        const importTextArray = sortedImportsText.split('\n');
        const isSorted = this.isSourceAlreadySorted(
            { data: importTextArray, text: sortedImportsText },
            { data: fileSourceWithSkippedLineShiftArray, text: fileSourceWithSkippedLineShift }
        );
        if (isSorted) {
            return {
                isSortRequired: false,
                sortedImportsText,
                rangesToDelete: null,
                firstLineNumberToInsertText: imports.firstImportLineNumber
            };
        }

        const rangesToDelete = this.getRangesToDelete(sortedImportsWithExcludedImports, fileSourceArray, fileSource);

        return {
            isSortRequired: true,
            sortedImportsText,
            rangesToDelete,
            firstLineNumberToInsertText: imports.firstImportLineNumber
        };
    }

    private getExcludeUnusedImports(sortResult: ImportElementSortResult, usedTypeReferences: string[]): ImportElementExcludeUnusedResult {
        const isRemoveUnusedImports = this.configurationProvider.getConfiguration().sortConfiguration.removeUnusedImports;
        if (!isRemoveUnusedImports) {
            return {
                groups: sortResult.groups,
                toRemove: sortResult.duplicates
            };
        }
        const isRemoveUnusedDefaultImports = this.configurationProvider.getConfiguration().sortConfiguration.removeUnusedDefaultImports;
        const sortResultClonned = cloneDeep(sortResult);
        const unusedImportElements: ImportElement[] = [];
        sortResultClonned.groups.forEach(gr => {
            gr.elements = gr.elements.filter(el => {
                //side effect import
                if (!el.hasFromKeyWord) {
                    return true;
                }
                //filtering name bindings
                el.namedBindings = el.namedBindings.filter(nameBinding => {
                    const isUnusedNameBinding = !usedTypeReferences.some(reference => reference === (nameBinding.aliasName || nameBinding.name));
                    return !isUnusedNameBinding;
                });

                if (!isRemoveUnusedDefaultImports && el.defaultImportName) {
                    return true;
                }

                if (isRemoveUnusedDefaultImports && usedTypeReferences.some(reference => reference === el.defaultImportName)) {
                    return true;
                }
                //if not default import and not side effect, then check name bindings
                if (!el.namedBindings.length) {
                    unusedImportElements.push(el);
                    return false;
                }
                return true;
            });
            return !gr.elements.length;
        });
        return {
            groups: sortResultClonned.groups,
            toRemove: [...unusedImportElements, ...sortResultClonned.duplicates]
        };
    }

    private sortAllImports$(startingSourcePath: string): Observable<void> {
        const allFilePaths$ = this.allFilePathsUnderThePath$(startingSourcePath);
        return allFilePaths$.pipe(
            mergeAll(),
            flatMapObservable(path => this.sortFileImports$(path), 3)
        );
    }

    private sortFileImports$(fullFilePath: string): Observable<void> {
        return io.readFile$(fullFilePath).pipe(
            switchMapObservable(file => {
                const sortedData = this.getSortedData(fullFilePath, file);
                if (sortedData.isSortRequired) {
                    const sortedFullFileSource = this.getFullSortedSourceFile(file, sortedData);
                    return io.writeFile$(fullFilePath, sortedFullFileSource);
                } else {
                    return emptyObservable();
                }
            })
        );
    }

    private getFullSortedSourceFile(sourceText: string, sortedData: SortedImportData): string {
        let fileSourceArray = sourceText.split('\n');
        const linesToDelete = chain(sortedData.rangesToDelete.map(range => rangeLodash(range.startLine, range.endLine)))
            .flatMap(ranges => ranges)
            .value();

        for (let i = linesToDelete.length - 1; i >= 0; i--) {
            if (i === 0) {
                fileSourceArray.splice(linesToDelete[i], 1, sortedData.sortedImportsText);
            } else {
                fileSourceArray.splice(linesToDelete[i], 1);
            }
        }
        const sortedText = fileSourceArray.join('\n');
        return sortedText;
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

    private getNextNonEmptyLine(startLineIndex: number, fileSourceArray: string[]): { lineNumber: number, isLast: boolean } {

        const nextLineIndex = startLineIndex + 1;
        if (fileSourceArray.length < 0) {
            return null;
        }
        if (nextLineIndex > fileSourceArray.length - 1) {
            return { lineNumber: nextLineIndex - 1, isLast: true };
        }
        const nextLine = fileSourceArray[nextLineIndex];
        if (nextLine === undefined) {
            return null;
        } else if (!this.isLineEmptyOrWhiteSpace(nextLine)) {
            return { lineNumber: nextLineIndex, isLast: false };
        } else {
            return this.getNextNonEmptyLine(nextLineIndex, fileSourceArray);
        }
    }

    private getRangesToDelete(sortedImportsResult: ImportElementExcludeUnusedResult, fileSourceArray: string[], fileSourceText: string): LineRange[] {
        const sortedImports = chain(sortedImportsResult.groups).flatMap(x => x.elements).value();

        const rangesToDelete: LineRange[] = [];

        chain(sortedImports)
            .concat(sortedImportsResult.toRemove)
            .sortBy(x => x.startPosition.line)
            .forEach(x => {
                const previousRange = rangesToDelete[rangesToDelete.length - 1];
                const firstLeadingComment = x.importComment.leadingComments[0];
                const lastTrailingComment = x.importComment.trailingComments.reverse()[0];

                const startPosition = firstLeadingComment ? textProcessing.getPositionByOffset(firstLeadingComment.range.pos, fileSourceText) : x.startPosition;
                const endPosition = lastTrailingComment ? textProcessing.getPositionByOffset(lastTrailingComment.range.end, fileSourceText) : x.endPosition;

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

                if (!nextNonEmptyLine || (nextNonEmptyLine && nextNonEmptyLine.isLast)) {
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

    private isFileExcludedFromSorting(selectedPath: string, selectedSource: string) {
        return this.isFileExcludedByPath(selectedPath) || this.isFileExcludedByMarker(selectedSource);
    }

    private isFileExcludedByPath(selectedPath: string) {
        const excludedFiles = this.configurationProvider.getConfiguration().generalConfiguration.exclude || [];
        if (!excludedFiles.length) {
            return false;
        }
        const filePath = selectedPath.replace(new RegExp('\\' + sep, 'g'), '/');
        const isExcluded = excludedFiles.some(fileToExclude => filePath.match(fileToExclude) !== null);
        return isExcluded;
    }

    private isFileExcludedByMarker(selectedSource: string) {
        const excludedMarker = this.configurationProvider.getConfiguration().generalConfiguration.excludeMarker;
        if (excludedMarker == null || excludedMarker.trim() === '') { return false; }

        const regexp = new RegExp(excludedMarker, 'g');
        return regexp.test(selectedSource);
    }
}
