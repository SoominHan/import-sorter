export interface ImportStringConfiguration {
    maximumNumberOfImportExpressionsPerLine: {
        count: number;
        type: 'words' | 'maxLineLength' | 'newLineEachExpressionAfterCountLimit' | 'newLineEachExpressionAfterCountLimitExceptIfOnlyOne'
    };
    quoteMark: 'single' | 'double';
    tabSize: number;
    tabType: 'tab' | 'space';
    numberOfEmptyLinesAfterAllImports: number;
    trailingComma: 'none' | 'always' | 'multiLine';
    hasSemicolon: boolean;
    spacingPerImportExpression: {
        afterStartingBracket: number;
        beforeEndingBracket: number;
        beforeComma: number;
        afterComma: number;
    };
}

export const defaultImportStringConfiguration: ImportStringConfiguration = {
    tabSize: 4,
    tabType: 'space',
    numberOfEmptyLinesAfterAllImports: 1,
    trailingComma: 'none',
    quoteMark: 'single',
    maximumNumberOfImportExpressionsPerLine: {
        count: 100,
        type: 'maxLineLength'
    },
    hasSemicolon: true,
    spacingPerImportExpression: {
        afterStartingBracket: 1,
        beforeEndingBracket: 1,
        beforeComma: 0,
        afterComma: 1
    }
};