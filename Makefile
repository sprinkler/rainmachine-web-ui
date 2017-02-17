MKDIR = mkdir -p
OUT = build

FONT_FILES = font/rainmachine.woff

IMG_FILES = images/spks.png \
	images/selected.png \
	images/arrow.png \
	images/arrow_right.png

CSS_FILES = $(filter-out %-min.css,$(wildcard \
	css/*.css \
))

JS_OUTPUT_FILE = $(OUT)/js/rainmachine-min.js

JS_FILES = js/dom.js \
	js/storage.js \
	js/util.js \
	js/async.js \
	js/rainmachine-api-v4.js \
	js/data.js \
	js/help.js \
	js/ui-firebase.js \
	js/ui-charts.js \
	js/ui-charts-parsers.js \
	js/ui-login.js \
	js/ui-restrictions.js \
	js/ui-settings.js \
	js/ui-system-settings.js \
	js/ui-about.js \
	js/ui-programs.js \
	js/ui-zones.js \
	js/ui.js

JS_DEPS = js/highcharts-custom.js

CSS_COMPRESSOR = java -jar tools/yuicompressor.jar
CSS_COMPRESSOR_FLAGS = --charset utf-8 --verbose

JS_COMPRESSOR = java -jar tools/closure-compiler.jar
JS_COMPRESSOR_FLAGS = --js_output_file $(JS_OUTPUT_FILE) \
 	--language_in ECMASCRIPT5 \
 	--compilation_level SIMPLE_OPTIMIZATIONS \
    --summary_detail_level 3

CSS_MINIFIED = $(CSS_FILES:.css=-min.css)
JS_MINIFIED = $(JS_FILES:.js=-min.js)


minify: create-out-build minify-css minify-js set-html-to-prod

minify-css: $(CSS_FILES) $(CSS_MINIFIED)

minify-js: $(JS_FILES)
	@echo 'Compiling $(JS_FILES)'
	$(JS_COMPRESSOR) $(JS_COMPRESSOR_FLAGS) $(JS_FILES)
	@echo

create-out-build:
	@echo 'Creating $(OUT)/'
	${MKDIR} $(OUT)/css
	${MKDIR} $(OUT)/js
	${MKDIR} $(OUT)/images
	${MKDIR} $(OUT)/font
	cp $(IMG_FILES) $(OUT)/images
	cp $(FONT_FILES) $(OUT)/font
	cp $(JS_DEPS)	$(OUT)/js
	cp index.html $(OUT)/
	@echo


set-html-to-prod: index.html
	@echo 'Changing index.html'
	sed -i -ne '/<!-- BUILD DEVEL -->/ {p; r build.includes' -e ':a; n; /<!-- END BUILD DEVEL -->/ {p; b}; ba}; p' $(OUT)/index.html
	@echo

%-min.css: %.css
	@echo 'Minifying $<'
	$(CSS_COMPRESSOR) $(CSS_COMPRESSOR_FLAGS) --type css $< >$(OUT)/$@
	@echo

clean:
	rm -rf $(OUT)
