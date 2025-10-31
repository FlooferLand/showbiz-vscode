import * as vscode from "vscode";
import { bitBlockFixture, Bits, fixtureSetRegex, AnyMapping, anyMappings, Mapping, mappings } from "./extension";
import { Bit, Fixtures } from "./data";

export function getSets(
    document: vscode.TextDocument,
    bits: Bits,
    errs?: {
        onMapError: (line: vscode.TextLine, mapKey: string) => void,
        onFixtureError: (line: vscode.TextLine, mapKey: string, fixtureKey: string) => void
    }
): Record<Mapping, string | null> | null {
    const sets: Record<Mapping, string | null> = {
        rae: null, faz: null,
    }
    for (let i = 0; i < document.lineCount; i++) {
        if (i > anyMappings.length) break
        const docLine = document.lineAt(i)
        const line: string = docLine.text
        if (!line.startsWith("set ")) continue
        const split = line.split(" ")
        if (split.length < 3) continue
        const mapKey: string = split[1]
        const fixtureKey: string = split[2]

        if (!mappings.includes(mapKey)) {
            errs?.onMapError(docLine, mapKey)
            return null
        }

        if (!(fixtureKey in bits[mapKey as Mapping])) {
            errs?.onFixtureError(docLine, mapKey, fixtureKey)
            return null
        }
        sets[mapKey as Mapping] = fixtureKey
    }

    if (Object.values(sets).filter(e => e != null).length > 0) {
        return sets
    }
    return null
}

export function complete(bits: Bits, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const line = document.getText(new vscode.Range(position.with(undefined, 0), position))
    const lineTrim = line.trim()
    const completed: vscode.CompletionItem[] = []

    // Getting whatever fixtures they mapped
    const sets = getSets(document, bits)

    if (line.match(fixtureSetRegex)) {
        // Setting fixtures
        const split = line.split(" ")
        const mapKey = split[1] as Mapping
        Object.keys(bits[mapKey]).forEach(fixtureKey => {
            completed.push({ label: fixtureKey })
        });
    } else if ("set".startsWith(line) || lineTrim.length == 0) {
        // Settings
        completed.push({ label: "set" })
    } else if (line.startsWith("set") || lineTrim.length == 0 || anyMappings.filter(e => e.startsWith(line)).length > 0 ) {
        anyMappings.map(e => {
            return { label: e }
        }).forEach(e => completed.push(e))
    } else if (line.match(bitBlockFixture)) {
        // Bit names for blocks
        const statements = line.split(",")
        let currentStmt = ""
        let stmtStartIndex = 0
        for (const statement of statements) {
            const trimmed = statement.trim()
            const blockEndIndex = stmtStartIndex + statement.length
            if (position.character >= stmtStartIndex && position.character <= blockEndIndex) {
                currentStmt = trimmed
                break
            }
            stmtStartIndex = blockEndIndex + 1
        }

        anyMappings.forEach(anyMap => {
            if (!currentStmt.startsWith(anyMap)) return;
            const mapKey = anyMap as AnyMapping;

            let mappedBits: Bit = {}
            if (mapKey == "any") {
                mappings.forEach(key => {
                    const map = key as Mapping
                    if (sets == null || sets[map] == null) return
                    const bit = bits[map][sets[map]]
                    Object.keys(bit).forEach(bitId => {
                        const bitNum = bit[bitId]
                        mappedBits[bitId] = bitNum
                    });
                });
                if (sets != null) sets["any" as Mapping] = "any"
            } else {
                const key = mapKey as Mapping
                if (sets == null || sets[key] == null) return
                mappedBits = bits[mapKey as Mapping][sets[key]]
            }
            
            Object.keys(mappedBits).forEach(bitKey => {
                const bitNum = mappedBits[bitKey]
                if (sets == null || sets[mapKey as Mapping] == null) return
                if (mapKey != "any") {
                    completed.push({ label: bitKey, detail: `Bit ID '${bitNum}' for ${sets[mapKey as Mapping] ?? "Unknown"}` })
                } else {
                    completed.push({ label: bitKey, detail: `Bit ID '${bitNum}' for any fixture` })
                }
            });
        })
    }

    return completed
}
