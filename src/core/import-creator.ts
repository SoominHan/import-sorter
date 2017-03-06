import { ImportElement, ImportStringConfiguration } from './models';

export class ImportCreator {
    constructor(private importStringConfig: ImportStringConfiguration) { }

    public createImportStrings(element: ImportElement[]): string[] {
        return element.map(x => this.createSingleImportString(x));
    }

    private createSingleImportString(element: ImportElement) {
        const qMark = this.getQuoteMark();
        if (!element.hasFromKeyWord) {
            return `import ${qMark}${element.moduleSpecifierName}${qMark};`;
        }
        const spaceConfig = this.getSpaceConfig();
        if (element.namedBindings && element.namedBindings.length > 0) {
            const namedBindings = element
                .namedBindings
                .map(x => x.aliasName ? `${x.name} as ${x.aliasName}` : x.name);
            const namedBindingString = namedBindings.length > 1
                ? namedBindings.join(`${spaceConfig.beforeComma},${spaceConfig.afterComma}`)
                : namedBindings[0];
            const isStarImport = element.namedBindings.some(x => x.name === '*');
            if (isStarImport) {
                return `import ${namedBindingString} from ${qMark}${element.moduleSpecifierName}${qMark};`;
            }

            return element.defaultImportName
                // tslint:disable-next-line:max-line-length
                ? `import ${element.defaultImportName}${spaceConfig.beforeComma},${spaceConfig.afterComma}{${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark};`
                : `import {${spaceConfig.afterStartingBracket}${namedBindingString}${spaceConfig.beforeEndingBracket}} from ${qMark}${element.moduleSpecifierName}${qMark};`;
        }
        if (element.defaultImportName) {
            return `import ${element.defaultImportName} from ${qMark}${element.moduleSpecifierName}${qMark};`;
        }
        console.warn('unknown string import', element);
        return null;
    }

    private getSpaceConfig() {
        return {
            beforeComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeComma),
            afterComma: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterComma),
            afterStartingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.afterStartingBracket),
            beforeEndingBracket: this.repeatString(' ', this.importStringConfig.spacingPerImportExpression.beforeEndingBracket)
        };
    }
    private getQuoteMark() {
        return this.importStringConfig.quoteMark === 'single' ? '\'' : '"';
    }
    private repeatString(str: string, numberOfTimes: number) {
        return Array.apply(null, Array(numberOfTimes + 1)).join(str);
    }
}