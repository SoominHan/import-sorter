export interface ImportStringConfiguration {
    maximumNumberOfImportExpressionsPerLine: {
        count: number;
        type: 'words' | 'chars'
    }
    quoteMark: 'single' | 'double';
    tabSize: number;
    numberOfEmptyLinesAfterAllImports: number;
    spacingPerImportExpression: {
        afterStartingBracket: number;
        beforeEndingBracket: number;
        beforeComma: number;
        afterComma: number;
    };
}

export const defaultImportStringConfiguration: ImportStringConfiguration = {
    tabSize: 4,
    numberOfEmptyLinesAfterAllImports: 2,
    quoteMark: 'single',
    maximumNumberOfImportExpressionsPerLine: {
        count: 2,
        type: 'words'
    },
    spacingPerImportExpression: {
        afterStartingBracket: 1,
        beforeEndingBracket: 1,
        beforeComma: 0,
        afterComma: 1
    }
};