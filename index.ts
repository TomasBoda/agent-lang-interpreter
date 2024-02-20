import { readFileSync, writeFileSync } from "fs";
import { Interpreter, InterpreterConfiguration, InterpreterOutput, Logger, Symbolizer, Symbol, Lexer, Token, Parser, Program } from "./src";

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

function run() {
    Logger.log("Welcome to the AgentLang interpreter");
    Logger.log("------------------------------------");

    const interpreter: Interpreter = new Interpreter();
    const config: InterpreterConfiguration = { steps: 10, delay: 500, width: 400, height: 400 };

    interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
        if (output.status.code !== 0) {
            console.log(output.status);
        } else {
            console.log("---------------------------------");
            console.log("| Step", output.output?.step);
            console.log("---------------------------------");

            for (const agent of output.output?.agents ?? []) {
                console.log("   ------------------------------");
                console.log("   | " + agent.identifier);
                console.log("   ------------------------------");

                const maxLength = getMaxLength(agent.variables);
                const offset = 10;
                
                for (const [key, value] of Object.entries(agent.variables)) {
                    process.stdout.write("   | " + key);
                    for (let i = 0; i < maxLength - key.toString().length + offset; i++) {
                        process.stdout.write(" ");
                    }
                    process.stdout.write("   " + value.value.toString());
                    process.stdout.write("   \n");
                }

                console.log("   ------------------------------");
            }
        }
    });

    interpreter.start();

    function getMaxLength(variables: object) {
        let maxLength = 0;

        for (const [key, value] of Object.entries(variables)) {
            if (key.toString().length > maxLength) {
                maxLength = key.toString().length;
            }
        }

        return maxLength;
    }
}

run();