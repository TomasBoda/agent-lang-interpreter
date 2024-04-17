import { Agent } from "./agent.ts";
import { ExitStatus } from "./exit-status.ts";

/**
 * Object representing the output of the simulation
 */
export interface Output {
    /** value of the current step */
    step: number;
    /** list of current agents */
    agents: Agent[];
}

/**
 * Object representing the output of the interpreter
 */
export interface InterpreterOutput {
    /** exit status of the interpreter */
    status: ExitStatus;
    /** output values of the simulation */
    output?: Output;
}