
/**
 * Object representing the interpeter's configuration
 */
export interface InterpreterConfiguration {
    /** number of the simulation steps */
    steps: number;
    /** delay between each step in milliseconds */
    delay: number;
    /** width of the visualisation window */
    width: number;
    /** height of the visualisation window */
    height: number;
}