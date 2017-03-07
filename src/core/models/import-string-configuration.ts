export interface ImportStringConfiguration {
    maximumNumberOfCharactersPerLine: number;
    maximumNumberOfImportExpressionsPerLine: number;
    quoteMark: 'single' | 'double';
    tabSize: number;
    spacingPerImportExpression: {
        afterStartingBracket: number;
        beforeEndingBracket: number;
        beforeComma: number;
        afterComma: number;
    };
}

export const defaultImportStringConfiguration: ImportStringConfiguration = {
    maximumNumberOfCharactersPerLine: 180,
    maximumNumberOfImportExpressionsPerLine: 3,
    tabSize: 4,
    quoteMark: 'single',
    spacingPerImportExpression: {
        afterStartingBracket: 1,
        beforeEndingBracket: 1,
        beforeComma: 0,
        afterComma: 1
    }
};