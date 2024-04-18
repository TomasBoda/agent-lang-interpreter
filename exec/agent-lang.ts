import { writeFileSync } from "node:fs";
import { Interpreter, InterpreterOutput, Output } from "../index.ts";
import { Logger } from "./logger.ts";
import { Parser } from "./parser.ts";
import { Process } from "./process.ts";
import { performance } from "node:perf_hooks";
import { Performance } from "./performance.ts";

interface ProgramOutput {
    steps: Output[];
}

// @ts-ignore
const { sourceCode, outputFile, config, debug, compact } = await Parser.initialize();

const interpreter: Interpreter = new Interpreter();
const programOtput: ProgramOutput = { steps: [] };

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    if (output.status.code !== 0 || !output.output) {
        Logger.error(output.status.message ?? "Unknown");
        Process.exit(output.status.code);
    }

    if (debug) {
        Performance.now();
        const elapsed = Performance.lastElapsed();
        const delay = config.delay;

        const step = output.output!.step;
        const steps = config.steps;

        Logger.info(`Evaluating step ${step}/${steps} (${elapsed}ms) (${Performance.slowdown(delay, elapsed)}x slowdown)`);
    }

    programOtput.steps.push(output.output!);

    if (output.output!.step === config.steps) {
        Performance.now();
        const elapsed = Performance.allElapsed();

        const actualTime = Performance.allElapsed(Performance.milliseconds);
        const expectedTime = config.steps * config.delay;
        
        Logger.info(`Finished running (${elapsed}s) (${Performance.slowdown(expectedTime, actualTime)}x slowdown)`);

        if (compact) {
            writeFileSync(outputFile, JSON.stringify(programOtput));
        } else {
            writeFileSync(outputFile, JSON.stringify(programOtput, null, 2));
        }
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

Performance.now();
interpreter.start();