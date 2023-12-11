import { Observable, Subject, Subscription, finalize, interval, map, of, take, takeWhile } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { Token } from "../lexer/lexer.types";
import { NodeType, ObjectDeclaration, ParserValue, Program, VariableDeclaration } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { Agent, InterpreterConfiguration, InterpreterOutput } from "./interpreter.types";
import { FunctionCall, NumberValue, RuntimeAgent, RuntimeOutput, RuntimeValue, ValueType } from "../runtime/runtime.types";
import { Environment } from "../runtime/environment";
import { createGlobalFunction } from "../utils/functions";
import { Symbolizer } from "../symbolizer/symbolizer";
import { Symbol } from "../symbolizer/symbolizer.types";
import { ErrorLexer, ErrorModel, ErrorParser, ErrorRuntime } from "../utils/errors";

export class Interpreter {

    private sourceCode: string = "";
    private config: InterpreterConfiguration = { steps: 10000, delay: 20, width: 500, height: 500 };
    private currentStep = 0;
    private dataSubject: Subject<InterpreterOutput> = new Subject();
    private subscription?: Subscription;

    private symbolizer?: Symbolizer;
    private lexer?: Lexer;
    private parser?: Parser;
    private runtime?: Runtime;

    private program?: Program;

    // subscribes to interpreter output
    public get(sourceCode: string, config: InterpreterConfiguration): Observable<InterpreterOutput> {
        this.sourceCode = sourceCode;
        this.config = config;

        // generate source code symbols
        this.symbolizer = new Symbolizer(this.sourceCode);
        const symbols: Symbol[] = this.symbolizer.symbolize();

        // generate source code tokens
        this.lexer = new Lexer(symbols);
        let tokens: Token[];

        try { tokens = this.lexer.tokenize(); } catch (error) {
            return of(this.getRuntimeError(error as ErrorLexer));
        }

        // generate source code abstract syntax tree
        this.parser = new Parser(tokens);
        let program: ParserValue;

        try { program = this.parser.parse(); } catch (error) {
            return of(this.getRuntimeError(error as ErrorParser));
        }

        // save abstract syntax tree
        this.program = program as Program;

        // initialize default global environment
        const environment: Environment = Environment.createGlobalEnvironment();
        environment.declareVariable("width", createGlobalFunction(this.createWidthFunction(this.config.width)));
        environment.declareVariable("height", createGlobalFunction(this.createHeightFunction(this.config.height)));

        // save runtime
        this.runtime = new Runtime(program as Program, environment);

        return this.dataSubject.asObservable();
    }

    // returns current program
    public getProgram(): Program {
        return this.program!;
    }

    // sets new program
    public setProgram(program: Program): void {
        this.program = program;
    }

    // rebuilds current interpreter step
    public rebuild(): void {
        this.runtime?.setProgram(this.program!);
        this.currentStep--;
        this.step();
    }
    
    // starts the interpreter
    public start() {
        this.currentStep = 0;
        this.subscribe();
    }
    
    // resets the interpreter
    public reset() {
        this.unsubscribe();
        this.currentStep = 0;
        this.runtime?.reset();
    }
    
    // pauses the interpreter
    public pause() {
        this.unsubscribe();
    }
    
    // resumes the interpreter
    public resume() {
        this.subscribe();
    }
    
    // steps manually through the interpreter
    public step() {
        if (this.currentStep >= this.config.steps + 1) {
          return;
        }

        this.dataSubject.next(this.getInterpreterOutput(this.currentStep++));
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
        agent.variables.forEach((value, key) => variables[key] = value);
    
        return { identifier: agent.identifier, variables } as Agent;
    }

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