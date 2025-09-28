// js-worker.js
self.onmessage = async (e) => {
  const { code, func, args } = e.data;
  const logs = [];

  // Override console.log
  const originalConsoleLog = console.log;
  console.log = (...messages) => {
    logs.push(messages.map(m => m?.toString() ?? '').join(' '));
    originalConsoleLog(...messages);
  };

  try {
    // Attach user function(s) to self
    // This assumes the user code defines a function like: function foo(...) { ... }
    eval(`${code}; self['${func}'] = ${func};`);

    // Check the function
    const fn = self[func];
    if (typeof fn !== 'function') {
      throw new Error(`Function "${func}" not found`);
    }

    // Call the function
    const result = await fn(...args);
    self.postMessage({ output: result, logs });
  } catch (err) {
    self.postMessage({ output: null, logs: [...logs, `Error: ${err.message}`] });
  }
};
