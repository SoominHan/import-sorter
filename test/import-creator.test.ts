import 'mocha';
import * as expect from 'expect.js';
import { ImportCreator, ImportElementGroup, ImportStringConfiguration } from '../src/core';

interface ImportCreatorTest {
    testName: string;
    elementGroups: ImportElementGroup[];
    expected: string;
}

suite('Import Creator Tests', () => {

    const stringConfiguration: ImportStringConfiguration = {
        tabSize: 4,
        numberOfEmptyLinesAfterAllImports: 2,
        quoteMark: 'single',
        maximumNumberOfImportExpressionsPerLine: {
            count: 23,
            type: 'maxLineLength'
        },
        spacingPerImportExpression: {
            afterStartingBracket: 1,
            beforeEndingBracket: 1,
            beforeComma: 0,
            afterComma: 1
        }
    };

    const testCases: ImportCreatorTest[] = [
        {
            testName: 'test0',
            elementGroups: [
                {
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
                        }],
                    numberOfEmptyLinesAfterGroup: 3
                }
            ],
            expected: "import t, {\n    B, a as cc, ac\n} from \'createString.ts\';\n\n"
        }
    ];

    const getImportText = (groups: ImportElementGroup[]) => {
        const creator = new ImportCreator();
        creator.initialise(stringConfiguration);
        return creator.createImportText(groups);
    };

    const importCreatorTest = (testName, groups, expected) => {
        test(`ImportCreator : ${testName} produces correct string`, () => {
            const importText = getImportText(groups);
            expect(importText).to.eql(expected);
        });
    };

    testCases.forEach(testElement => {
        importCreatorTest(testElement.testName, testElement.elementGroups, testElement.expected);
    });
});