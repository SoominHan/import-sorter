import { chain, LoDashExplicitArrayWrapper } from 'lodash';

import {
    ImportElement,
    ImportElementGroup,
    ImportStringConfiguration
} from './models';

export class ImportCreator {
    private importStringConfig: ImportStringConfiguration;

    public initialise(importStringConfig: ImportStringConfiguration) {
        this.importStringConfig = importStringConfig;
    }

    public createImportText(groups: ImportElementGroup[]): string {
        this.assertIsInitialised();
        return groups
            .map((x, i, data) => {
                return this.createImportStrings(x.elements).join('\n')
                    + this.repeatString('\n', i !== (data.length - 1) ? x.numberOfEmptyLinesAfterGroup : 0);
            })
            .join('\n')
            + this.repeatString('\n', this.importStringConfig.numberOfEmptyLinesAfterAllImports);
    }

    private createImportStrings(element: ImportElement[]): string[] {
        this.assertIsInitialised();
        return element.map(x => {
            const importString = this.createSingleImportString(x);

            let leadingCommentText = x.importComment.leadingComments.map(comment => comment.text).join('\n');
            leadingCommentText = leadingCommentText ? leadingCommentText + '\n' : leadingCommentText;

            let trailingCommentText = x.importComment.trailingComments.map(comment => comment.text).join('\n');
            trailingCommentText = trailingCommentText ? ' ' + trailingCommentText : trailingCommentText;

            const importWithComments = leadingCommentText + importString + trailingCommentText;
            return importWithComments;
        });
    }

    private assertIsInitialised() {
        if (!this.importStringConfig) {
            throw new Error('ImportStringConfiguration: has not been initialised');
        }
    }

    private createSingleImportString(element: ImportElement) {
        const qMark = this.getQuoteMark();
        if (!element.hasFromKeyWord) {
            return `import ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`;
        }

        if (element.namedBindings && element.namedBindings.length > 0) {
            const isStarImport = element.namedBindings.some(x => x.name === '*');
            if (isStarImport) {
                return `import ${element.namedBindings[0].name} as ${element.namedBindings[0].aliasName} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`;
            }
            const curlyBracketElement = this.createCurlyBracketElement(element);
            return this.createImportWithCurlyBracket(element, curlyBracketElement.line, curlyBracketElement.isSingleLine);
        }
        if (element.defaultImportName) {
            return `import ${element.defaultImportName} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`;
        }
        console.warn('unknown string import', element);
        return null;
    }

    private createCurlyBracketElement(element: ImportElement) {
        const spaceConfig = this.getSpaceConfig();
        const nameBindingStringsExpr = chain(element.namedBindings)
            .map(x => x.aliasName ? `${x.name} as ${x.aliasName}` : x.name);
        const resultingChunks = this.createNameBindingChunks(nameBindingStringsExpr, element);
        return resultingChunks.isSingleLine
            ? { line: `${resultingChunks.nameBindings[0]}`, isSingleLine: true }
            : { line: `${spaceConfig.tabSequence}${resultingChunks.nameBindings.join(`,\n${spaceConfig.tabSequence}`)}`, isSingleLine: false };
    }

    private createNameBindingChunks(nameBindingStringsExpr: LoDashExplicitArrayWrapper<string>, element: ImportElement): {
        nameBindings: string[],
        isSingleLine: boolean
    } {

        const nameBindings = nameBindingStringsExpr.value();

        if (this.importStringConfig.maximumNumberOfImportExpressionsPerLine.type === 'words') {
            return this.createNameBindingChunksByWords(nameBindings, this.importStringConfig.maximumNumberOfImportExpressionsPerLine.count);
        }

        return this.createNameBindingChunksByLength(nameBindings, element);
    }

    private createNameBindingChunksByWords(nameBindings: string[], maximumNumberOfWordsBeforeBreak: number): {
        nameBindings: string[],
        isSingleLine: boolean
    } {
        const spaceConfig = this.getSpaceConfig();
        const beforeCommaAndAfterPart = `${spaceConfig.beforeComma},${spaceConfig.afterComma}`;
        const nameBindingsResult = chain(nameBindings)
            .chunk(maximumNumberOfWordsBeforeBreak)
            .map(x => x.join(beforeCommaAndAfterPart))
            .value();

        const isSingleLine = nameBindings.length <= maximumNumberOfWordsBeforeBreak;
        this.appendTrailingComma(nameBindingsResult, isSingleLine);

        return {
            nameBindings: nameBindingsResult,
            isSingleLine
        };
    }

