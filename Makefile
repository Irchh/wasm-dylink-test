CC = clang-9
CFLAGS  = --target=wasm32 -flto -nostdlib 
CFLAGS += -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined 
CFLAGS += -Wl,--shared -Wno-writable-strings
CFLAGS += "-Wl,-z,stack-size=8388608" -I/usr/include -I./include

all:
	${CC} ${CFLAGS} -o module1.wasm module1.c
	${CC} ${CFLAGS} -o module2.wasm module2.c module1.wasm