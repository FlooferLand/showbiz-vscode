import * as vscode from "vscode";
import { mapIdRegex, MappedFixtures, Mapping } from "./extension";

export const DRAWER_BITS = 300

export function getSets(
    document: vscode.TextDocument,
    bits: MappedFixtures,
    errs?: {
        onMapError: (line: vscode.TextLine, mapKey: string) => void,
        onFixtureError: (line: vscode.TextLine, mapKey: string, fixtureKey: string | null) => void
    },
    warns?: {
        onFixtureWarn: (line: vscode.TextLine, mapKey: string, fixtureKey: string | null) => void
    }
): Record<Mapping, string | null> {
    const sets: Record<Mapping, string | null> = {}
    for (let i = 0; i < document.lineCount; i++) {
        const docLine = document.lineAt(i)
        const line: string = docLine.text
        if (!line.startsWith("set ")) continue
        const split = line.split(" ")
        if (split.length < 2) continue
        const mapKey: string = split[1]
        const fixtureKey: string | null = split.at(2) ?? null

        if (!mapIdRegex.test(mapKey)) {
            errs?.onMapError(docLine, mapKey)
            return {}
        }

        if (fixtureKey != null && !(fixtureKey in bits[mapKey])) {
            warns?.onFixtureWarn(docLine, mapKey, fixtureKey)
        }
        
        sets[mapKey] = fixtureKey
    }
    return sets
}
