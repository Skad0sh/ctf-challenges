console.log(`Loading WASM module`);
const wasmModule = require('./dwm.js');
console.log(`Finished loading the module`);

wasmModule.onRuntimeInitialized = function() {
    wasmModule.init(process.env.ROOT);
}

module.exports = { wasmModule };