    private createNameBindingChunksByLength(nameBindings: string[], element: ImportElement): {
        nameBindings: string[],
        isSingleLine: boolean
    } {
        const max = this.importStringConfig.maximumNumberOfImportExpressionsPerLine.count;
        const spaceConfig = this.getSpaceConfig();
        const beforeCommaAndAfterPart = `${spaceConfig.beforeComma},${spaceConfig.afterComma}`;
        const insideCurlyString = nameBindings.join(beforeCommaAndAfterPart);
        const singleLineImport = this.createImportWithCurlyBracket(element, insideCurlyString, true);
        const isSingleLine = this.importStringConfig.trailingComma === 'always' ? singleLineImport.length < max : singleLineImport.length <= max;
        if (isSingleLine) {
            const nameBindingsResult = [insideCurlyString];
            this.appendTrailingComma(nameBindingsResult, true);
            return {
                nameBindings: nameBindingsResult,
                isSingleLine: true
            };
        }

        if (this.importStringConfig.maximumNumberOfImportExpressionsPerLine.type === 'newLineEachExpressionAfterCountLimit') {
            return this.createNameBindingChunksByWords(nameBindings, 1);
        }

        const result: string[][] = [];
        let resultIndex = 0;
        let currentTotalLength = 0;
        const maxLineLength = max - this.importStringConfig.tabSize;
        this.appendTrailingComma(nameBindings, false);
        nameBindings
            .forEach((x, ind) => {
                const xLength = ind !== nameBindings.length - 1
                    ? x.length + this.importStringConfig.spacingPerImportExpression.beforeComma + 1 // 1 for comma
                    : x.length; //last element, so we remove comma and space before comma
                currentTotalLength += xLength;
                if (currentTotalLength <= maxLineLength) {
                    result[resultIndex] ? result[resultIndex].push(x) : result[resultIndex] = [x];
                    currentTotalLength += this.importStringConfig.spacingPerImportExpression.afterComma;
                    return;
                } else {
                    if (result[resultIndex]) {
                        resultIndex++;
                    }
                    result[resultIndex] = [x];
                    if (xLength < maxLineLength) {
                        currentTotalLength = xLength;
                        return;
                    }
                    currentTotalLength = 0;
                }
            });
        return {
            nameBindings: result.map(x => x.join(beforeCommaAndAfterPart)),
            isSingleLine: false
        };
    }

    private appendTrailingComma(nameBindings: string[], isSingleLine: boolean) {
        const hasTrailingComma =
            (isSingleLine && this.importStringConfig.trailingComma === 'always')
            || (!isSingleLine && this.importStringConfig.trailingComma !== 'none');
        if (hasTrailingComma) {
            nameBindings[nameBindings.length - 1] = nameBindings[nameBindings.length - 1] + `${this.getSpaceConfig().beforeComma},`;
        }
    }

    private createImportWithCurlyBracket(element: ImportElement, namedBindingString: string, isSingleLine: boolean) {
        const qMark = this.getQuoteMark();
        const spaceConfig = this.getSpaceConfig();
        if (element.defaultImportName) {
            return isSingleLine
                // tslint:disable-next-line:max-line-length
                ? `import ${element.defaultImportName}${spaceConfig.beforeComma},${spaceConfig.afterComma}{${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`
                : `import ${element.defaultImportName}${spaceConfig.beforeComma},${spaceConfig.afterComma}{\n${namedBindingString}\n} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`;

        }
        return isSingleLine
            // tslint:disable-next-line:max-line-length
            ? `import {${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`
            : `import {\n${namedBindingString}\n} from ${qMark}${element.moduleSpecifierName}${qMark}${this.semicolonChar}`;
    }

    private getSpaceConfig() {
        const tabSequence = this.importStringConfig.tabType === 'tab'
            ? this.repeatString('\t', 1)
            : this.repeatString(' ', this.importStringConfig.tabSize);
        return {
            beforeComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeComma),
            afterComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterComma),
            afterStartingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterStartingBracket),
            beforeEndingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeEndingBracket),
            tabSequence: tabSequence
        };
    }

    private getQuoteMark() {
        return this.importStringConfig.quoteMark === 'single' ? '\'' : '"';
    }

    private get semicolonChar() {
        return this.importStringConfig.hasSemicolon === true ? ';' : '';
    }

    private repeatString(str: string, numberOfTimes: number) {
        return Array.apply(null, Array(numberOfTimes + 1)).join(str);
    }
}
