import { readFileSync } from "node:fs";
import commandLineArgs from "command-line-args";
import { InterpreterConfiguration } from "../src/index.ts";
import { Logger } from "./logger.ts";
import { Process } from "./process.ts";

interface Data {
    sourceCode: string;
    outputFile: string;
    config: InterpreterConfiguration;
    debug: boolean;
    compact: boolean;
}

export class Parser {

    public static DEFAULT_CONFIG: InterpreterConfiguration = { steps: 10, delay: 200, width: 500, height: 500 };
    public static DEFAULT_OUTPUT_FILE = "output.json";

    private static OPTIONS = [
        { name: "in", alias: "i", type: String },
        { name: "out", alias: "o", type: String },
        { name: "steps", alias: "s", type: Number },
        { name: "delay", alias: "d", type: Number },
        { name: "width", alias: "w", type: Number },
        { name: "height", alias: "h", type: Number },
        { name: "debug", type: Boolean },
        { name: "compact", type: Boolean },
        { name: "help", type: Boolean }
    ];

    static async initialize(): Promise<Data> {
        const options = commandLineArgs(Parser.OPTIONS);

        if (options.help !== undefined) {
            Parser.help();
            Process.exit(0, false);
        }

        let inputFile: string;
        let outputFile = this.DEFAULT_OUTPUT_FILE;
        let config = Parser.DEFAULT_CONFIG;
        let debug = false;
        let compact = false;

        if (options.in === undefined) {
            Logger.error("--input file was not provided");
            Process.exit(1);
        }
        
        inputFile = options.in;

        if (options.out === undefined) {
            Logger.warn(`--output file was not provided, using default value ${outputFile}`);
        } else {
            outputFile = options.out;
        }

        if (options.steps === undefined || isNaN(options.steps)) {
            Logger.warn(`--steps was not provided, using default value ${config.steps}`);
        } else {
            config.steps = options.steps;
        }

        if (options.delay === undefined || isNaN(options.delay)) {
            Logger.warn(`--delay was not provided, using default value ${config.delay}`);
        } else {
            config.delay = options.delay;
        }

        if (options.width === undefined || isNaN(options.width)) {
            Logger.warn(`--width was not provided, using default value ${config.width}`);
        } else {
            config.width = options.width;
        }

        if (options.height === undefined || isNaN(options.height)) {
            Logger.warn(`--height was not provided, using default value ${config.height}`);
        } else {
            config.height = options.height;
        }

        if (options.debug !== undefined) {
            debug = options.debug;
        }

        if (options.compact !== undefined) {
            compact = options.compact;
        }

        let sourceCode = Parser.getSourceCode(inputFile);
        await Parser.createOutputFile(outputFile);

        return { sourceCode, outputFile, config, debug, compact };
    }

    private static getSourceCode(filename: string): string {
        let sourceCode = "";

        try {
            sourceCode = readFileSync(filename, "utf-8");
        } catch (e) {
            Logger.error("--input file does not exist");
            Process.exit(1);
        }

        return sourceCode;
    }

    private static async createOutputFile(filename: string): Promise<void> {
        try {
            readFileSync(filename, "utf-8");
        } catch (e) {
            // @ts-ignore
            await Deno.create(filename);
        }
    }

    private static help(): void {
        console.log("AgentLang");
        console.log("----------------------------");
        console.log("%cInterprets AgentLang source code and stores it into an output file as JSON.", "color: rgb(190, 190, 190)");

        console.log();

        console.log("Options");
        console.log("----------------------------");

        console.log("--in, -i [file]");
        console.log("   %cspecifies the path to the source code input file", "color: rgb(190, 190, 190);");

        console.log();

        console.log("--out, -o [file]");
        console.log("   %cspecifies the path to the output file", "color: rgb(190, 190, 190);");
        console.log("   [default: output.json]");

        console.log();

        console.log("--steps, -s [number]");
        console.log("   %cspecifies the number of steps to evaluate", "color: rgb(190, 190, 190);");
        console.log("   [default: 10]");

        console.log();

        console.log("--delay, -d [number]");
        console.log("   %cspecifies the delay in milliseconds between each step", "color: rgb(190, 190, 190);");
        console.log("   [default: 200]");

        console.log();

        console.log("--width, -w [number]");
        console.log("   %cspecifies the width of the simulation bounds in pixels", "color: rgb(190, 190, 190);");
        console.log("   [default: 500]");

        console.log();

        console.log("--height, -h [number]");
        console.log("   %cspecifies the height of the simulation bounds in pixels", "color: rgb(190, 190, 190);");
        console.log("   [default: 500]");

        console.log();

        console.log("--debug [flag]");
        console.log("   whether to print the debug information to the user");
        console.log("   [default: false]");

        console.log();

        console.log("--compact [flag]");
        console.log("   whether to store the output JSON in compact mode");
        console.log("   [default: false]");
    }
}
