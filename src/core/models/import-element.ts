export interface ImportElement {
    moduleSpecifierName: string;
    startPosition: { line: number; character: number };
    endPosition: { line: number; character: number };
    hasFromKeyWord: boolean;
    hasBraket: boolean; //todo: remove due towards namebindings
    defaultImportName?: string;
    namedBindings?: {
        aliasName: string;
        name: string;
    }[];
}