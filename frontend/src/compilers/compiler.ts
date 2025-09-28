abstract class Compiler {
    /**
     * Abstract method to run code.
     * @param code - The code to execute.
     * @param args - Optional arguments to pass to the code.
     * @returns An object of type `any`.
     */
    abstract run(code: string, args?: any[]): any;
}

class JavaScript extends Compiler{
    run(code: string, args?: any[]) {
        
    }
    
}

class Python extends Compiler{
    run(code: string, args?: any[]) {
        
    }

}