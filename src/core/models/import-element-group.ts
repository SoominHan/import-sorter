import { CustomOrderRule } from './custom-order-rule';
import { ImportElement } from './import-element';

export interface ImportElementGroup {
    elements: ImportElement[];
    numberOfEmptyLinesAfterGroup: number;
    customOrderRule: CustomOrderRule;
}