import { readFileSync, writeFileSync } from "fs";
import { Lexer } from "./lexer/lexer";
import { Token, TokenType } from "./lexer/lexer.types";
import { Parser } from "./parser/parser";
import { Program } from "./parser/ast.types";

console.log("Welcome to the AgentLang interpreter");
console.log("------------------------------------");

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const lexer = new Lexer(sourceCode);
const tokens: Token[] = lexer.tokenize();

console.log("Tokens");
console.log("------------------------------------");
console.log(tokens);

const parser = new Parser(tokens);
const ast: Program = parser.parse();

const astFile = writeFileSync("ast.json", JSON.stringify(ast), "utf-8");

console.log("Abstract Syntax Tree");
console.log("------------------------------------");
console.log(ast);