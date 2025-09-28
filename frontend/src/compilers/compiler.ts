export interface RunResult{
    output : any;
    logs : string[];
}

export function get_compiler(language: string): Compiler {
    switch (language.toLowerCase()) {
        case 'javascript':
            return new JavaScript();
        case 'python':
            return new Python();
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

abstract class Compiler {
    /**
     * Abstract method to run code.
     * @param code - The code to execute.
     * @param args - Optional arguments to pass to the code.
     * @returns An object of type `any`.
     */
    abstract run(code: string, func : string, args?: any): Promise<RunResult>;
}

class JavaScript extends Compiler {
  async run(code: string, func: string, args: any): Promise<RunResult> {
    return new Promise((resolve) => {
            // Use bundler-friendly worker URL to avoid 404s
            const worker = new Worker(new URL('./jsworker.js', import.meta.url));

      // Set a 1-second timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve({
          output: null,
          logs: ["Error: Execution timed out after 1000ms"]
        });
      }, 1000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data);
        worker.terminate();
      };

      worker.postMessage({ code, func, args });
    });
  }
}


class Python extends Compiler {
    async run(code: string, func: string, args?: any): Promise<RunResult> {
        if (typeof window === 'undefined') {
            throw new Error('Python sandbox can only run in the browser (client-side)');
        }

        // Lazy-load Pyodide once
        const ensurePyodide = async () => {
            const w = window as any;
            if (w.__pyodide) return w.__pyodide;
            if (!w.__pyodideLoading) {
                w.__pyodideLoading = new Promise(async (resolve, reject) => {
                    try {
                        await new Promise<void>((res, rej) => {
                            const script = document.createElement('script');
                            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
                            script.onload = () => res();
                            script.onerror = rej;
                            document.head.appendChild(script);
                        });
                        const pyodide = await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
                        w.__pyodide = pyodide;
                        resolve(pyodide);
                    } catch (e) { reject(e); }
                });
            }
            return w.__pyodideLoading;
        };

        const pyodide = await ensurePyodide();

        // Prepare environment and capture stdout/stderr. Use exec to evaluate user code safely.
        try {
            pyodide.globals.set('__user_code', code);
            pyodide.globals.set('__js_args', args || []);
            const jsonStr: string = await pyodide.runPythonAsync(`
import sys, io, json
__ns = {}
__buf = io.StringIO()
__old_out, __old_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = __buf, __buf
__compile_err = None
try:
    exec(__user_code, __ns)
except Exception as e:
    __compile_err = str(e)
__func = __ns.get('${func}')
__result = None
__call_err = None
try:
    if callable(__func):
        __result = __func(*__js_args)
    else:
        __call_err = 'Function not found'
except Exception as e:
    __call_err = str(e)
__out = __buf.getvalue()
sys.stdout, sys.stderr = __old_out, __old_err
json.dumps({'result': __result, 'stdout': __out, 'compile_error': __compile_err, 'call_error': __call_err})
            `);

            let parsed: any;
            try { parsed = JSON.parse(jsonStr); } catch { parsed = { result: null, stdout: '', compile_error: 'Invalid JSON', call_error: null }; }
            const logs: string[] = [];
            if (parsed.stdout) {
                // split into lines while keeping content
                parsed.stdout.split(/\r?\n/).forEach((line: string) => { if (line.length) logs.push(line); });
            }
            if (parsed.compile_error) logs.push(`Compile error: ${parsed.compile_error}`);
            if (parsed.call_error) logs.push(`Runtime error: ${parsed.call_error}`);
            return { output: parsed.result, logs };
        } catch (e: any) {
            return { output: null, logs: [String(e?.message || e)] };
        } finally {
            try { pyodide.globals.del('__user_code'); } catch {}
            try { pyodide.globals.del('__js_args'); } catch {}
        }
    }
}
