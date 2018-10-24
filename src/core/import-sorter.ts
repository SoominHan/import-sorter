import {
    chain,
    cloneDeep,
    isNil,
    LoDashExplicitArrayWrapper
} from 'lodash';
import * as path from 'path';

import {
    ImportElement,
    ImportElementGroup,
    ImportSortOrder,
    SortConfiguration
} from './models';
import { CustomOrderRule } from './models/custom-order-rule';
import { ImportElementSortResult } from './models/import-element-sort-result';

const NEW_PERIOD_CHAR = String.fromCharCode(128);

export interface IImportSorter {
    initialise(sortConfig: SortConfiguration);
    sortImportElements(imports: ImportElement[]): ImportElementSortResult;
}

export class ImportSorter implements IImportSorter{
    private sortConfig: SortConfiguration;

    public initialise(sortConfig: SortConfiguration) {
        this.sortConfig = sortConfig;
    }

    public sortImportElements(imports: ImportElement[]): ImportElementSortResult {
        this.assertIsInitialised();
        const clonedElements = cloneDeep(imports);
        const joinedImportsResult = this.joinImportPaths(clonedElements);
        const duplicates = joinedImportsResult.duplicates;
        const sortedImportsExpr = this.sortNamedBindings(joinedImportsResult.joinedExpr);
        const sortedElementGroups = this.applyCustomSortingRules(sortedImportsExpr);
        this.sortModuleSpecifiers(sortedElementGroups);
        return {
            groups: sortedElementGroups,
            duplicates: duplicates
        };
    }

    private assertIsInitialised() {
        if (!this.sortConfig) {
            throw new Error('SortConfiguration: has not been initialised');
        }
    }

    private normalizePaths(imports: ImportElement[]) {
        return chain(imports).map(x => {
            const isRelativePath =
                x.moduleSpecifierName.startsWith(`.`)
                || x.moduleSpecifierName.startsWith(`..`);
            x.moduleSpecifierName = isRelativePath ? path.normalize(x.moduleSpecifierName).replace(new RegExp('\\' + path.sep, 'g'), '/') : x.moduleSpecifierName;
            if (isRelativePath && !x.moduleSpecifierName.startsWith(`./`) && !x.moduleSpecifierName.startsWith(`../`)) {
                if (x.moduleSpecifierName === '.') {
                    x.moduleSpecifierName = './';
                } else if (x.moduleSpecifierName === '..') {
                    x.moduleSpecifierName = '../';
                } else {
                    x.moduleSpecifierName = `./${x.moduleSpecifierName}`;
                }
            }
            return x;
        });
    }

    private sortNamedBindings(importsExpr: LoDashExplicitArrayWrapper<ImportElement>): LoDashExplicitArrayWrapper<ImportElement> {
        const sortOrder = this.getSortOrderFunc(this.sortConfig.importMembers.order);
        return importsExpr.map(x => {
            if (x.namedBindings && x.namedBindings.length) {
                x.namedBindings =
                    chain(x.namedBindings)
                        .orderBy((y: { name: string, aliasName: string }) => sortOrder(y.name), [this.sortConfig.importMembers.direction])
                        .value();
                return x;
            }
            return x;
        });
    }

    private sortModuleSpecifiers(elementGroups: ImportElementGroup[]): void {
        const sortOrder = this.getSortOrderFunc(this.sortConfig.importPaths.order, true);
        elementGroups.filter(gr => !gr.customOrderRule.disableSort).forEach(gr => {
            gr.elements = chain(gr.elements)
                .orderBy<ImportElement>(y => sortOrder(y.moduleSpecifierName), [this.sortConfig.importPaths.direction])
                .value();
        });
    }

    private joinImportPaths(imports: ImportElement[]): { joinedExpr: LoDashExplicitArrayWrapper<ImportElement>, duplicates: ImportElement[] } {
        const normalizedPathsExpr = this.normalizePaths(imports);
        if (!this.sortConfig.joinImportPaths) {
            return {
                joinedExpr: normalizedPathsExpr,
                duplicates: []
            };
        }
        const duplicates = [];
        const joined = normalizedPathsExpr
            .groupBy(x => x.moduleSpecifierName)
            .map((x: ImportElement[]) => {
                if (x.length > 1) {
                    const nameBindings = chain(x).flatMap(y => y.namedBindings).uniqBy(y => y.name).value();
                    const defaultImportElement = x.find(y => !isNil(y.defaultImportName) && !(y.defaultImportName.trim() === ''));
                    const defaultImportName = defaultImportElement ? defaultImportElement.defaultImportName : null;
                    x[0].defaultImportName = defaultImportName;
                    x[0].namedBindings = nameBindings;
                    duplicates.push(...x.slice(1));
                    return x[0];
                }
                return x[0];
            })
            .value();
        return {
            joinedExpr: chain(joined),
            duplicates: duplicates
        };
    }

