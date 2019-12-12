CC = clang-9
CFLAGS  = --target=wasm32-unknown-emscripten -flto -nostdlib -fPIC
CFLAGS += -Wl,--no-entry -Wl,--allow-undefined #-Wl,--export-all
CFLAGS += -Wl,--shared -Wno-writable-strings -Wl,--import-memory
CFLAGS += "-Wl,-z,stack-size=8388608" -I/usr/include -I./include

all:
	${CC} ${CFLAGS} -o module1.wasm module1.c
	${CC} ${CFLAGS} -o module2.wasm module2.c
	${CC} ${CFLAGS} -o module3.wasm module3.c
