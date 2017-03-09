export interface ImportStringConfiguration {
    maximumNumberOfImportExpressionsPerLine: {
        count: number;
        type: 'words' | 'maxLineLength'
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
        count: 26,
        type: 'maxLineLength'
    },
    spacingPerImportExpression: {
        afterStartingBracket: 1,
        beforeEndingBracket: 1,
        beforeComma: 0,
        afterComma: 1
    }
};