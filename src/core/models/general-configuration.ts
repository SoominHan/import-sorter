export interface GeneralConfiguration {
    configurationFilePath: string;
    sortOnBeforeSave: boolean;
    exclude: string[];
    excludeMarker: string | null;
}

export const defaultGeneralConfiguration: GeneralConfiguration = {
    configurationFilePath: './import-sorter.json',
    sortOnBeforeSave: false,
    exclude: [],
    excludeMarker: null
};