    private getDefaultLineNumber() {
        if (this.sortConfig.customOrderingRules
            && this.sortConfig.customOrderingRules.defaultNumberOfEmptyLinesAfterGroup) {
            return this.sortConfig.customOrderingRules.defaultNumberOfEmptyLinesAfterGroup;
        }
        return 0;
    }

    private applyCustomSortingRules(sortedImports: LoDashExplicitArrayWrapper<ImportElement>): ImportElementGroup[] {
        if (!this.sortConfig.customOrderingRules
            || !this.sortConfig.customOrderingRules.rules
            || this.sortConfig.customOrderingRules.rules.length === 0) {
            const rules = this.sortConfig.customOrderingRules;
            return [{
                elements: sortedImports.value(),
                numberOfEmptyLinesAfterGroup: this.getDefaultLineNumber(),
                customOrderRule: {
                    disableSort: rules ? rules.disableDefaultOrderSort : false,
                    numberOfEmptyLinesAfterGroup: rules ? rules.defaultNumberOfEmptyLinesAfterGroup : null,
                    orderLevel: rules ? rules.defaultOrderLevel : null,
                    regex: null
                }
            }];
        }
        const rules = this.sortConfig
            .customOrderingRules
            .rules
            .map(x => ({
                orderLevel: x.orderLevel,
                regex: x.regex,
                type: x.type,
                disableSort: x.disableSort,
                numberOfEmptyLinesAfterGroup: isNil(x.numberOfEmptyLinesAfterGroup) ? this.getDefaultLineNumber() : x.numberOfEmptyLinesAfterGroup
            }));

        const result: { [key: number]: ImportElementGroup } = {};
        sortedImports
            .forEach(x => {
                const rule = rules.find(e => !e.type || e.type === 'path' ? x.moduleSpecifierName.match(e.regex) !== null : this.matchNameBindings(x, e.regex));
                if (!rule) {
                    this.addElement(
                        result,
                        {
                            disableSort: this.sortConfig.customOrderingRules.disableDefaultOrderSort,
                            numberOfEmptyLinesAfterGroup: this.getDefaultLineNumber(),
                            orderLevel: this.sortConfig.customOrderingRules.defaultOrderLevel,
                            regex: null
                        },
                        x);
                    return;
                }
                this.addElement(
                    result,
                    rule,
                    x
                );
            })
            .value();
        const customSortedImports =
            chain(Object.keys(result))
                .orderBy(x => +x)
                .map(x => result[x])
                .value();
        return customSortedImports;
    }

    private matchNameBindings(importElement: ImportElement, regex: string) {
        //match an empty string here
        if (!importElement.hasFromKeyWord) {
            return ''.match(regex) !== null;
        }
        if (importElement.defaultImportName && importElement.defaultImportName.trim() !== '') {
            return importElement.defaultImportName.match(regex) !== null;
        }
        return importElement.namedBindings.some(x => x.name.match(regex) !== null);
    }

    private addElement(dictionary: { [key: number]: ImportElementGroup }, rule: CustomOrderRule, value: ImportElement) {
        if (isNil(dictionary[rule.orderLevel])) {
            dictionary[rule.orderLevel] = { elements: [], numberOfEmptyLinesAfterGroup: rule.numberOfEmptyLinesAfterGroup, customOrderRule: rule };
            dictionary[rule.orderLevel].elements = [value];
        } else {
            dictionary[rule.orderLevel].elements.push(value);
        }
    }

    private getSortOrderFunc(sortOrder: ImportSortOrder, changePeriodOrder = false): ((value: string) => string) {
        if (sortOrder === 'caseInsensitive') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(x.toLowerCase()) : x.toLowerCase();
        }
        if (sortOrder === 'lowercaseLast') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(x) : x;
        }
        if (sortOrder === 'unsorted') {
            return (_x) => '';
        }
        if (sortOrder === 'lowercaseFirst') {
            return (x) => changePeriodOrder ? this.parseStringWithPeriod(this.swapStringCase(x)) : this.swapStringCase(x);
        }
    }

    private parseStringWithPeriod(value: string) {
        return value && value.startsWith('.') ? value.replace('.', NEW_PERIOD_CHAR) : value;
    }

    private swapStringCase(str: string) {
        if (str == null) {
            return '';
        }
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            const u = c.toUpperCase();
            result += u === c ? c.toLowerCase() : u;
        }
        return result;
    }
}