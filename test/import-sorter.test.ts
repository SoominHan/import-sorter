import 'mocha';
import { ImportElement, ImportElementSortResult, SortConfiguration, ImportSorter } from '../src/core';
import * as expect from 'expect.js';

interface SortingTest {
    testName: string;
    imports: ImportElement[];
    expected: ImportElementSortResult;
}

suite('Import Sorter Tests', () => {

    const importSorterConfiguration: SortConfiguration = {
        importMembers: {
            order: 'caseInsensitive',
            direction: 'asc'
        },
        importPaths: {
            order: 'caseInsensitive',
            direction: 'asc'
        },
        joinImportPaths: true,
        customOrderingRules: {
            defaultOrderLevel: 20,
            defaultNumberOfEmtyLinesAfterGroup: 1,
            rules: [{ regex: '^@angular', orderLevel: 0, numberOfEmptyLinesAfterGroup: 0 }, { regex: '^[@]', orderLevel: 10 }, { regex: '^[.]', orderLevel: 30 }]
        }
    };

    const testCases: SortingTest[] = [
        {
            testName: 'test0',
            imports: [
                {
                    moduleSpecifierName: 'createString.ts',
                    startPosition: { line: 0, character: 0 },
                    endPosition: { line: 0, character: 53 },
                    hasFromKeyWord: true,
                    defaultImportName: 't',
                    namedBindings: [
                        { name: 'B', aliasName: null },
                        { name: 'a', aliasName: 'cc' },
                        { name: 'ac', aliasName: null }
                    ]
                },
                {
                    moduleSpecifierName: './createString.ts',
                    startPosition: { line: 0, character: 0 },
                    endPosition: { line: 0, character: 53 },
                    hasFromKeyWord: true,
                    namedBindings: [
                        { name: 'a', aliasName: null },
                        { name: 'd', aliasName: '_' },
                        { name: 'aa', aliasName: null },
                        { name: 's', aliasName: 'b' }

                    ]
                },
                {
                    moduleSpecifierName: 'module-name.js',
                    startPosition: { line: 0, character: 0 },
                    endPosition: { line: 0, character: 42 },
                    hasFromKeyWord: true,
                    defaultImportName: undefined,
                    namedBindings: [{ name: 'a', aliasName: 'aaa' }]
                }
            ],
            expected: {
                groups: [{
                    elements: [
                        {
                            moduleSpecifierName: 'createString.ts',
                            startPosition: { line: 0, character: 0 },
                            endPosition: { line: 0, character: 53 },
                            hasFromKeyWord: true,
                            defaultImportName: 't',
                            namedBindings: [
                                { name: 'B', aliasName: null },
                                { name: 'a', aliasName: 'cc' },
                                { name: 'ac', aliasName: null }
                            ]
                        },
                        {
                            moduleSpecifierName: './createString.ts',
                            startPosition: { line: 0, character: 0 },
                            endPosition: { line: 0, character: 53 },
                            hasFromKeyWord: true,
                            namedBindings: [
                                { name: 'a', aliasName: null },
                                { name: 'd', aliasName: '_' },
                                { name: 'aa', aliasName: null },
                                { name: 's', aliasName: 'b' }

                            ]
                        },
                        {
                            moduleSpecifierName: 'module-name.js',
                            startPosition: { line: 0, character: 0 },
                            endPosition: { line: 0, character: 42 },
                            hasFromKeyWord: true,
                            defaultImportName: undefined,
                            namedBindings: [{ name: 'a', aliasName: 'aaa' }]
                        }

                    ],
                    numberOfEmptyLinesAfterGroup: 2
                }],
                duplicates: [
                    {
                        moduleSpecifierName: 'createString.ts',
                        startPosition: { line: 0, character: 0 },
                        endPosition: { line: 0, character: 53 },
                        hasFromKeyWord: true,
                        defaultImportName: 't',
                        namedBindings: [
                            { name: 'B', aliasName: null },
                            { name: 'a', aliasName: 'cc' },
                            { name: 'ac', aliasName: null }
                        ]
                    },
                    {
                        moduleSpecifierName: './createString.ts',
                        startPosition: { line: 0, character: 0 },
                        endPosition: { line: 0, character: 53 },
                        hasFromKeyWord: true,
                        namedBindings: [
                            { name: 'a', aliasName: null },
                            { name: 'd', aliasName: '_' },
                            { name: 'aa', aliasName: null },
                            { name: 's', aliasName: 'b' }

                        ]
                    },
                    {
                        moduleSpecifierName: 'module-name.js',
                        startPosition: { line: 0, character: 0 },
                        endPosition: { line: 0, character: 42 },
                        hasFromKeyWord: true,
                        defaultImportName: undefined,
                        namedBindings: [{ name: 'a', aliasName: 'aaa' }]
                    }
                ]
            }
        }];

    const sortedElements = (imports: ImportElement[]) => {
        const sorter = new ImportSorter();
        sorter.initialise(importSorterConfiguration);
        return sorter.sortImportElements(imports);
    };

    const importSorterTest = (testName, imports, expected) => {
        test(`ImportSorter : ${testName} produces correct sorted group`, () => {
            const groups = sortedElements(imports);
            expect(groups).to.eql(expected);
        });
    };

    testCases.forEach(testElement => {
        importSorterTest(testElement.testName, testElement.imports, testElement.expected);
    });
});