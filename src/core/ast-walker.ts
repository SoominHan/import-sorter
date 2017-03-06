import { ImportElement, ImportNode } from './models';
import * as path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';

const rootPath = (args: string) => {
    return path.join(...[__dirname].concat(args));
};

export class AstWalker {

    public parseImports(filePath: string): ImportElement[] {
        const fullPath = rootPath(filePath);
        const sourceText = fs.readFileSync(fullPath).toString();
        const sourceFile = this.createSourceFile(fullPath, sourceText);
        const imports = this.delintImports(sourceFile);
        return imports.map(x => this.parseImport(x, sourceFile)).filter(x => x !== null);
    }

    private createSourceFile(fullFilePath: string, sourceText: string) {
        return ts.createSourceFile(fullFilePath, sourceText, ts.ScriptTarget.ES6, false);
    }

    private delintImports(sourceFile: ts.SourceFile) {
        const importNodes: ImportNode[] = [];
        const delintNode = (node: ts.Node) => {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    const lines = this.getCodeLineNumbers(node, sourceFile);
                    importNodes.push({ importDeclaration: (node as ts.ImportDeclaration), start: lines.importStartLine, end: lines.importEndLine });
                    this.getCodeLineNumbers(node, sourceFile);
                    break;
                default:
                    break;
            }
            ts.forEachChild(node, delintNode);
        };
        delintNode(sourceFile);
        return importNodes;
    };

    private getCodeLineNumbers(node: ts.Node, sourceFile: ts.SourceFile) {
        const importStartLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const importEndLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        return { importStartLine: importStartLine, importEndLine: importEndLine };
    }

    private parseImport(importNode: ImportNode, sourceFile: ts.SourceFile): ImportElement {
        const moduleSpecifierName = importNode.importDeclaration.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral
            ? (importNode.importDeclaration.moduleSpecifier as ts.StringLiteral).text
            : importNode.importDeclaration.moduleSpecifier.getFullText(sourceFile).trim();
        const result: ImportElement = {
            moduleSpecifierName: moduleSpecifierName,
            startPosition: importNode.start,
            endPosition: importNode.end,
            hasBraket: false,
            hasFromKeyWord: false,
            namedBindings: []
        };

        const importClause = importNode.importDeclaration.importClause;
        if (!importClause) {
            return result;
        }
        if (importClause.name) {
            result.hasFromKeyWord = true;
            result.defaultImportName = importClause.name.text;
        }
        if (!importClause.namedBindings) {
            return result;
        }
        result.hasFromKeyWord = true;

        if (importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
            const nsImport = importClause.namedBindings as ts.NamespaceImport;
            result.namedBindings.push({ aliasName: nsImport.name.text, name: '*' });
            return result;
        }

        if (importClause.namedBindings.kind === ts.SyntaxKind.NamedImports) {
            result.hasBraket = true;
            const nImport = importClause.namedBindings as ts.NamedImports;
            nImport.elements.forEach(y => {
                const properyName = y.propertyName ? y.propertyName.text : y.name.text;
                const aliasName = !y.propertyName ? null : y.name.text;
                result.namedBindings.push({ aliasName: aliasName, name: properyName });
            });
            return result;
        }
        console.warn('unsupported import: ', JSON.stringify(importClause));
        return null;
    }
}