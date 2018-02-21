export interface GeneralConfiguration {
    configurationFilePath: string;
    sortOnBeforeSave: boolean;
    exclude: string[];
}

export const defaultGeneralConfiguration: GeneralConfiguration = {
    configurationFilePath: './import-sorter.json',
    sortOnBeforeSave: false,
    exclude: []
};