export interface ImportElement {
    moduleSpecifierName: string;
    startPosition: { line: number; character: number };
    endPosition: { line: number; character: number };
    hasFromKeyWord: boolean;
    defaultImportName?: string;
    namedBindings?: {
        aliasName: string;
        name: string;
    }[];
}