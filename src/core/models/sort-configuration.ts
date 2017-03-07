export type ImportSortOrder = 'caseInsensitive' | 'lowercaseFirst' | 'lowercaseLast' | 'unsorted';
export type ImportSortOrderDirection = 'asc' | 'desc';
export interface SortConfiguration {
    importSources: {
        order: ImportSortOrder,
        direction: ImportSortOrderDirection;
    };
    namedImports: {
        order: ImportSortOrder,
        direction: ImportSortOrderDirection;
    };
    joinNamedImports?: boolean;
    customOrderingRules?: {
        defaultOrderLevel: number;
        rules: {
            regex: string;
            orderLevel: number
        }[]
    };
}

export const defaultSortConfiguration: SortConfiguration = {
    importSources: {
        order: 'caseInsensitive',
        direction: 'asc'
    },
    namedImports: {
        order: 'caseInsensitive',
        direction: 'asc'
    },
    joinNamedImports: true,
    customOrderingRules: {
        defaultOrderLevel: 10,
        rules: [{ regex: '@angular', orderLevel: 0 }, { regex: '@ngrx', orderLevel: 1 }]
    }
};