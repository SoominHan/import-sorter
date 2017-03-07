import { ImportElement } from './import-element';

export interface ImportElementSortResult {
    sorted: ImportElement[];
    duplicates: ImportElement[];
}