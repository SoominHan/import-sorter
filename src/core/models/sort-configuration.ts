import { CustomOrderRule } from './custom-order-rule';

export type ImportSortOrder = 'caseInsensitive' | 'lowercaseFirst' | 'lowercaseLast' | 'unsorted';
export type ImportSortOrderDirection = 'asc' | 'desc';

export interface SortConfiguration {
    importMembers: {
        order: ImportSortOrder,
        direction: ImportSortOrderDirection;
    };
    importPaths: {
        order: ImportSortOrder,
        direction: ImportSortOrderDirection;
    };
    joinImportPaths?: boolean;
    removeUnusedImports?: boolean;
    customOrderingRules?: {
        defaultOrderLevel: number;
        disableDefaultOrderSort?: boolean;
        defaultNumberOfEmptyLinesAfterGroup?: number;
        rules: CustomOrderRule[]
    };
}

export const defaultSortConfiguration: SortConfiguration = {
    importMembers: {
        order: 'caseInsensitive',
        direction: 'asc'
    },
    importPaths: {
        order: 'caseInsensitive',
        direction: 'asc'
    },
    joinImportPaths: true,
    removeUnusedImports: false,
    customOrderingRules: {
        defaultOrderLevel: 20,
        defaultNumberOfEmptyLinesAfterGroup: 1,
        disableDefaultOrderSort: false,
        rules: [
            {
                type: 'importMember',
                regex: '^$',
                orderLevel: 5,
                disableSort: true
            },
            {
                regex: '^[^.@]',
                orderLevel: 10,
                disableSort: false
            },
            {
                regex: '^[@]',
                orderLevel: 15,
                disableSort: false
            },
            {
                regex: '^[.]',
                orderLevel: 30,
                disableSort: false
            }
        ]
    }
};