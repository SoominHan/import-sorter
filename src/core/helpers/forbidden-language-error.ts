import { allowedLanguages } from "../allowed-languages";

export const forbiddenLanguageError = "Import Sorter currently only supports "
    .concat(
        allowedLanguages
            .map(({ id, fileExtension }) => `${id} .(${fileExtension}) `)
            .join("or ")
    )
    .concat("language files");
