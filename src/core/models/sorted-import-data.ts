import { LineRange } from './line-range';

export interface SortedImportData {
    isSortRequired: boolean;
    sortedImportsText: string;
    rangesToDelete: LineRange[];
    firstLineNumberToInsertText: number;
}