import { CommentRange } from 'typescript';

export type CommentType = 'leading' | 'trailing';

export interface Comment {
    text: string;
    range: CommentRange;
    type: CommentType;
}