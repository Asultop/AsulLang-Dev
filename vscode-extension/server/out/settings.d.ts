import { Connection } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
export interface ALangSettings {
    maxNumberOfProblems: number;
}
export declare const defaultSettings: ALangSettings;
export declare function setHasConfigurationCapability(value: boolean): void;
export declare function getDocumentSettings(resource: string, connection: Connection): Thenable<ALangSettings>;
export declare function registerSettingsHandlers(connection: Connection, documents: TextDocuments<TextDocument>, onValidate: (doc: TextDocument) => void): void;
