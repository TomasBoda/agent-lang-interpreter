import { readFileSync } from "fs";
import { RuntimeValue } from "./src/runtime/values";
import { Interpreter, InterpreterConfiguration, Logger } from "./src";

Logger.log("Welcome to the AgentLang interpreter");
Logger.log("------------------------------------");

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const interpreter: Interpreter = new Interpreter(sourceCode);
const config: InterpreterConfiguration = { agents: 10, steps: 10, delay: 500 };

interpreter.run(config).subscribe((result: RuntimeValue) => {
    Logger.log(result);
});