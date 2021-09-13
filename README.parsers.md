# RainMachine weather services (parsers)

## UI Code flow

### Relevant code: 

 [showParsers()](https://github.com/sprinkler/rainmachine-web-ui/blob/next/js/ui-weather-settings.js#L94)

 [updateParsers()](https://github.com/sprinkler/rainmachine-web-ui/blob/next/js/ui-weather-settings.js#L149)

 [showParserDetail()](https://github.com/sprinkler/rainmachine-web-ui/blob/next/js/ui-weather-settings.js#L149)

 [onDownloadAndInstallSource()](https://github.com/sprinkler/rainmachine-web-ui/blob/f64348c4125f99d417e0d114fbc658c875ebac7c/js/ui-weather-settings.js#L394)

### Flow for showing parsers list

1. Retrieve installed parsers: GET /parsers API call
2. Retrieve available community parsers: GET [version-metadata.json](https://raw.githubusercontent.com/sprinkler/rainmachine-developer-resources/master/version-metadata.json)
3. For each of community parser:
   1. Check if name matches any of the installed parsers (retrieved in step 1)
   2. If installed check version installed vs version on metadata

### Flow to install and update a parser

1. Retrieve parser source code: https://raw.githubusercontent.com/sprinkler/rainmachine-developer-resources/master/ + *parser key name from version-metadata.json*    
**Example Url:** https://raw.githubusercontent.com/sprinkler/rainmachine-developer-resources/master/sdk-parsers/RMParserFramework/parsers/cwop-parser.py

2. Construct a ```multipart/form-data``` from parser source code that will be used as data for POST parser/upload API call
3. Add info data: ```extraInfo = {
                    type: "community",
                    version: parser.latestVersion
                };```
4. Send parser data + extraInfo data with POST dev/import/parser API call
5. Refresh parsers list



