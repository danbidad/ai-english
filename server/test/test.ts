
//https://youtu.be/8WMbEOFD9Rs?list=TLGGP1rDd4eck-ozMDEyMjAyNA

import {readFileSync} from "node:fs";
import path, {dirname} from "node:path";
import {findDifferences} from "../youtube.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const org = readFileSync(path.join(__dirname, "source.txt"), "utf-8");
const modified = readFileSync(path.join(__dirname, "result2.txt"), "utf-8");
let orgTokens1 = org.replaceAll(/\[.*?]/g, '').split('\n')
console.log(orgTokens1.length)
orgTokens1 = orgTokens1.map((line, index) => ('{} ' + line) ).join(' ').split(/[\s]+/)
const modTokens2 = modified.split('\n').map((line, index) => ('<> ' + line) ).join(' ').split(/[!?.,\s]+/)
let markerPos = [];


// 차이점 찾기 실행
const differences = findDifferences(orgTokens1, modTokens2);

for ( let i=markerPos.length-1 ; i>=0 ; i-- ) {
    modTokens2.splice(markerPos[i], 0, `{${i}}`)
}

let final = differences.join(' ').replaceAll('<>', '\r\n')


//console.log(markerPos.length, markerPos)
console.log(final)

//console.log('Found differences:', differences.length, differences);
