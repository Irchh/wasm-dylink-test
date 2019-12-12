#include <common.h>
#include <dlfcn.h>

WASM_EXPORT
int main() {
    print(f());
    void *handle;
    void (*func_print_name)(const char*);

    handle = dlopen("./module3.wasm", RTLD_LAZY);
    *(void**)(&func_print_name) = dlsym(handle, "print_name");

    func_print_name("dank memer");
    //dlclose(handle);

    return 0;
}