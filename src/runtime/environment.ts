import { RuntimeValue } from "./model/values.ts";
import { ErrorRuntime } from "../utils/index.ts";
import { ABS, CEIL, CHOICE, COS, COUNT, EMPTY, FILTER, FLOOR, PI, PROB, RANDOM, ROUND, SIN, SQRT, TAN, createGlobalFunction, MIN, MAX, DIST, SUM, ATAN, FIND_BY_COORDINATES, RGB } from "./functions/index.ts";

export class Environment {

    private parent?: Environment;
    private variables: Map<string, RuntimeValue>;

    constructor(parent?: Environment) {
        this.parent = parent;
        this.variables = new Map();
    }

    /**
     * Declares a new variable in the current environment
     * 
     * @param identifier - identifier of the new variable
     * @param value - value of the new variable
     * @returns value that has been declared
     */
    public declareVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        if (this.variables?.has(identifier)) {
            this.assignVariable(identifier, value);
            return value;
        }

        this.variables.set(identifier, value);
        return value;
    }

    /**
     * Assing an existing variable in the current environment a new value
     * 
     * @param identifier - identifier of the existing variable
     * @param value - value to be reassigned to the existing variable
     * @returns value that has been reassigned
     */
    public assignVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        const env = this.resolve(identifier);

        if (!env) {
            throw new ErrorRuntime(`Variable ${identifier} does not exist`);
        }

        env.variables.set(identifier, value);
        return value;
    }

    /**
     * Retrieves the value of a variable from the current or any of the parent environments by its identifier
     * 
     * @param identifier - identifier of the variable
     * @returns variable value or undefined if not found
     */
    public lookupVariable(identifier: string): RuntimeValue | undefined {
        const env = this.resolve(identifier);

        if (!env) {
            return undefined;
        }

        return env.variables.get(identifier) as RuntimeValue;
    }

    /**
     * Searches the current and all parent environments for a variable by its identifier and returns this environment if found
     * 
     * @param identifier - identifier of the searched variable
     * @returns environment where the variable has been declared
     */
    public resolve(identifier: string): Environment | undefined {
        if (this.variables.has(identifier)) {
            return this;
        }

        if (this.parent === undefined) {
            return undefined;
        }

        return this.parent.resolve(identifier);
    }

    /**
     * Initializes a default global environment with all built-in functions
     * 
     * @returns environment with all built-in functions defined
     */
    public static createGlobalEnvironment(): Environment {
        const environment = new Environment();

        environment.declareVariable("random", createGlobalFunction(RANDOM));
        environment.declareVariable("choice", createGlobalFunction(CHOICE));
        environment.declareVariable("sqrt", createGlobalFunction(SQRT));
        environment.declareVariable("abs", createGlobalFunction(ABS));
        environment.declareVariable("floor", createGlobalFunction(FLOOR));
        environment.declareVariable("ceil", createGlobalFunction(CEIL));
        environment.declareVariable("round", createGlobalFunction(ROUND));
        environment.declareVariable("sin", createGlobalFunction(SIN));
        environment.declareVariable("cos", createGlobalFunction(COS));
        environment.declareVariable("tan", createGlobalFunction(TAN));
        environment.declareVariable("atan", createGlobalFunction(ATAN));
        environment.declareVariable("pi", createGlobalFunction(PI));
        environment.declareVariable("prob", createGlobalFunction(PROB));
        environment.declareVariable("dist", createGlobalFunction(DIST));
        environment.declareVariable("count", createGlobalFunction(COUNT));
        environment.declareVariable("filter", createGlobalFunction(FILTER));
        environment.declareVariable("empty", createGlobalFunction(EMPTY));
        environment.declareVariable("min", createGlobalFunction(MIN));
        environment.declareVariable("max", createGlobalFunction(MAX));
        environment.declareVariable("sum", createGlobalFunction(SUM));
        environment.declareVariable("rgb", createGlobalFunction(RGB));
        environment.declareVariable("find_by_coordinates", createGlobalFunction(FIND_BY_COORDINATES));

        return environment;
    }
}