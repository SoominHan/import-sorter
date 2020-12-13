import { Comment } from './comment';

export interface ImportElement {
    moduleSpecifierName: string;
    startPosition: { line: number; character: number };
    endPosition: { line: number; character: number };
    hasFromKeyWord: boolean;
    isTypeOnly: boolean;
    defaultImportName?: string;
    namedBindings?: {
        aliasName: string;
        name: string;
    }[];
    importComment: {
        leadingComments: Comment[],
        trailingComments: Comment[]
    };
}
