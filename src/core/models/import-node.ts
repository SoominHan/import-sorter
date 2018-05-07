import {
    ImportDeclaration,
    LineAndCharacter,
    TextRange
} from 'typescript';

export interface ImportNode {
    importDeclaration: ImportDeclaration;
    comments: Comment[];
    start: LineAndCharacter;
    end: LineAndCharacter;
}

export type CommentType = 'leading' | 'trailing';

export interface Comment {
    text: string;
    range: TextRange;
    type: CommentType;
}