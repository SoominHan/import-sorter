export interface GeneralConfiguration {
    configurationFilePath: string;
    sortOnBeforeSave: boolean;
    exclude: string[];
    foldImports: boolean;
}

export const defaultGeneralConfiguration: GeneralConfiguration = {
    configurationFilePath: './import-sorter.json',
    sortOnBeforeSave: false,
    exclude: [],
    foldImports: false
};