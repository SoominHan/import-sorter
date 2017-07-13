import { ImportElement } from './import-element';

export interface ImportElementGroup {
    elements: ImportElement[];
    numberOfEmptyLinesAfterGroup: number;
}