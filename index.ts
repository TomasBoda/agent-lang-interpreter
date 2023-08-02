import { readFileSync } from "fs";
import { Interpreter, InterpreterConfiguration, Logger } from "./src";
import { InterpreterOutput } from "./src/interpreter/interpreter.types";

// TODO: fix DYNAMIC vs CONSTANT (CONSTANT cannot have identifier, only numbers and booleans)
// TODO: check for agent and variable name repetition during parsing
// TODO: add built-in functions for agents (AGENTS, FILTER, MIN, MAX, ...)

Logger.log("Welcome to the AgentLang interpreter");
Logger.log("------------------------------------");

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const interpreter: Interpreter = new Interpreter();
const config: InterpreterConfiguration = { steps: 10, delay: 10 };

interpreter.interpret(sourceCode, config).subscribe((output: InterpreterOutput) => {
    Logger.log(output.status);
    Logger.log(output.output?.agents[0].variables)
});