// Debug output
var debug = true;
// Decides whether the memory address 0x00 can be allocated.
// Most programs handle null pointers as a memory allocation error
// and wont try deallocate a null pointer. C++, for instance, won't unallocate a null pointer using destroy.
// For this reason this should never be 0
var alloc_start = 100000;

var bios = 0;

bios_req = new XMLHttpRequest();
bios_req.open('GET', 'gb_bios.gb');
bios_req.responseType = 'arraybuffer';

bios_req.onload = function() {
	result = bios_req.response;
	var resArr = new Uint8Array(result);
	if (debug) console.log(result);
	if (bios != 0) dealloc(bios);
	var ptr = alloc(result.byteLength);
	if (ptr == 0) {
		alert("Unable to allocate memory for bios!");
		throw new Error("Unable to allocate memory for bios!");
	}
	bios = ptr;
	var memoryArr = new Uint8Array(vm.memory.buffer, ptr, result.byteLength);
	for (var i = 0; i < result.byteLength; i++) {
		memoryArr[i] = resArr[i];
	}
	vm.load_bios(ptr);
}

var rom_dom = document.getElementById('romfile');
var rom = 0;
var fReader = new FileReader();

fReader.onload = function(e) {
	var result = e.target.result;
	var resArr = new Uint8Array(result);
	if (debug) console.log(result);
	if (rom != 0) dealloc(rom);
	var ptr = alloc(result.byteLength);
	if (ptr == 0) {
		alert("Unable to allocate memory for file!");
		throw new Error("Unable to allocate memory for file!");
	}
	rom = ptr;
	var memoryArr = new Uint8Array(vm.memory.buffer, ptr, result.byteLength);
	for (var i = 0; i < result.byteLength; i++) {
		memoryArr[i] = resArr[i];
	}
	vm.load_rom(ptr);
}

rom_dom.onchange = function(e) {
	var file = this.files[0];
	fReader.readAsArrayBuffer(file);
}

var vm;
var stdout = '';

var nofunc = function(){}

var allocated = [];
var findUnusedMemory = function(size) {
	var i = alloc_start;
	for (; i < vm.memory.buffer.byteLength; i++) {
		for (var a = 0; a < allocated.length; a++) {
			if (i == allocated[a].offset)
				i = allocated[a].offset + allocated[a].len;
		}
		var available = true;
		for (var j = i; j < i+size; j++) {
			for (var a = 0; a < allocated.length; a++) {
				if (j >= allocated[a].offset && j < allocated[a].offset+allocated[a].len) {
					available = false;
					i = allocated[a].offset+allocated[a].len-1;
					break;
				}
			}
			if (available == false) break;
		}
		if(available)
			return i;
		else
			continue;
	}
	return 0;
}
var alloc = function(size) {
	var offset = findUnusedMemory(size);
	if (offset+size > vm.memory.buffer.byteLength || offset == 0) {
		if (debug) console.warn("Could not allocate memory buffer with size '"+size+"' offset='"+offset+"'");
		return 0;
	}
	allocated.push({offset: offset, len: size});
	if (debug) console.log("Allocated new memory buffer at address '"+offset+"' with size '"+size+"'");
	return offset;
}
var dealloc = function(offset) {
	for (var i = 0; i < allocated.length; i++) {
		if (allocated[i].offset == offset) {
			allocated.splice(i, 1);
		}
	}
	if (debug) console.log("Tried to unallocate memory at address: '"+offset+"'");
	return 0;
}
var memcpy = function(dest, src, count) {
	
}
var putc = function(chr) {
	if (chr != 0) {
		stdout += String.fromCharCode(chr);
		updateCon(stdout);
	}
}
var putstr = function(str) {
	var str = new Uint8Array(vm.memory.buffer, str);
	for (var i = 0; i < str.length; i++) {
		if (str[i] == 0) break;
		stdout += String.fromCharCode(str[i]);
	}
	updateCon(stdout);
}
var putnum = function(num, mode) {
	if (mode == 2)
		stdout += num.toString(16);
	else if (mode == 1)
		stdout += num.toString(8);
	else
		stdout += num;
	updateCon(stdout);
}

function _sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleep(ms) {
	await _sleep(ms);
	//console.log("Sleep("+ms+")");
	return 0;
}

var __js_print_regs = function(AF, BC, DE, HL, PC, SP, LI, NI) {
	var textOut = document.getElementById("regStatus");
	var text = "";
	text += "AF: " + AF.toString(16) + "\n";
	text += "BC: " + BC.toString(16) + "\n";
	text += "DE: " + DE.toString(16) + "\n";
	text += "HL: " + HL.toString(16) + "\n";
	text += "PC: " + PC.toString(16) + "\n";
	text += "SP: " + SP.toString(16) + "\n";
	text += "Last Instruction: " + LI.toString(16) + "\n";
	text += "Next Instruction: " + NI.toString(16) + "\n";
	textOut.value = text;
}
var screen = document.getElementById("display").getContext("2d");
var id = screen.createImageData(1, 1);
var d = id.data;
var setScreenData = function(offset, r, g, b, a) {
	d[0] = r;
	d[1] = g;
	d[2] = b;
	d[3] = a;
	offset /= 4;
	var column = offset & 160;
	var line = Math.floor(offset / 160) - column;
	screen.putImageData( id, column, line );
}

var importObject = {
	'env': {
		putc,
		putnum,
		putstr,
		__js_sleep: sleep,
		__js_print_regs,
		__js_set_screen_data: setScreenData,
		//memcpy,
		clock_gettime: function() {return 0;},
		setvbuf: function() {return 0;},
		_Znam: alloc,
		_Znwm: alloc,
		_ZdaPv: dealloc,
		__cxa_begin_catch: console.log,
		_ZSt9terminatev: console.log,
		__memory_base: 0,
		__memory: new WebAssembly.Memory({initial: 256}),
	},
};

request = new XMLHttpRequest();
request.open('GET', 'igb.wasm');
request.responseType = 'arraybuffer';
request.send();

request.onload = function() {
	var bytes = request.response;
	WebAssembly.instantiate(bytes, importObject).then(results => {
		vm = results.instance.exports;
		bios_req.send();
		console.log(vm);
	});
};
