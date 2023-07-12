import { readFileSync } from "fs";
import {Lexer} from "./lexer/lexer";
import {Token, TokenType} from "./lexer/lexer.types";

console.log("Welcome to the AgentLang interpreter");
console.log("------------------------------------");

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const lexer = new Lexer(sourceCode);

const tokens: Token[] = lexer.tokenize();

for (const token of tokens) {
    console.log(token.value + " - " + TokenType[token.type]);
}