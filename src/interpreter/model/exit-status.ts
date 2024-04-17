
/**
 * Object representing the exit status of the interpreter's output
 */
export interface ExitStatus {
    /** exit code number */
    code: number;
    /** exit status message */
    message?: string;
}