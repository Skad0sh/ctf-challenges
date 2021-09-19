.PHONY: clean install

BUILD_DIR=./build
INSTALL_DIR=./src/lib
TARGET=dwm
FILES=wasm/fs.cpp wasm/op.cpp wasm/hmac/sha1.c wasm/hmac/hmac.cpp wasm/main.cpp

CXX=emcc
LDLIBS=-lnodefs.js
CPPFLAGS=--bind \
	-s WASM=1 \
	-s MALLOC=emmalloc \
	-s INITIAL_MEMORY=83886080 \
	-s USE_ZLIB=1 \
	-s USE_LIBPNG=1 \
	-s FORCE_FILESYSTEM=1 \
	-s DISABLE_EXCEPTION_CATCHING=0 \
	-fexceptions \
	-DDEBUG -DEXPORT_TEST_WRAPPERS

all: build debug

build: $(FILES)
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CPPFLAGS) $(FILES) -o $(BUILD_DIR)/$(TARGET).html $(LDLIBS)

install: build
	mkdir -p $(INSTALL_DIR)
	cp $(BUILD_DIR)/$(TARGET).js   $(INSTALL_DIR)/$(TARGET).js
	cp $(BUILD_DIR)/$(TARGET).wasm $(INSTALL_DIR)/$(TARGET).wasm
	rm -rf wasm

debug: build
	mkdir -p $(BUILD_DIR)/debug
	cp $(BUILD_DIR)/$(TARGET).html $(BUILD_DIR)/debug/$(TARGET).html
	cp $(BUILD_DIR)/$(TARGET).js   $(BUILD_DIR)/debug/$(TARGET).js
	cp $(BUILD_DIR)/$(TARGET).wasm $(BUILD_DIR)/debug/$(TARGET).wasm
	wasm2wat       $(BUILD_DIR)/debug/$(TARGET).wasm -o $(BUILD_DIR)/debug/$(TARGET).wat
	wasm-decompile $(BUILD_DIR)/debug/$(TARGET).wasm -o $(BUILD_DIR)/debug/$(TARGET).dcmp.c
	wasm2c         $(BUILD_DIR)/debug/$(TARGET).wasm -o $(BUILD_DIR)/debug/$(TARGET).c

debug-start: debug
	$(info **********************************************************************************************************************************)
	$(info Type "e = Module.get_embedder('LSB'); e.process('_.png', 'debug.png', 'key', 'message')" in JS console to start debugging)
	$(info N.B. Do not forget to patch "_emscripten_run_script" in the "glue" JS-code and create debug.png input file using the FS interface)
	$(info E.g. "FS.mkdir('/root'); FS.writeFile('/root/debug.png', new Uint8Array([...]), { encoding: 'utf-8' });")
	$(info **********************************************************************************************************************************)
	python3 -m http.server -d "$(BUILD_DIR)/debug" 8888

clean:
	rm -rf $(BUILD_DIR)
	rm -rf wasm
