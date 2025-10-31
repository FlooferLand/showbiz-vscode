import * as vscode from "vscode";
import * as bitsmap from "./bitsmap";
import * as diagnostics from "./diagnostics";
import { Fixtures, getBits } from "./data";

export type AnyMapping = "any" | Mapping
export type Mapping = "faz" | "rae"
export type Bits = Record<Mapping, Fixtures>

export const mappings = ["rae", "faz"]
export const anyMappings = ["any", ... mappings]
export const fixtureSetRegex = new RegExp(`set (${anyMappings.join("|")})`)
export const bitBlockFixture = new RegExp(`(${anyMappings.join("|")})`)

export async function activate(context: vscode.ExtensionContext) {
    const bits: Bits = {
        "faz": await getBits(context, "faz"),
        "rae": await getBits(context, "rae")
    }
    
    // Diagnostics
    const diagCollection = vscode.languages.createDiagnosticCollection("bitsmap")
    vscode.workspace.onDidOpenTextDocument(document => {
        diagnostics.onDocumentUpdated(document, diagCollection, bits)
    })
    vscode.workspace.onDidSaveTextDocument(document => {
        diagnostics.onDocumentUpdated(document, diagCollection, bits)
    })
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document
        diagnostics.onDocumentUpdated(document, diagCollection, bits)
    })

    // Providing completion for a bunch of things
    vscode.languages.registerCompletionItemProvider("bitsmap", {
        provideCompletionItems(document, position) {
            return bitsmap.complete(bits, document, position)
        }
    })
}

export function deactivate() {}
