import * as vscode from "vscode";
import { bitBlockStartBuilder, MappedFixtures, fixtureSetRegex, mapIdRegex, Mapping, drawerBitRegex } from "./extension";
import { Bits, Fixtures } from "./data";
import { DRAWER_BITS, getBitNumsToNames, getSets, toGlobalBit } from "./utils";

export function complete(mappedFixtures: MappedFixtures, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const line = document.getText(new vscode.Range(position.with(undefined, 0), position))
    const wordRange = document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position)
    const lineTrim = line.trim()
    const completed: vscode.CompletionItem[] = []

    // Getting whatever fixtures they mapped
    const sets = getSets(document, mappedFixtures)
    const mappings = Object.keys(sets)
    const bitBlockStart = bitBlockStartBuilder(mappings)

    if (line.match(fixtureSetRegex)) {
        // Setting fixtures
        const split = line.split(" ")
        const mapKey = split[1]
        const fixtures = mappedFixtures[mapKey]
        Object.keys(fixtures).forEach(fixtureKey => {
            completed.push({ label: fixtureKey, detail: `The '${fixtureKey}' fixture` })
        });
    } else if ("set".startsWith(line) || lineTrim.length == 0) {
        // Settings
        completed.push({ label: "set", detail: "Name a fixture" })
        mappings.forEach(mapping => completed.push({ label: mapping, detail: `Start a ${mapping} block` }))
    } else if (line.match(bitBlockStart)) {
        // Skipping bit name completion for {
        if (line.endsWith(' ') && line.split(' ').length == 3) {
            return completed
        }

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

        mappings.forEach(mapKey => {
            if (!currentStmt.startsWith(mapKey)) return;

            let mappedBits: Bits = {}
            let fixtureBackup: Record<string, string> = {}
            if (mapKey == "any") {
                mappings.forEach(map => {
                    const bitName = sets[map]
                    if (bitName == null) return
                    const fixtures = mappedFixtures[map]
                    const bits = fixtures[bitName]
                    Object.keys(bits).forEach(bitId => {
                        const bitNum = bits[bitId]
                        mappedBits[bitId] = bitNum
                    });
                });
                sets["any"] = "any"
            } if (sets[mapKey] != null) {
                const fixture = sets[mapKey]
                mappedBits = mappedFixtures[mapKey][fixture]
            } else if (mappings.length != 0) {
                // Adding every single bit
                // TODO: Should probably bake this and reference it from extension.ts
                Object.entries(mappedFixtures[mapKey]).forEach(([fixture, bits]) => {
                    Object.entries(bits).forEach(([bitName, bitNum]) => {
                        const name = `${fixture}.${bitName}`
                        mappedBits[name] = bitNum
                        fixtureBackup[name] = fixture
                    })
                })
            } else {
                // No bitchart found
                for (let i = 0; i < DRAWER_BITS; i++) {
                    mappedBits[i.toString()] = i
                }
            }
            
            var entries = Object.entries(mappedBits)
            entries.sort((a, b) => a[1] - b[1])
            entries.forEach(([bitName, bitNum]) => {
                const fixtureName = (mapKey == "any") ? "any fixture" : fixtureBackup[bitName] ?? sets[mapKey] ?? "an unknown fixture"
                completed.push({
                    label: bitName,
                    detail: `Bit ID '${bitNum}' for ${fixtureName}`,
                    insertText: bitNum.toString(),
                    filterText: `${bitName} ${bitNum}`,
                    sortText: bitNum.toString().padStart(10, '0'),
                    range: wordRange
                })
            });
        })
    }

    return completed
}

export function hover(mappedFixtures: MappedFixtures, document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position)
    const prevRange = document.getWordRangeAtPosition(new vscode.Position(range.start.line, range.start.character - 1))
    if (prevRange == undefined) return null

    const word = document.getText(range)
    const prevWord = document.getText(prevRange)

    const sets = getSets(document, mappedFixtures)
    const mappings = Object.keys(sets)

    // Making sure it's on a bit statement
    if (mappings.includes(prevWord)) {
        const mapping = prevWord
        const fixtureName = sets[mapping]
        
        // Named bit
        if (fixtureName != null && mappedFixtures[mapping] != undefined) {
            const fixture = mappedFixtures[mapping][fixtureName]
            if (fixture != undefined) {
                const bitNum = fixture[word]
                if (bitNum != undefined) return new vscode.Hover(`\`${fixtureName}.${bitNum}\``)
            }
        }

        // TODO: Should probably bake this and reference it from extension.ts
        const bitNumsToNames = getBitNumsToNames(mappedFixtures, mapping)

        // Direct bit number
        if (Object.keys(bitNumsToNames).includes(word)) {
            return new vscode.Hover(`Matching \`${bitNumsToNames[word]}\``)
        }

        // TD / BD bit number
        if (word.length > 2 && drawerBitRegex.test(word)) {
            const index = toGlobalBit(word)
            if (Object.keys(bitNumsToNames).includes(index.toString())) {
                return new vscode.Hover(`Matching \`${bitNumsToNames[index.toString()]}\` (Global bit ${index})`)
            } else {
                return new vscode.Hover(`Matching \`${index.toString()}\``)
            }
        }

        // uhh
        return new vscode.Hover(`Bit with number or name '${word}' doesn't exist`)
    } else if (prevWord == "any") {
        let markdown = "Matching:\n"
        mappings.forEach(mapping => {
            const bitNumsToNames = getBitNumsToNames(mappedFixtures, mapping)
            const fixture = sets[mapping]
            const globalBit = toGlobalBit(word)
            const bit = bitNumsToNames[globalBit] ?? globalBit
            if (fixture)
                markdown += `- \`${mapping}.${fixture}.${bit}\`\n`
            else
                markdown += `- \`${mapping}.${bit}\`\n`
        })
        return new vscode.Hover(markdown)
    }

    return null
}

