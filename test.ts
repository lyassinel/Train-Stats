import { OfficeParserConfig, parseOfficeAsync } from 'officeparser';

const config: OfficeParserConfig = {
    newlineDelimiter: " ",  // Separate new lines with a space instead of the default \n.
    ignoreNotes: true       // Ignore notes while parsing presentation files like pptx or odp.
}

// relative path is also fine => eg: files/myWorkSheet.ods
parseOfficeAsync("import/FBMZ 2025-06.odt", config)
    .then(data => {
        const newText = data + " look, I can parse a powerpoint file";
        console.log("Parsed text:", newText);
    })
    .catch(err => console.error(err));

// Search for a term in the parsed text.
function searchForTermInOfficeFile(searchterm: string, filepath: string): Promise<boolean> {
    return parseOfficeAsync(filepath)
        .then(data => data.indexOf(searchterm) != -1)
}