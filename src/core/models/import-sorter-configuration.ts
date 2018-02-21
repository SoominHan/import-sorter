import { GeneralConfiguration } from './general-configuration';
import { ImportStringConfiguration } from './import-string-configuration';
import { SortConfiguration } from './sort-configuration';

export interface ImportSorterConfiguration {
    sortConfiguration: SortConfiguration;
    importStringConfiguration: ImportStringConfiguration;
    generalConfiguration: GeneralConfiguration;
}