export type CustomOrderRuleType = 'path' | 'importMember';

export interface CustomOrderRule {
    type?: CustomOrderRuleType;
    numberOfEmptyLinesAfterGroup?: number;
    disableSort?: boolean;
    regex: string;
    orderLevel: number;
}