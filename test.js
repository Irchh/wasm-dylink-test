const fs = require('fs');

const module1buf = fs.readFileSync('./module1.wasm');
const module2buf = fs.readFileSync('./module2.wasm');
let res;

let memory = new WebAssembly.Memory({initial: 10, maximum: 100});
let function_table = new WebAssembly.Table({element: "anyfunc", initial: 1});
let stack_pointer = new WebAssembly.Global({value: "i32", mutable: true});
let memory_base = new WebAssembly.Global({value: "i32", mutable: false});
let table_base = new WebAssembly.Global({value: "i32", mutable: false});
let importObject = {
	'env': {
		print: console.log,

		memory,
		__indirect_function_table: function_table,
		__stack_pointer: stack_pointer,
		__memory_base: memory_base,
		__table_base: table_base,
		f: function() {return 42;},
	},
};

(async () => { res = await WebAssembly.instantiate(module2buf, importObject); })()

console.log(res)