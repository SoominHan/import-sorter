//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//
// The module 'assert' provides assertion methods from node
//import * as assert from 'assert';
import 'mocha';
import { AstWalker, ImportCreator, ImportSorter, defaultSortConfiguration, defaultImportStringConfiguration } from '../src/core';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
//import * as vscode from 'vscode';
//import * as importSorter from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', () => {
    test('just a main method', () => {
        const walker = new AstWalker();
        const sorter = new ImportSorter();
        sorter.initialise(defaultSortConfiguration);
        const importCreator = new ImportCreator();
        importCreator.initialise(defaultImportStringConfiguration);
        const imports = walker.parseImports('../../../test/test-file1.txt');

        const sortedImports = sorter.sortImportElements(imports);
        const text = importCreator.createImportText(sortedImports.sorted);
        console.log(text);
        //console.log(JSON.stringify(importStrings, null, 2));

    });
});