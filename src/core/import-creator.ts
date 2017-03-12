import { ImportElement, ImportStringConfiguration, ImportElementGroup } from './models';
import { chain, LoDashExplicitArrayWrapper } from 'lodash';

export class ImportCreator {
    private importStringConfig: ImportStringConfiguration;

    public initialise(importStringConfig: ImportStringConfiguration) {
        this.importStringConfig = importStringConfig;
    }

    public createImportText(groups: ImportElementGroup[]): string {
        this.assertIsinitialised();
        return groups
            .map((x, i, data) => {
                return this.createImportStrings(x.elements).join('\n')
                    + this.repeatString('\n', i !== (data.length - 1) ? x.numberOfEmptyLinesAfterGroup : 0);
            })
            .join('\n')
            + this.repeatString('\n', this.importStringConfig.numberOfEmptyLinesAfterAllImports);
    }

    public createImportStrings(element: ImportElement[]): string[] {
        this.assertIsinitialised();
        return element.map(x => this.createSingleImportString(x));
    }

    private assertIsinitialised() {
        if (!this.importStringConfig) {
            throw new Error('ImportStringConfiguration: has not been initialised');
        }
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
        const resultingChunks = this.createNameBindingChunks(nameBindingStringsExpr, element);
        return resultingChunks.isSingleLine
            ? { line: `${resultingChunks.nameBindings[0]}`, isSingleLine: true }
            : { line: `${spaceConfig.tabSpace}${resultingChunks.nameBindings.join(`,\n${spaceConfig.tabSpace}`)}`, isSingleLine: false };
    }

    private createNameBindingChunks(nameBindingStringsExpr: LoDashExplicitArrayWrapper<string>, element: ImportElement): {
        nameBindings: string[],
        isSingleLine: boolean
    } {
        const max = this.importStringConfig.maximumNumberOfImportExpressionsPerLine.count;
        const spaceConfig = this.getSpaceConfig();
        const nameBindings = nameBindingStringsExpr.value();
        if (this.importStringConfig.maximumNumberOfImportExpressionsPerLine.type === 'words') {
            const nameBindingsResult = chain(nameBindings)
                .chunk(max)
                .map(x => x.join(`${spaceConfig.beforeComma},${spaceConfig.afterComma}`))
                .value();
            return {
                nameBindings: nameBindingsResult,
                isSingleLine: nameBindings.length <= max
            };
        }

        const insideCurlyString = nameBindings.join(`${spaceConfig.beforeComma},${spaceConfig.afterComma}`);
        const isSingleLine = this.createImportWithCurlyBracket(element, insideCurlyString, true).length <= max;
        if (isSingleLine) {
            return {
                nameBindings: [insideCurlyString],
                isSingleLine: true
            };
        }
        const result: string[][] = [];
        let resultIndex = 0;
        let currentTotalLength = 0;
        const maxLineLength = max - this.importStringConfig.tabSize;
        const commaShift =
            this.importStringConfig.spacingPerImportExpression.afterComma
            + this.importStringConfig.spacingPerImportExpression.beforeComma + 1; // 1 for comma
        nameBindings
            .forEach((x, ind) => {
                const xLength = ind !== nameBindings.length - 1
                    ? x.length + commaShift
                    : x.length; //last element, so we remove comma
                currentTotalLength += xLength;
                if (currentTotalLength <= maxLineLength) {
                    result[resultIndex] ? result[resultIndex].push(x) : result[resultIndex] = [x];
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
            nameBindings: result.map(x => x.join(`${spaceConfig.beforeComma},${spaceConfig.afterComma}`)),
            isSingleLine: false
        };
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