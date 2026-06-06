import * as vscode from "vscode";
import * as bitsmap from "./bitsmap";
import * as diagnostics from "./diagnostics";
import { Fixtures, getBits } from "./data";

export type Mapping = string
export type MappedFixtures = Record<Mapping, Fixtures>

export const recommendedMappings = ["rae", "wp5", "faz", "cec"]

export const globalBitRegex = /[0-9]+/
export const drawerBitRegex = /[0-9]+(td|bd)/
export const mapIdRegex = /[a-zA-Z]+/
export const fixtureSetRegex = /set\s[a-zA-Z]+\s/
export const bitBlockStartBuilder = (fixtures: string[]) =>
    new RegExp(String.raw`(any|${fixtures.join('|')})\s`)

export async function activate(context: vscode.ExtensionContext) {
    const mappedFixtures: MappedFixtures = {
        "faz": await getBits(context, "faz"),
        "rae": await getBits(context, "rae")
    }
    
    // Diagnostics
    const diagCollection = vscode.languages.createDiagnosticCollection("bitsmap")
    vscode.workspace.onDidOpenTextDocument(document => {
        diagnostics.onDocumentUpdated(document, diagCollection, mappedFixtures)
    })
    vscode.workspace.onDidSaveTextDocument(document => {
        diagnostics.onDocumentUpdated(document, diagCollection, mappedFixtures)
    })
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document
        diagnostics.onDocumentUpdated(document, diagCollection, mappedFixtures)
    })

    // Providing completion for a bunch of things
    vscode.languages.registerCompletionItemProvider(
        { scheme: "file", language: "bitsmap" },
        {
            provideCompletionItems(document, position) {
                return bitsmap.complete(mappedFixtures, document, position)
            }
        },
        " "
    )

    // Hover info
    vscode.languages.registerHoverProvider(
        { scheme: "file", language: "bitsmap" },
        {
            provideHover(document, position) {
                return bitsmap.hover(mappedFixtures, document, position)
            }
        },
    )
}

export function deactivate() {}
