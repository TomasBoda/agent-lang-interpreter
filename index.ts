import { readFileSync } from "fs";
import { Interpreter, InterpreterConfiguration, InterpreterOutput, Logger } from "./src";

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

/*
function doSomething(value: number) {
    return value * value;
}

const data: number[] = [];
for (let i = 0; i < 10000; i++) {
    data.push(i + 1);
}
const results: number[] = [];

if (isMainThread) {
    for (let i = 0; i < 100; i++) {
        const worker = new Worker(__filename, {
            workerData: data.slice(i * 100, (i + 1) * 100)
        });

        worker.on("message", (result: number[]) => {
            for (const a of result) {
                results.push(a);
            }

            if (results.length === data.length) {
                console.log('All workers finished. Results:', results);
            }
        });
    }
} else {
    const values = workerData as number[];

    const outputs = [];
    for (let i = 0; i < values.length; i++) {
        const result = doSomething(values[i]);
        outputs.push(result);
    }

    parentPort!.postMessage(outputs);
}
*/