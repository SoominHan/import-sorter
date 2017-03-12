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
        defaultNumberOfEmtyLinesAfterGroup?: number;
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
        defaultNumberOfEmtyLinesAfterGroup: 1,
        rules: [{ regex: '^@angular', orderLevel: 0, numberOfEmptyLinesAfterGroup: 0 }, { regex: '^[@]', orderLevel: 10 }, { regex: '^[.]', orderLevel: 30 }]
    }
};