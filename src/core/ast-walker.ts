import * as fs from 'fs';
import * as ts from 'typescript';

import {
    Comment,
    ImportElement,
    ImportNode
} from './models';

export class AstWalker {

    public parseImports(fullFilePath: string, _sourceText?: string): ImportElement[] {
        if (_sourceText !== null && _sourceText !== undefined && _sourceText.trim() === '') {
            return [];
        }
        const sourceText = _sourceText || fs.readFileSync(fullFilePath).toString();
        const sourceFile = this.createSourceFile(fullFilePath, sourceText);
        const imports = this.delintImports(sourceFile, sourceText);
        return imports.map(x => this.parseImport(x, sourceFile)).filter(x => x !== null);
    }

    private createSourceFile(fullFilePath: string, sourceText: string) {
        return ts.createSourceFile(fullFilePath, sourceText, ts.ScriptTarget.ES2016, false);
    }

    private delintImports(sourceFile: ts.SourceFile, sourceText?: string) {
        const importNodes: ImportNode[] = [];
        const sourceFileText = sourceText || sourceFile.getText();
        const delintNode = (node: ts.Node) => {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    const lines = this.getCodeLineNumbers(node, sourceFile);
                    importNodes.push({
                        importDeclaration: (node as ts.ImportDeclaration),
                        start: lines.importStartLine,
                        end: lines.importEndLine,
                        importComment: this.getComments(sourceFileText, node)
                    });
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

    private getComments(sourceFileText: string, node: ts.Node) {
        const leadingComments = (ts.getLeadingCommentRanges(sourceFileText, node.getFullStart()) || [])
            .map(range => this.getComment(range, sourceFileText));
        const trailingComments = (ts.getTrailingCommentRanges(sourceFileText, node.getEnd()) || [])
            .map(range => this.getComment(range, sourceFileText));
        return { leadingComments, trailingComments };
    }

    private getComment(range: ts.CommentRange, sourceFileText: string) {
        const comment: Comment = {
            range,
            text: sourceFileText.slice(range.pos, range.end)
        };
        return comment;
    }

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
            hasFromKeyWord: false,
            namedBindings: [],
            importComment: importNode.importComment
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
            const nImport = importClause.namedBindings as ts.NamedImports;
            nImport.elements.forEach(y => {
                const propertyName = y.propertyName ? y.propertyName.text : y.name.text;
                const aliasName = !y.propertyName ? null : y.name.text;
                result.namedBindings.push({ aliasName: aliasName, name: propertyName });
            });
            return result;
        }
        console.warn('unsupported import: ', JSON.stringify(importClause));
        return null;
    }
}