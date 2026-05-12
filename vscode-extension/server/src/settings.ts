import { Connection, DidChangeConfigurationNotification } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface ALangSettings {
	maxNumberOfProblems: number;
}

export const defaultSettings: ALangSettings = { maxNumberOfProblems: 100 };

let hasConfigurationCapability = false;
let globalSettings: ALangSettings = defaultSettings;
const documentSettings: Map<string, Thenable<ALangSettings>> = new Map();

export function setHasConfigurationCapability(value: boolean): void {
	hasConfigurationCapability = value;
}

export function getDocumentSettings(resource: string, connection: Connection): Thenable<ALangSettings> {
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

export function registerSettingsHandlers(
	connection: Connection,
	documents: TextDocuments<TextDocument>,
	onValidate: (doc: TextDocument) => void
): void {
	connection.onDidChangeConfiguration(change => {
		if (hasConfigurationCapability) {
			documentSettings.clear();
		} else {
			globalSettings = <ALangSettings>(
				(change.settings.alangLanguageServer || defaultSettings)
			);
		}
		documents.all().forEach(onValidate);
	});

	documents.onDidClose(e => {
		documentSettings.delete(e.document.uri);
	});
}
