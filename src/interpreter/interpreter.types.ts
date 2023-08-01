
export interface InterpreterConfiguration {
    steps: number;
    delay: number;
}

export interface Agent {
    identifier: string;
    variables: Object;
}

export interface InterpreterOutput {
    step: number;
    agents: Agent[];
}