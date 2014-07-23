/*******************************************************************************
1. DEPENDENCIES
*******************************************************************************/

var gulp = require('gulp'); // gulp core
uglify = require('gulp-uglify'), // uglifies the js
jshint = require('gulp-jshint'), // check if js is ok
rename = require("gulp-rename"), // rename files
concat = require('gulp-concat'), // concatinate js
gfi = require("gulp-file-insert"), // file insert
stylus = require('gulp-stylus'),
plumber = require('gulp-plumber'), // disable interuption
minifycss = require('gulp-minify-css'), // minify the css files
haml = require('gulp-haml'), // haml support
prettify = require('gulp-prettify'), // prettify spaces and tabs
add = require('gulp-add'), // add folders and files
spritesmith = require('gulp.spritesmith'), // generate sprite
image = require('gulp-image');

// The server will be available at http://localhost:4000
// In that path you'll see files that are in buid/ directory
var EXPRESS_PORT = 4000;
var EXPRESS_ROOT = 'build';
var LIVERELOAD_PORT = 35729;

// We'll need a reference to the tinylr
// object to send notifications of file changes
// further down
var lr;

function startLivereload() {
	lr = require('tiny-lr')();
	lr.listen(LIVERELOAD_PORT);
}

// Let's make things more readable by
// encapsulating each part's setup
// in its own method
function startExpress() {
	var express = require('express');
	var app = express();
	app.use(require('connect-livereload')());
	app.use(express.static(EXPRESS_ROOT));
	app.listen(EXPRESS_PORT);
}

function notifyLivereload(event) {
	// `gulp.watch()` events provide an absolute path
	// so we need to make it relative to the server root
	var fileName = EXPRESS_ROOT + '/' + event.path;

	lr.changed({
		body: {
			files: [fileName]
		}
	});
}

/*******************************************************************************
2. FILE DESTINATIONS (RELATIVE TO ASSSETS FOLDER)
*******************************************************************************/

var main = {
	haml_src: 'haml/**/*.haml',
	haml_html_src: 'haml/html/',
	image_src: [ // all image files
    'images/*.jpg',
    'images/*.png',
    'images/*.gif'
  ],
	styles_src: 'stylus/**/*.styl', // all stylus files
	css_src: 'css/*.css', // all css files
	css_dest: 'build/css/', // where to put minified css
	js_uglify_src: [ // all js files that should not be concatinated
    'js/libraries/*/**/*.js'
  ],
	js_concat_src: [ // all js files that should be concatinated
    'js/*.js'
  ],
	js_dest: 'build/js/' // where to put minified js
};

/*******************************************************************************
4. STYLUS TASK
*******************************************************************************/
gulp.task('stylus', function() {
	gulp.src(main.styles_src)
		.pipe(stylus())
		.pipe(gulp.dest('css/'));
});

gulp.task('css', function() {
	gulp.src(main.css_src)
		.pipe(plumber())
		.pipe(minifycss()) // minify css
	.pipe(rename({
		dirname: "",
		suffix: ".min"
	}))
		.pipe(gulp.dest(main.css_dest)) // where to put the file
});

/*******************************************************************************
5. JS TASKS
*******************************************************************************/

// minify all js files that should not be concatinated
gulp.task('js-uglify', function() {
	gulp.src(main.js_uglify_src) // get the files
	.pipe(uglify()) // uglify the files
	.pipe(rename({
		dirname: "",
		suffix: ".min"
	}))
		.pipe(gulp.dest(main.js_dest)) // where to put the files
});

// minify & concatinate all other js
gulp.task('js-concat', function() {
	gulp.src(main.js_concat_src) // get the files
	.pipe(uglify()) // uglify the files
	.pipe(concat('scripts.min.js')) // concatinate to one file
	.pipe(gulp.dest(main.js_dest)) // where to put the files
});

/*******************************************************************************
6. HAML FILES
*******************************************************************************/

