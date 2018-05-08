import { CommentRange } from 'typescript';

export interface Comment {
    text: string;
    range: CommentRange;
}