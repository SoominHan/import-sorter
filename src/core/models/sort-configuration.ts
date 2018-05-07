export type ImportSortOrder = 'caseInsensitive' | 'lowercaseFirst' | 'lowercaseLast' | 'unsorted';
export type ImportSortOrderDirection = 'asc' | 'desc';
export type CustomOrderRuleType = 'path' | 'importMember';
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
    customOrderingRules?: {
        defaultOrderLevel: number;
        defaultNumberOfEmptyLinesAfterGroup?: number;
        rules: {
            type?: CustomOrderRuleType
            numberOfEmptyLinesAfterGroup?: number;
            regex: string;
            orderLevel: number
        }[]
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
    customOrderingRules: {
        defaultOrderLevel: 20,
        defaultNumberOfEmptyLinesAfterGroup: 1,
        rules: [
            {
                type: 'importMember',
                regex: '^$',
                orderLevel: 0
            },
            {
                regex: '^[@]',
                orderLevel: 10
            },
            {
                regex: '^[.]',
                orderLevel: 30
            }]
    }
};