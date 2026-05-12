"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSettings = void 0;
exports.setHasConfigurationCapability = setHasConfigurationCapability;
exports.getDocumentSettings = getDocumentSettings;
exports.registerSettingsHandlers = registerSettingsHandlers;
exports.defaultSettings = { maxNumberOfProblems: 100 };
let hasConfigurationCapability = false;
let globalSettings = exports.defaultSettings;
const documentSettings = new Map();
function setHasConfigurationCapability(value) {
    hasConfigurationCapability = value;
}
function getDocumentSettings(resource, connection) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'alangLanguageServer'
        });
        documentSettings.set(resource, result);
    }
    return result;
}
function registerSettingsHandlers(connection, documents, onValidate) {
    connection.onDidChangeConfiguration(change => {
        if (hasConfigurationCapability) {
            documentSettings.clear();
        }
        else {
            globalSettings = ((change.settings.alangLanguageServer || exports.defaultSettings));
        }
        documents.all().forEach(onValidate);
    });
    documents.onDidClose(e => {
        documentSettings.delete(e.document.uri);
    });
}
//# sourceMappingURL=settings.js.map