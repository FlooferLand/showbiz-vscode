import * as vscode from "vscode";
import { getSets as getActiveFixtures } from "./bitsmap";
import { AnyMapping, anyMappings, Bits, Mapping, mappings } from "./extension";
import { Bit } from "./data";

export const onDocumentUpdated = (document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection, bits: Bits) => {
    const collected: vscode.Diagnostic[] = []
    
    // Checking "set fixtures" line
    const fixtures = getActiveFixtures(
        document,
        bits,
        {
            onMapError(line, mapKey) {
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid map '${mapKey}' (must be of: ${mappings.join(", ")})`
                )
                collected.push(diag)
            },
            onFixtureError(line, mapKey, fixtureKey) {
                const fixtures = bits[mapKey as Mapping]
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid fixture '${fixtureKey}' (must be of: ${Object.keys(fixtures).join(", ")})`
                )
                collected.push(diag)
            }
        }
    )

    // Checking block maps
    for (let i = 0; i < document.lineCount; i++) {
        const docLine = document.lineAt(i)
        if (docLine.isEmptyOrWhitespace) continue
        const line = docLine.text.trim()
        if (anyMappings.filter(m => line.startsWith(m)).length != 1) continue
        const statements = line.split(",")
        statements.forEach(statement => {
            const split = statement.trim().split(" ")
            if (split.length < 2) {
                const diag = new vscode.Diagnostic(
                    docLine.range,
                    `Only one half of the statement is finished`
                )
                collected.push(diag)
                return
            }
            const mapKey = split[0] as AnyMapping
            const bitName = split[1] as string

            if (fixtures == null) return
            if (mapKey != "any") {
                const fixture = fixtures[mapKey]
                if (fixture == null) {
                    const diag = new vscode.Diagnostic(
                        docLine.range,
                        `Couldn't find the fixture '${mapKey}'`
                    )
                    collected.push(diag)
                    return
                }
                if (!(bitName in bits[mapKey][fixture])) {
                    const diag = new vscode.Diagnostic(
                        docLine.range,
                        `Couldn't find the bit '${bitName}' in fixture '${fixture}'`
                    )
                    collected.push(diag)
                    return
                }
            } else {  // Any
                let err: vscode.Diagnostic | null = null
                mappings.forEach(mapping => {
                    const mapKey = mapping as Mapping
                    const fixture = fixtures[mapKey]
                    if (fixture == null) {
                        return
                    }
                    if (!(bitName in bits[mapKey][fixture])) {
                        const diag = new vscode.Diagnostic(
                            docLine.range,
                            `The bit '${bitName}' is missing for the '${fixture}' fixture (${mapKey}).\nMake sure to specify which fixtures you support via \`set\`.`
                        )
                        err = diag
                        return
                    }
                })
                if (err != null) {
                    collected.push(err)
                }
            }
        })
    }
    
    if (collected.length != 0) {
        diagCollection.set(document.uri, collected)
    } else {
        diagCollection.clear()
    }
}
