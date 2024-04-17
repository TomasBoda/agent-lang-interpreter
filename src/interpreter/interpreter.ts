import { Observable, Subject, Subscription, interval, of, takeWhile } from "rxjs";
import { Symbol, Symbolizer } from "../symbolizer/index.ts";
import { Lexer, Token } from "../lexer/index.ts";
import { Parser, Program, Topology } from "../parser/index.ts";
import { Runtime, Environment, FunctionCall, NumberValue, RuntimeAgent, RuntimeOutput, RuntimeValue, ValueType, createGlobalFunction, normalizeNumber } from "../runtime/index.ts";
import { Agent, InterpreterConfiguration, InterpreterOutput } from "./model/index.ts";
import { ErrorModel, ErrorRuntime } from "../utils/index.ts";
import { Validation } from "../parser/validation.ts";

export class Interpreter {

    private sourceCode: string = "";
    private config: InterpreterConfiguration = { steps: 10000, delay: 20, width: 500, height: 500 };
    private currentStep = 0;
    
    private dataSubject: Subject<InterpreterOutput> = new Subject();
    private subscription?: Subscription;

    private symbolizer?: Symbolizer;
    private lexer?: Lexer;
    private parser?: Parser;
    private topology?: Topology;
    private runtime?: Runtime;

    private program?: Program;

    /**
     * Returns an observable emitting interpreter's output on each step
     * 
     * @param sourceCode source code of the simulation
     * @param config configuration of the interpreter
     * @returns observable holding the interpreter's output subscription
     */
    public get(sourceCode: string, config: InterpreterConfiguration): Observable<InterpreterOutput> {
        try {
            this.build(sourceCode, config);
        } catch (error) {
            return of({
                status: {
                    code: 1,
                    message: (error as ErrorModel).toString()
                }
            });
        }

        return this.dataSubject.asObservable();
    }

    /**
     * Builds the interpreter and initializes the simulation
     * 
     * @param sourceCode source code to be initialized and built
     * @param config configuration of the interpreter
     */
    public build(sourceCode: string, config: InterpreterConfiguration): void {
        this.sourceCode = sourceCode;
        this.config = config;

        this.symbolizer = new Symbolizer(this.sourceCode);
        const symbols: Symbol[] = this.symbolizer.symbolize();

        this.lexer = new Lexer(symbols);
        let tokens: Token[] = this.lexer.tokenize();

        this.parser = new Parser(tokens);
        let program: Program = this.parser.parse();

        Validation.validate(program);

        this.topology = new Topology();
        let sortedProgram: Program = this.topology.getSortedProgram(program);

        this.program = sortedProgram;

        const environment: Environment = Environment.createGlobalEnvironment();
        environment.declareVariable("width", createGlobalFunction(this.createWidthFunction(this.config.width)));
        environment.declareVariable("height", createGlobalFunction(this.createHeightFunction(this.config.height)));

        this.runtime = new Runtime(this.program, environment);

        this.reset();
    }

    /**
     * Rebuilds the interpreter
     */
    public rebuild(): void {
        this.runtime?.setProgram(this.program!);
        this.currentStep--;
        this.step();
    }
    
    /**
     * Starts the interpreter
     */
    public start(): void {
        this.currentStep = 0;
        this.subscribe();
    }
    
    /**
     * Resets the interpreter
     */
    public reset(): void {
        this.unsubscribe();
        this.currentStep = 0;
        this.runtime?.reset();
    }
    
    /**
     * Pauses the interpreter
     */
    public pause(): void {
        this.unsubscribe();
    }
    
    /**
     * Resumes the interpreter
     */
    public resume(): void {
        this.subscribe();
    }
    
    /**
     * Steps through the interpreter, performs one step
     */
    public step(): void {
        if (this.currentStep >= this.config.steps + 1) {
          return;
        }

        this.dataSubject.next(this.getInterpreterOutput(this.currentStep++));
    }

    /**
     * Returns the parsed program AST node
     * 
     * @returns program AST node
     */
    public getProgram(): Program {
        return this.program!;
    }

    /**
     * Updates the program AST node in the interpreter
     * 
     * @param program new program AST node
     */
    public setProgram(program: Program): void {
        this.program = program;
    }

    /**
     * Updates an agent's value in the simulation
     * 
     * @param agentIndex index of the agent to update
     * @param propertyIdentifier identifier of the agent's property to update
     * @param value new value to update
     */
    public updateAgentValue(agentIndex: number, propertyIdentifier: string, value: number): void {
        this.runtime?.updateAgentValue(agentIndex, propertyIdentifier, value);
    }
    
    /**
     * Subscribes to the interpreter's runtime changes
     */
    private subscribe(): void {
        this.subscription = interval(this.config.delay).pipe(
          takeWhile(() => this.currentStep <= this.config.steps),
        ).subscribe(() => this.dataSubject.next(this.getInterpreterOutput(this.currentStep++)));
    }
    
    /**
     * Unsubscribes from the interpreter's runtime changes
     */
    private unsubscribe(): void {
        this.subscription?.unsubscribe();
        this.subscription = undefined;
    }

    /**
     * Returns the output of the interpreter's runtime of the given step
     * 
     * @param step step to evaluate
     * @returns output of the interpreter's runtime
     */
    private getInterpreterOutput(step: number): InterpreterOutput {
        try {
            const value: RuntimeValue = this.runtime!.run(step);
            return this.getRuntimeOutput(value as RuntimeOutput);
        } catch (error) {
            return this.getRuntimeError(error as ErrorRuntime)
        }
    }

    /**
     * Maps the runtime output to the interpreter output
     * 
     * @param output output of the runtime
     * @returns output of the interpreter
     */
    private getRuntimeOutput(output: RuntimeOutput): InterpreterOutput {
        return {
            status: { code: 0 },
            output: {
                step: output.step,
                agents: this.getAgents(output.agents)
            }
        } as InterpreterOutput;
    }

    /**
     * Maps the runtime error to the interpreter output
     * 
     * @param error error of the runtime
     * @returns output of the interpreter
     */
    private getRuntimeError(error: ErrorModel): InterpreterOutput {
        return {
            status: {
                code: 1,
                message: (error as ErrorRuntime).toString()
            }
        };
    }

    /**
     * Maps the runtime agent list to the output agent list
     * 
     * @param agents list of runtime agents
     * @returns list of output agents
     */
    private getAgents(agents: RuntimeAgent[]): Agent[] {
        return agents.map((agent: RuntimeAgent) => this.getAgent(agent));
    }

    /**
     * Maps the runtime agent to the output agents
     * 
     * @param agent runtime agent
     * @returns output agent
     */
    private getAgent(agent: RuntimeAgent): Agent {
        const variables: { [key: string]: RuntimeValue } = {};
        agent.variables.forEach((value, key) => {
            if (value.type === ValueType.Number) {
                (value as NumberValue).value = normalizeNumber((value as NumberValue).value);
            }

            variables[key] = value;
        });
    
        return { identifier: agent.identifier, variables } as Agent;
    }

    /**
     * Creates the global width function
     * 
     * @param width numeric width value
     * @returns runtime function call
     */
    private createWidthFunction(width: number): FunctionCall {
        function widthFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'width' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: width } as NumberValue;
        }

        return widthFunction;
    }

    /**
     * Creates the global height function
     * 
     * @param height numeric height value
     * @returns runtime function call
     */
    private createHeightFunction(height: number): FunctionCall {
        function heightFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'height' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: height } as NumberValue;
        }

        return heightFunction;
    }
}