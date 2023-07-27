import { readFileSync, writeFileSync } from "fs";
import { Lexer } from "./lexer/lexer";
import { Token } from "./lexer/lexer.types";
import { Parser } from "./parser/parser";
import { Program } from "./parser/ast.types";
import { Interpreter } from "./runtime/interpreter";
import { BooleanValue, NullValue, RuntimeValue } from "./runtime/values";
import { Environment } from "./runtime/environment";

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

writeFileSync("ast.json", JSON.stringify(ast), "utf-8");

console.log("Abstract Syntax Tree");
console.log("------------------------------------");
console.log(ast);

const env: Environment = new Environment();
env.declareVariable("NULL", { type: "null", value: null } as NullValue);
env.declareVariable("TRUE", { type: "boolean", value: true } as BooleanValue);
env.declareVariable("FALSE", { type: "boolean", value: false } as BooleanValue);

const interpreter = new Interpreter(ast);
const result: RuntimeValue = interpreter.interpret(env);

console.log("Result");
console.log("------------------------------------");
console.log(result);