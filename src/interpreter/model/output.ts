import { Agent } from "./agent";
import { ExitStatus } from "./exit-status";

export interface Output {
    step: number;
    agents: Agent[];
}

export interface InterpreterOutput {
    status: ExitStatus;
    output?: Output;
}