gulp.task('hamlify', function() {
	gulp.run('hamlify_main');
});

gulp.task('hamlify_main', function() {
	// Haml main domain.
	gulp.src(main.haml_src)
	//.pipe(gfi({"/* functions */": "functions/functions.haml"}))
	.pipe(haml())
		.pipe(prettify({
			indentSize: 2
		}))
		.pipe(gulp.dest('build/'));
});

/*******************************************************************************
7. GENERATE IMAGES AND SPRITE
*******************************************************************************/

gulp.task('sprite', function() {
	var spriteData = gulp.src('images/sprite/*.png').pipe(spritesmith({
		imgName: 'sprite.png',
		cssName: 'sprite.css',
		cssOpts: {
			cssClass: function(item) {
				return '.sp-' + item.name;
			}
		}
	}));
	spriteData.img.pipe(gulp.dest('images/'));
	spriteData.css.pipe(gulp.dest('css/'));
});

gulp.task('image', function() {
	gulp.src(main.image_src)
		.pipe(image())
		.pipe(gulp.dest('build/images'));
});

/*******************************************************************************
8. GENERATE FILE STRUCTURE
*******************************************************************************/

gulp.task('structure', function() {
	gulp.src(['files'])
		.pipe(add('index.haml', '%div Hello world!'))
		.pipe(gulp.dest('./haml'));
	gulp.src(['files'])
		.pipe(add('scripts.js', '/* Main scripts file. */'))
		.pipe(gulp.dest('./js'));
	gulp.src(['files'])
		.pipe(add('README', 'Place folders with js libraries here.'))
		.pipe(gulp.dest('./js/libraries'));
	gulp.src(['files'])
		.pipe(add('README', 'Place Images here.'))
		.pipe(gulp.dest('./images'));
	gulp.src(['files'])
		.pipe(add('README', 'Place Sprite images here.'))
		.pipe(gulp.dest('./images/sprite'));
	gulp.src(['files'])
		.pipe(add('main.scss', '/* Main Sass file. */'))
		.pipe(gulp.dest('./sass'));
	gulp.src(['files'])
		.pipe(add('main.styl', '/* Main Stylus file. */'))
		.pipe(gulp.dest('./stylus'));
	gulp.src(['files'])
		.pipe(add('main.css', '/* Generated sass file. */'))
		.pipe(gulp.dest('./css'));
});

/*******************************************************************************
9. GULP TASKS
*******************************************************************************/

gulp.task('default', function() {
	startExpress();
	startLivereload();
	// on gulp start, run these tasks
	gulp.run('css');
	gulp.run('hamlify');
	// complile css on stylus change
	gulp.watch('css/*.css', function(event) {
		gulp.run('css');
		notifyLivereload(event);
	});
	// compily stylus on save
	gulp.watch(main.styles_src, function(event) {
		gulp.run('stylus');
	});
	// complile html on haml change
	gulp.watch(main.haml_src, function(event) {
		gulp.run('hamlify');
		notifyLivereload(event);
	});
	// run js uglify when minified js is changed
	gulp.watch(main.js_uglify_src, function() {
		gulp.run('js-uglify');
	});
	// concat and minify js when it's changed
	gulp.watch(main.js_concat_src, function() {
		gulp.run('js-concat');
	});
	// complile html on haml change
	gulp.watch('build/*.html', function(event) {
		notifyLivereload(event);
	});
	// compress images to sprite on change
	gulp.watch('images/sprite/*.png', function(event) {
		gulp.run('sprite');
	});
	// compress all images and save on change
	gulp.watch(main.image_src, function(event) {
		gulp.run('image');
	});

});

gulp.task('generate', function() {
	// on gulp start, run these tasks
	gulp.run('sprite');
	gulp.run('image');
	gulp.run('stylus');
	gulp.run('css');
	gulp.run('hamlify');
	gulp.run('js-uglify');
	gulp.run('js-concat');
});
