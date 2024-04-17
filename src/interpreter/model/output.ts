import { Agent } from "./agent.ts";
import { ExitStatus } from "./exit-status.ts";

export interface Output {
    step: number;
    agents: Agent[];
}

export interface InterpreterOutput {
    status: ExitStatus;
    output?: Output;
}