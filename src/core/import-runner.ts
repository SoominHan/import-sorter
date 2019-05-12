import { chain, range as rangeLodash, cloneDeep } from 'lodash';
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
    ImportElement, ImportSorterConfiguration, LineRange, SortedImportData, ImportElementGroup
} from './models/models-public';

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
        const isFileExcluded = this.isFileExcludedFromSorting(filePath);
        if (isFileExcluded) {
            return {
                isSortRequired: false,
                sortedImportsText: null,
                rangesToDelete: null
            };
        }
        const imports = this.parser.parseImports(filePath, fileSource);
        if (!imports.importElements.length) {
            return {
                isSortRequired: false,
                sortedImportsText: null,
                rangesToDelete: null
            };
        }
        const sortedImports = this.sorter.sortImportElements(imports.importElements);
        const sortedImportsWithExcludedImports = this.getExcludeUnusedImports(sortedImports, imports.usedTypeReferences);
        const sortedImportsText = this.importCreator.createImportText(sortedImportsWithExcludedImports.groups);
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

        const rangesToDelete = this.getRangesToDelete(sortedImportsWithExcludedImports, fileSourceArray, fileSource);

        return {
            isSortRequired: true,
            sortedImportsText,
            rangesToDelete
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
        const sortResultClonned = cloneDeep(sortResult);
        if (!usedTypeReferences || !usedTypeReferences.length) {
            const importElementsToSearch = chain(sortResultClonned.groups).flatMap(gr => gr.elements.map(el => el)).value();
            return {
                groups: [],
                toRemove: [...importElementsToSearch, ...sortResultClonned.duplicates]
            };
        }

        const unusedImportElements: ImportElement[] = [];
        sortResultClonned.groups.forEach(gr => {
            gr.elements = gr.elements.filter(el => {
                el.namedBindings = el.namedBindings.filter(nameBinding => {
                    const isUnusedNameBinding = nameBinding.name !== '*' && !usedTypeReferences.some(reference => reference === (nameBinding.aliasName || nameBinding.name));
                    return !isUnusedNameBinding;
                });
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
            fileSourceArray.splice(linesToDelete[i], 1);
        }
        const textWithoutRanges = fileSourceArray.join('\n');
        const sortedText = `${sortedData.sortedImportsText}\n${textWithoutRanges}`;
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

    private isFileExcludedFromSorting(selectedPath: string) {
        const excludedFiles = this.configurationProvider.getConfiguration().generalConfiguration.exclude || [];
        if (!excludedFiles.length) {
            return false;
        }
        const filePath = selectedPath.replace(new RegExp('\\' + sep, 'g'), '/');
        const isExcluded = excludedFiles.some(fileToExclude => filePath.match(fileToExclude) !== null);
        return isExcluded;
    }
}
