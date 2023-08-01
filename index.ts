import { readFileSync } from "fs";
import { Interpreter, InterpreterConfiguration, Logger } from "./src";
import { InterpreterOutput } from "./src/interpreter/interpreter.types";

// TODO: check for agent and variable name repetition during parsing
// TODO: add built-in functions (RANDOM, FILTER, AGENTS, ...)

Logger.log("Welcome to the AgentLang interpreter");
Logger.log("------------------------------------");

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const interpreter: Interpreter = new Interpreter(sourceCode);
const config: InterpreterConfiguration = { steps: 20, delay: 1000 };

function printInterpreterOutput(output: InterpreterOutput): void {
    for (const agent of output.agents) {
        console.log(agent.identifier + " (" + agent.id + ")");

        agent.variables.forEach((value, key) => {
            console.log("    " + key + " = " + value);
        });
    }
}

interpreter.interpret(config).subscribe((output: InterpreterOutput) => {
    Logger.log("Step " + output.step);
    Logger.log("--------------------------");
    printInterpreterOutput(output);
    Logger.log("");
});