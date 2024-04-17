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
     * Generates an observable used for retrieving the interpreter's output
     * 
     * @param sourceCode - source code of the simulation
     * @param config - configuration of the interpreter
     * @returns observable holding the interpreter's output
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
            })
        }

        return this.dataSubject.asObservable();
    }

    /**
     * Builds the interpreter and initializes the simulation
     * 
     * @param sourceCode - source code to be initialized and built upon
     * @param config - configuration of the interpreter
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

    public rebuild(): void {
        this.runtime?.setProgram(this.program!);
        this.currentStep--;
        this.step();
    }
    
    public start() {
        this.currentStep = 0;
        this.subscribe();
    }
    
    public reset() {
        this.unsubscribe();
        this.currentStep = 0;
        this.runtime?.reset();
    }
    
    public pause() {
        this.unsubscribe();
    }
    
    public resume() {
        this.subscribe();
    }
    
    public step() {
        if (this.currentStep >= this.config.steps + 1) {
          return;
        }

        this.dataSubject.next(this.getInterpreterOutput(this.currentStep++));
    }

    public getProgram(): Program {
        return this.program!;
    }

    public setProgram(program: Program): void {
        this.program = program;
    }

    public updateAgentValue(agentIndex: number, propertyIdentifier: string, value: number): void {
        this.runtime?.updateAgentValue(agentIndex, propertyIdentifier, value);
    }
    
    private subscribe(): void {
        this.subscription = interval(this.config.delay).pipe(
          takeWhile(() => this.currentStep <= this.config.steps),
        ).subscribe(() => this.dataSubject.next(this.getInterpreterOutput(this.currentStep++)));
    }
    
    private unsubscribe(): void {
        this.subscription?.unsubscribe();
        this.subscription = undefined;
    }

    private getInterpreterOutput(step: number): InterpreterOutput {
        try {
            const value: RuntimeValue = this.runtime!.run(step);
            return this.getRuntimeOutput(value as RuntimeOutput);
        } catch (error) {
            return this.getRuntimeError(error as ErrorRuntime)
        }
    }

    private getRuntimeOutput(output: RuntimeOutput): InterpreterOutput {
        return {
            status: { code: 0 },
            output: {
                step: output.step,
                agents: this.getAgents(output.agents)
            }
        } as InterpreterOutput;
    }

    private getRuntimeError(error: ErrorModel): InterpreterOutput {
        return {
            status: {
                code: 1,
                message: (error as ErrorRuntime).toString()
            }
        };
    }

    private getAgents(agents: RuntimeAgent[]): Agent[] {
        return agents.map((agent: RuntimeAgent) => this.getAgent(agent));
    }

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

    // interpreter's functions initialization

    private createWidthFunction(width: number): FunctionCall {
        function widthFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'width' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: width } as NumberValue;
        }

        return widthFunction;
    }

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