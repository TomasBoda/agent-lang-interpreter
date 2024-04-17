
/**
 * Type of the variable declaration
 */
export enum VariableType {
    /** represent an constant value that cannot be changed */
    Const = "const",
    /** represents a variable value that is updated in each evaluation */
    Property = "property"
}