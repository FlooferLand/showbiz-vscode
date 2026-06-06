import * as vscode from "vscode";
import { drawerBitRegex, mapIdRegex, MappedFixtures, Mapping } from "./extension";

export const DRAWER_BITS = 300

export function toGlobalBit(word: any): number | string {
    if (word.length < 2 || !drawerBitRegex.test(word)) {
        if (typeof(word) == "number") return word
        else return parseInt(word)
    }

    const wordNum = parseInt(word.substring(0, word.length - 2))
    let index = 0
    if (word.endsWith("td")) {
        index = wordNum
    } else if (word.endsWith("bd")) {
        index = wordNum + (DRAWER_BITS / 2)
    }
    return index
}

export function getBitNumsToNames(mappedFixtures: MappedFixtures, mapping: Mapping): Record<string, string> {
    let bitNumToName: Record<string, string> = {}
    Object.entries(mappedFixtures[mapping]).forEach(([fixture, bits]) => {
        Object.entries(bits).forEach(([bitName, bitNum]) => {
            const name = `${fixture}.${bitName}`
            bitNumToName[bitNum.toString()] = name
        })
    })
    return bitNumToName
}

export function getSets(
    document: vscode.TextDocument,
    mappedFixtures: MappedFixtures,
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

        if (fixtureKey != null && (!mappedFixtures[mapKey] || !Object.keys(mappedFixtures[mapKey]).includes(fixtureKey))) {
            warns?.onFixtureWarn(docLine, mapKey, fixtureKey)
        }
        
        sets[mapKey] = fixtureKey
    }
    return sets
}
