import { writeFileSync } from "node:fs";
import { Interpreter, InterpreterOutput, Output } from "../index.ts";
import { Logger } from "./logger.ts";
import { Parser } from "./parser.ts";
import { Process } from "./process.ts";
import { performance } from "node:perf_hooks";

interface ProgramOutput {
    steps: Output[];
}

let startTime = 0;
let endTime = 0;

// @ts-ignore
const { sourceCode, outputFile, config, debug } = await Parser.initialize();

const interpreter: Interpreter = new Interpreter();
const programOtput: ProgramOutput = { steps: [] };

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    if (output.status.code !== 0 || !output.output) {
        Logger.error(output.status.message ?? "Unknown");
        Process.exit(output.status.code);
    }

    if (debug) {
        Logger.info(`Evaluating step ${output.output!.step}`);
    }

    programOtput.steps.push(output.output!);
    writeFileSync(outputFile, JSON.stringify(programOtput));

    if (output.output!.step === config.steps) {
        endTime = performance.now();
        const seconds = (endTime - startTime) / 1000;
        const elapsedTime = Math.round(seconds * 100) / 100;
        
        Logger.info(`Finished running (${elapsedTime}s)`);
        Logger.done(`Output has been written to ${outputFile}`);
        Process.exit(0);
    }
});

if (debug) {
    Logger.info("--debug mode is on");
}

Logger.info("-----------------");
Logger.info("Running AgentLang");
Logger.info("-----------------");

startTime = performance.now();
interpreter.start();