import 'mocha';
import * as expect from 'expect.js';
import { ImportElement, AstWalker } from '../src/core';

interface AstTest {
    name: string;
    text: string;
    expected: ImportElement;
}
const testArray: AstTest[] = [
    {
        name: 'test0',
        text: ``,
        expected: {
            endPosition: { line: 0, character: 0 },
            moduleSpecifierName: null,
            hasFromKeyWord: false,
            startPosition: { line: 0, character: 0 }
        }

    },
    {
        name: 'test1a',
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
            startPosition: { line: 0, character: 0 }
        }

    },

    {
        name: 'test1b',
        text: `//comment
            import  {  a  , 
                    c  as  cc , b 
                } 
                from 'test.js';    
                `,
        expected: {
            moduleSpecifierName: 'test.js',
            startPosition: { line: 1, character: 3 },
            endPosition: { line: 6, character: 20 },
            hasFromKeyWord: true,
            defaultImportName: undefined,
            namedBindings: [
                { name: 'a', aliasName: null },
                { name: 'c', aliasName: 'cc' },
                { name: 'b', aliasName: null }
            ]
        }
    },
    {
        name: 'test1c',
        text: `import { a, c as cc, b } from "test.js";`,
        expected: {
            endPosition: { line: 0, character: 40 },
            moduleSpecifierName: 'test.js',
            hasFromKeyWord: true,
            namedBindings: [
                { name: 'a', aliasName: null },
                { name: 'c', aliasName: 'cc' },
                { name: 'b', aliasName: null }
            ],
            startPosition: { line: 0, character: 0 }
        }
    }
];

suite('AstWalker Tests', () => {

    const getImports = (text: string) => {
        const walker = new AstWalker();
        const imports = walker.parseImports('nonExistantFile', text);
        return imports;
    };
    const testing = (testName, text, expected) => {
        test(`AstWalker:  ${testName} produces correct result`, () => {
            const imports = getImports(text);
            expect(imports.length).to.be(1);
            expect(imports[0]).to.eql(expected);
        });
    };
    testArray.forEach(testElement => {
        testing(testElement.name, testElement.text, testElement.expected);
    });

});

// suite('Import Creater Tests', () => {
// //configuration testcase as default 
// //import elements of all kind 
//     const creater = new ImportCreator();
//     const importString = creater.createImportStrings(elements: ImportElement);
//     const importText = creater.createImportText(importString);

//     const getImports = (text: string) => {
//         const walker = new AstWalker();
//         const imports = walker.parseImports('nonExistantFile', text);
//         return imports;
//     };
//     const testing = (testName, text, expected) => {
//         test(`AstWalker:  ${testName} produces correct result`, () => {
//             const imports = getImports(text);
//             expect(imports.length).to.be(1);
//             expect(imports[0]).to.eql(expected);
//         });
//     };
//     testArray.forEach(testElement => {
//         testing(testElement.name, testElement.text, testElement.expected);
//     });
// });
