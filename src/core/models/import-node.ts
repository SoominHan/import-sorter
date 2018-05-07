import {
    ImportDeclaration,
    LineAndCharacter
} from 'typescript';
import { Comment } from './comment';

export interface ImportNode {
    importDeclaration: ImportDeclaration;
    comments: Comment[];
    start: LineAndCharacter;
    end: LineAndCharacter;
}

