import { ImportDeclaration, LineAndCharacter } from 'typescript';

import { Comment } from './comment';

export interface ImportNode {
    importDeclaration: ImportDeclaration;
    importComment: {
        leadingComments: Comment[];
        trailingComments: Comment[];
    };
    start: LineAndCharacter;
    end: LineAndCharacter;
}

