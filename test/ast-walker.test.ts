import * as expect from 'expect.js';
import 'mocha';

import { SimpleImportAstParser } from '../src/core/ast-parser';
import { ImportElement } from '../src/core/core-public';

interface AstTest {
    testName: string;
    text: string;
    expected: ImportElement;
}

suite('AstWalker tests', () => {

    const testCases: AstTest[] = [
        {
            testName: 'test1a',
            text: `import { a, c as cc, b } from 'test.js';`,
            expected: {
                endPosition: { line: 0, character: 40 },
                moduleSpecifierName: 'test.js',
                hasFromKeyWord: true,
                namedBindings: [
                    { name: 'a', aliasName: null },
                    { name: 'c', aliasName: 'cc' },
                    { name: 'b', aliasName: null }
                ],
                startPosition: { line: 0, character: 0 },
                importComment: {
                    leadingComments: [],
                    trailingComments: []
                }
            }
        },
        {
            testName: 'test1b',
            text: `//comment
            import  {  a  ,
                    c  as  cc , b
                }
                from 'test.js';

                `,
            expected: {
                moduleSpecifierName: 'test.js',
                startPosition: { line: 1, character: 12 },
                endPosition: { line: 4, character: 31 },
                hasFromKeyWord: true,
                namedBindings: [
                    { name: 'a', aliasName: null },
                    { name: 'c', aliasName: 'cc' },
                    { name: 'b', aliasName: null }
                ],
                importComment: {
                    leadingComments: [{
                        range: {
                            end: 9,
                            pos: 0,
                            kind: 2,
                            hasTrailingNewLine: true
                        },
                        text: '//comment'
                    }],
                    trailingComments: []
                }
            }
        },
        {
            testName: 'test1c',
            text: `import { a, c as cc, b } from "test.js"`,
            expected: {
                endPosition: { line: 0, character: 39 },
                moduleSpecifierName: 'test.js',
                hasFromKeyWord: true,
                namedBindings: [
                    { name: 'a', aliasName: null },
                    { name: 'c', aliasName: 'cc' },
                    { name: 'b', aliasName: null }
                ],
                startPosition: { line: 0, character: 0 },
                importComment: {
                    leadingComments: [],
                    trailingComments: []
                }
            }
        },
        {
            testName: 'test1d',
            text: `/* leadingComment1 */
            //leadingComment2
            import  {  a  ,
                    c  as  cc , b
                }
                from 'test.js'; //trailingComment

                `,
            expected: {
                moduleSpecifierName: 'test.js',
                startPosition: { line: 2, character: 12 },
                endPosition: { line: 5, character: 31 },
                hasFromKeyWord: true,
                namedBindings: [
                    { name: 'a', aliasName: null },
                    { name: 'c', aliasName: 'cc' },
                    { name: 'b', aliasName: null }
                ],
                importComment: {
                    leadingComments: [{
                        range: {
                            end: 21,
                            pos: 0,
                            kind: 3,
                            hasTrailingNewLine: true
                        },
                        text: '/* leadingComment1 */'
                    },
                    {
                        range: {
                            end: 51,
                            hasTrailingNewLine: true,
                            kind: 2,
                            pos: 34
                        },
                        text: '//leadingComment2'
                    }],
                    trailingComments: [
                        {
                            range: {
                                end: 181,
                                hasTrailingNewLine: true,
                                kind: 2,
                                pos: 164
                            },
                            text: '//trailingComment'
                        }
                    ]
                }
            }
        }
    ];

    const getImports = (text: string) => {
        const walker = new SimpleImportAstParser();
        const imports = walker.parseImports('nonExistentFile', text);
        return imports;
    };

    const astWalkerTest = (testName, text, expected) => {
        test(`AstWalker:  ${testName} produces correct result`, () => {
            const imports = getImports(text);
            expect(imports.length).to.be(1);
            expect(imports[0]).to.eql(expected);
        });
    };

    testCases.forEach(testElement => {
        astWalkerTest(testElement.testName, testElement.text, testElement.expected);
    });
});