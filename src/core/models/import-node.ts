import {
    ImportDeclaration,
    LineAndCharacter
} from 'typescript';

export interface ImportNode {
    importDeclaration: ImportDeclaration;
    start: LineAndCharacter;
    end: LineAndCharacter;
}