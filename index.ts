import { readFileSync } from "fs";
import { Interpreter, InterpreterConfiguration, InterpreterOutput } from "./src";

class Runner {

    private static DEFAULT_INTERPRETER_CONFIGURATION: InterpreterConfiguration = { steps: 10, delay: 500, width: 500, height: 500 };

    public run(sourceCode: string, configuration: InterpreterConfiguration = Runner.DEFAULT_INTERPRETER_CONFIGURATION): void {
        const interpreter: Interpreter = new Interpreter();

        interpreter.get(sourceCode, configuration).subscribe((output: InterpreterOutput) => {
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
    
                    const maxLength = this.getMaxLength(agent.variables);
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
    }

    private getMaxLength(variables: object) {
        let maxLength = 0;

        for (const [key] of Object.entries(variables)) {
            if (key.toString().length > maxLength) {
                maxLength = key.toString().length;
            }
        }

        return maxLength;
    }
}

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const runner = new Runner();
runner.run(sourceCode);