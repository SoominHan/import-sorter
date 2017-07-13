import { ImportElement } from './import-element';
import { ImportElementGroup } from './import-element-group';

export interface ImportElementSortResult {
    groups: ImportElementGroup[];
    duplicates: ImportElement[];
}