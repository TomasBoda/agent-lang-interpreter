import { Agent } from "./agent";
import { ExitStatus } from "./exit-status";

export interface InterpreterOutput {
    status: ExitStatus;
    output?: {
        step: number;
        agents: Agent[];
    };
}