export interface GeneralConfiguration {
    configurationFilePath: string;
    sortOnBeforeSave: boolean;
}

export const defaultGeneralConfiguration: GeneralConfiguration = {
    configurationFilePath: './import-sorter.json',
    sortOnBeforeSave: false
};