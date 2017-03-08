import { ImportElement, ImportStringConfiguration } from './models';
import { chain, LoDashExplicitArrayWrapper } from 'lodash';

export class ImportCreator {
    constructor(private importStringConfig: ImportStringConfiguration) { }

    public createImportText(element: ImportElement[]): string {
        return this.createImportStrings(element).join('\n') + this.repeatString('\n', this.importStringConfig.numberOfEmptyLinesAfterAllImports);
    }

    public createImportStrings(element: ImportElement[]): string[] {
        return element.map(x => this.createSingleImportString(x));
    }

    private createSingleImportString(element: ImportElement) {
        const qMark = this.getQuoteMark();
        if (!element.hasFromKeyWord) {
            return `import ${qMark}${element.moduleSpecifierName}${qMark};`;
        }

        if (element.namedBindings && element.namedBindings.length > 0) {
            const isStarImport = element.namedBindings.some(x => x.name === '*');
            if (isStarImport) {
                return `import ${element.namedBindings[0].name} as ${element.namedBindings[0].aliasName} from ${qMark}${element.moduleSpecifierName}${qMark};`;
            }
            const curlyBracketElement = this.createCurlyBracketElement(element);
            return this.createImportWithCurlyBracket(element, curlyBracketElement.line, curlyBracketElement.isSingleLine);
        }
        if (element.defaultImportName) {
            return `import ${element.defaultImportName} from ${qMark}${element.moduleSpecifierName}${qMark};`;
        }
        console.warn('unknown string import', element);
        return null;
    }

    private createCurlyBracketElement(element: ImportElement) {
        const spaceConfig = this.getSpaceConfig();
        const nameBindingStringsExpr = chain(element.namedBindings)
            .map(x => x.aliasName ? `${x.name} as ${x.aliasName}` : x.name);
        const chunkedExpr = this.createNameBindingChunks(nameBindingStringsExpr);
        const resultingImportStrings = chunkedExpr
            .map(y => y.join(`${spaceConfig.beforeComma},${spaceConfig.afterComma}`))
            .value();
        return resultingImportStrings.length === 1
            ? { line: `${resultingImportStrings[0]}`, isSingleLine: true }
            : { line: `${spaceConfig.tabSpace}${resultingImportStrings.join(`,\n${spaceConfig.tabSpace}`)}`, isSingleLine: false };
    }

    private createNameBindingChunks(nameBindingStringsExpr: LoDashExplicitArrayWrapper<string>): LoDashExplicitArrayWrapper<string[]> {
        if (this.importStringConfig.maximumNumberOfImportExpressionsPerLine.type === 'words') {
            return nameBindingStringsExpr.chunk(this.importStringConfig.maximumNumberOfImportExpressionsPerLine.count);
        }
        const result: string[][] = [];
        let resultIndex = 0;
        let currentTotalLength = 0;
        const max = this.importStringConfig.maximumNumberOfImportExpressionsPerLine.count;
        nameBindingStringsExpr.value().forEach(x => {
            currentTotalLength = currentTotalLength + x.length;
            if (currentTotalLength <= max) {
                result[resultIndex] ? result[resultIndex].push(x) : result[resultIndex] = [x];
                return;
            }
            if (currentTotalLength > max && x.length < max) {
                currentTotalLength = x.length;
                result[resultIndex + 1] = [x];
                resultIndex++;
                return;
            }
            if (currentTotalLength > max) {
                (result[resultIndex])
                    ? result[resultIndex + 1] = [x] : result[resultIndex] = [x];
                currentTotalLength = 0;
                result[resultIndex + 1] ? resultIndex = resultIndex + 2 : resultIndex++;
                return;
            }
        });
        return chain(result);
    }

    private createImportWithCurlyBracket(element: ImportElement, namedBindingString: string, isSingleLine: boolean) {
        const qMark = this.getQuoteMark();
        const spaceConfig = this.getSpaceConfig();
        if (element.defaultImportName) {
            return isSingleLine
                // tslint:disable-next-line:max-line-length
                ? `import ${element.defaultImportName}${spaceConfig.beforeComma},${spaceConfig.afterComma}{${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark};`
                : `import ${element.defaultImportName}${spaceConfig.beforeComma},${spaceConfig.afterComma}{\n${namedBindingString}\n} from ${qMark}${element.moduleSpecifierName}${qMark};`;

        }
        return isSingleLine
            ? `import {${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark};`
            : `import {\n${namedBindingString}\n} from ${qMark}${element.moduleSpecifierName}${qMark};`;
    }

    private getSpaceConfig() {
        return {
            beforeComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeComma),
            afterComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterComma),
            afterStartingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterStartingBracket),
            beforeEndingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeEndingBracket),
            tabSpace: this.repeatString(' ', this.importStringConfig.tabSize)
        };
    }

    private getQuoteMark() {
        return this.importStringConfig.quoteMark === 'single' ? '\'' : '"';
    }

    private repeatString(str: string, numberOfTimes: number) {
        return Array.apply(null, Array(numberOfTimes + 1)).join(str);
    }
}