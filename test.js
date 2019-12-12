const fs = require('fs');

const module2buf = fs.readFileSync('./module2.wasm');
let bin;
let mod1;
let mod2;

let libs = [];

let memory = new WebAssembly.Memory({initial: 10});
let function_table = new WebAssembly.Table({element: "anyfunc", initial: 0});
let stack_pointer = new WebAssembly.Global({value: "i32", mutable: true}, 1000);
let memory_base = new WebAssembly.Global({value: "i32", mutable: false});
let table_base = new WebAssembly.Global({value: "i32", mutable: false}, 100);

function readString(strptr) {
	var strbuf = new Uint8Array(memory.buffer, strptr);
	var str = "";
	for (var i = 0; i < strbuf.length; i++) {
		if (strbuf[i] == 0) break;
		str += String.fromCharCode(strbuf[i]);
	}
	return str;
}

function addFunction(func, sig) {
	var index = function_table.length;
	function_table.grow(1);
	try {
		function_table.set(index, func);
	} catch (e) {
		if (!e instanceof TypeError) {
			throw e;
		}

		var typeSection = [
			0x01,
			0x00,
			0x01,
			0x60,
		];
		var sigRet = sig.slice(0, 1);
		var sigParm = sig.slice(1);
		var typeCodes = {
			'i': 0x7f,
			'j': 0x7e,
			'f': 0x7d,
			'd': 0x7c,
		};

		if (sigRet == 'v') {
			typeSection.push(0x00);
		}else{
			typeSection = typeSection.concat([0x01, typeCodes[sigRet]]);
		}

		typeSection[1] = typeSection.length - 2;

		var bytes = new Uint8Array([
			0x00, 0x61, 0x73, 0x6d,
			0x01, 0x00, 0x00, 0x00,
		].concat(typeSection, [
			// (import "e" "f" (func 0 (type 0)))
			0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
		0x07, 0x05, // export section
			// (export "f" (func 0 (type 0)))
			0x01, 0x01, 0x66, 0x00, 0x00,
		]));

		var module = new WebAssembly.Module(bytes);
		var instance = new WebAssembly.Instance(module, {
			e: {
				f: func
			}
		});
		var wrapFunc = instance.exports.f;
		function_table.set(index, wrapFunc);
	}
	return index;
}

async function dlopen(str, idk) {
	console.log(str, idk);
	/*let index = await load_lib(str);
	console.log("index:",index);
	return index;*/
	return load_lib(str);
}

async function dlsym(index, func_name) {
	console.log(index, func_name+", expected: "+(libs.length-1));
	if (libs[index].inst.exports[func_name] != undefined) {
		console.log("DLSYM: DEFINED");
		return await addFunction(libs[index].inst.exports[func_name]);
	}else{
		console.log("DLSYM: UNDEFINED");
//		console.log(libs[index].inst.exports);
		return 0;
	}
}

let importObject = {
	'env': {
		print: console.log,

		dlopen: async (ptr, idk) => { return await dlopen(readString(ptr), idk); },
		dlsym: async (index, func_name) => { return await dlsym(index, readString(func_name)); },

		memory,
		__indirect_function_table: function_table,
		__stack_pointer: stack_pointer,
		__memory_base: memory_base,
		__table_base: table_base,
	},
};

async function load_lib(path) {
	var lib = fs.readFileSync(path);
	await WebAssembly.instantiate(lib, importObject).then(async results => {
		libs.push({name: path, inst: results.instance})
		Object.assign(importObject.env, libs[libs.length-1].inst.exports);
		console.log("Lib done: "+path);
	});
	return libs.length-1;
}

async function load_bin() {
	await WebAssembly.instantiate(module2buf, importObject).then(async results => {
		mod2 = results.instance;
		mod2.exports.main();
		console.log("Main done");
	});
}

async function main() {
	load_lib("./module1.wasm").then(function() {
		load_bin();
	});
	/*console.log("Done");*/
}

main();
