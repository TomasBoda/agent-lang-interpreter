import { readFileSync, writeFileSync } from "node:fs";
import { Interpreter, InterpreterConfiguration, InterpreterOutput, Output } from "../index.ts";
import { exit } from "node:process";

interface ProgramOutput {
    steps: Output[];
}

const outputFile = "./example/output.json";

const filename = "./example/source-code.txt";
const sourceCode = readFileSync(filename, "utf-8");
const config: InterpreterConfiguration = { steps: 10, delay: 200, width: 500, height: 500 };

const interpreter: Interpreter = new Interpreter();
const programOutput: ProgramOutput = { steps: [] };

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    if (output.status.code !== 0 || !output.output) {
        console.log(output.status.message);
        exit(1);
    }

    console.log("Evaluating step " + output.output!.step + "/" + config.steps);

    programOutput.steps.push(output.output!);
    writeFileSync(outputFile, JSON.stringify(programOutput, null, 2));

    if (output.output!.step === config.steps) {
        console.log("-----------------");
        console.log("Finished running");
        console.log("Output has been written to " + outputFile);
        console.log("-----------------");
        exit(0);
    }
});

console.log("-----------------");
console.log("Running AgentLang");
console.log("-----------------");
interpreter.start();