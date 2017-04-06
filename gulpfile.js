
/*

Example gulpfile.

To use this 

require('sprawld-gulp-boilerplate')({
	src: 'src/',
	dest: 'dist/',
	all: true,
});
*/

var gulp = require('gulp');
var _ = require('underscore');
var fs = require('fs');


// Copy Files

var changed = require('gulp-changed');	// check to see if file has changed
var plumber = require('gulp-plumber'); 	// stops gulp failing on error

gulp.task('copy', () => 
	gulp.src(["src/**/*.*","!src/**/*.{html,php,scss,css,jpg,png,jpeg,gif,js}"])
		.pipe(plumber())
		.pipe(changed("dist/"))
		.pipe(gulp.dest("dist/"))
);


// HTML

var htmlmin = require('gulp-htmlmin');
var include = require('gulp-replace-include'); // variable replacement & file includes

gulp.task('html',function() {

	return gulp.src("src/**/*.html")
		.pipe(plumber())
		.pipe(changed("dist/"))
		.pipe(include({}))
		.pipe(htmlmin({
			collapseWhitespace: true,
			conservativeCollapse:true,
			minifyCSS: true,
			minifyJS: true,
		}))
		.pipe(gulp.dest("dist/"));
	
});


// Sass

var sass = require('gulp-sass');
var csso = require('gulp-csso');
var autoprefixer = require('gulp-autoprefixer');
	
gulp.task('sass',function() {
	
	return gulp.src("src/sass/**/*.scss")
		.pipe(plumber())
		.pipe(changed("dist/css"))
		.pipe(include({}))
		.pipe(sass())								// [main] : compile sass
		.pipe(autoprefixer('last 10 versions'))		// [main] : add vendor prefixes
		.pipe(csso())								// [main] : minify CSS
		.pipe(gulp.dest("dist/css/"));
});


// Javascript

var uglify = require('gulp-uglify');
var babel = require('gulp-babel');

gulp.task('js',function() {
	
	
	return gulp.src("src/js/**/*.js")
		.pipe(plumber())
		.pipe(changed("dist/js/"))
		.pipe(include({}))
		.pipe(babel({ presets: ['es2015'] }))	// [main] : transpiler
		.pipe(uglify())							// [main] : minify javascript
		.pipe(gulp.dest("dist/js/"));	
});


// ------
// Images
// ------

var imagemin = require('gulp-imagemin');

gulp.task('img',function() {

	return gulp.src(["src/**/*.{png,jpg,gif}","!src/img/{sprite,responsive}/**/*.{png,jpg,gif}"])
		.pipe(plumber())
		.pipe(changed("dist/"))
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: true}],
		}))
		.pipe(gulp.dest("dist/"));	
	
});

// Responsive width images

var resize = require('gulp-image-resize');
var merge = require('merge-stream');

gulp.task('responsive',function() {
	
	return merge.apply(null, [480,760,1200].map(function(a) {	// [option] set array of responsive image sizes
		return gulp.src("src/img/responsive/**/*.{jpg,png}")
			.pipe(plumber())										// error handling
			.pipe(changed("dist/img/responsive/"+a+"/"))			
			.pipe(resize({ 									
				width : a,											// [main] resize images
				height : a,											
				upscale : false,
			}))
			.pipe(imagemin({progressive: true}))					// [main] : minify images
			.pipe(gulp.dest('dist/img/responsive/'+a+'/'));			
	}));
});

// Image sprites

var gmsmith = require('gmsmith');
var spritesmith = require('gulp.spritesmith');
var buffer = require('vinyl-buffer');
var path = require('path');
var globule = require('globule');

gulp.task('sprite', function () {


	//get list of folders in sprite folder
	var spriteDirs = fs.readdirSync("src/img/sprite/").filter(function(file) {
		return fs.statSync(path.join("src/img/sprite/", file)).isDirectory();
	});

	console.log('found sprite directories '+spriteDirs)
		
	return merge.apply(null,spriteDirs.map(function(src) {
		var spriteJpeg = globule.find("src/img/sprite/"+src+'/*.jpg').length;
		var spritePng = globule.find("src/img/sprite/"+src+'/*.png').length;
		
		//console.log('relative path for '+src+' : '+path.join("src/sass/sprite/","dist/img/sprite/"));
		
		var spriteType = spritePng ? '.png' : '.jpg';
		var spriteData = gulp.src("src/img/sprite/"+src+'/*.{png,jpg}',{read:false})
			.pipe(spritesmith({
			imgName: src+spriteType,
			imgPath: "../img/sprite/" + src + spriteType,
			engine: gmsmith,
			imgOpts: {quality: 97},
			cssName: '_'+src+'.scss',
			cssSpritesheetName: src,
			cssVarMap: function (sprite) {
				sprite.name = src+'-'+sprite.name;
			},

			cssTemplate: "./sprites.scss.handlebars"
		}));
		
		
		console.log('doing sprites for '+src+' : '+spriteType);
		
		var imgStream = spriteData.img
			.pipe(buffer())
			.pipe(imagemin({progressive: true}))		
			.pipe(gulp.dest("dist/img/sprite/"));	// [main] : create sprite.png
		var cssStream = spriteData.css
			.pipe(gulp.dest("src/sass/sprite/"));	// [main] : create sprite Sass file

		return merge(imgStream, cssStream);
	}));

});

// Favicon


var favicons = require('gulp-favicons');
var replace = require('gulp-replace');
var sequence = require('gulp-sequence');

gulp.task('favicon', function () {
	
	return sequence(
		gulp.src("src/favicon.png")
			.pipe(plumber())
			.pipe(favicons({
					path: "/icon/",
					url: "http://example.com",
					logging: false,
					online: false,
					replace: true,
					html: "src/include/favicons.html",			
					"appName": null,
					"appDescription": null,
					"developerName": null,
					"developerURL": null,
					"background": "#16a085",
					"display": "standalone",
					"orientation": "portrait"
				}))
			.pipe(gulp.dest("dist/icon/")),
		gulp.src("src/include/favicons.html")
			.pipe(replace(/\\/g, '/'))
			.pipe(gulp.dest("src/include/"))
	);
		
});



var download = require('gulp-download-files');

gulp.task('font',function() {
	
	var googleFont;
	if(globule.find(__dirname+'/google-font.json').length == 0) {
		if(!googleFont) googleFont = require('google-fonts-complete');
		fs.writeFileSync(__dirname+'/google-font.json',JSON.stringify(googleFont));
	} else {
		if(!googleFont) googleFont = JSON.parse(fs.readFileSync(__dirname+'/google-font.json').toString());
	}
	
	var fonts = {
		Roboto: true
	};
	var fontTypes = {
			"eot": "embedded-opentype",
			"woff": "woff",
			"woff2": "woff2",
			"ttf": "truetype",
			"svg": "svg",
		};
	var fontFiles = {};
	var fontCSS = [];
	
	//compare fonts you want to the fonts you have
	
	_.each(fonts,(a,name) => {
		var f = googleFont[name].variants || {};
		if(_.isBoolean(a)) {
			var types = _.flatten(_.map(f,(b,c) => _.map(b, (d,e) => c + e)));
		} else if(_.isString(a) || _.isNumber(a)) {
			var types = a.toString().split(',');
		} else {
			var types = a;
		}
		
		_.each(types, (type) => {
			var style = type.match(/italic/) ? 'italic' : 'normal',
				weight = type.replace(/[^0-9]/g,''),
				data = f[style][weight],
				filename = data.local[1].replace(/[^a-zA-Z0-9\-]/g,''),
				urls = data.url,
				fontLocal = data.local.map((a) => 'local('+a+')');
			
			// add in URLs to download
			_.each(urls, (url,ext) => {
				if(globule.find(`dist/fonts/${filename}.${ext}`).length == 0) fontFiles[`${filename}.${ext}`] = url;
				fontLocal.push(`url("../fonts/${filename}.${ext}") format("${fontTypes[ext]}")`);
			});
			
			// add in font-face CSS
			fontCSS.push('@font-face {'
				+ 'font-family: "'+name+'";'
				+ 'font-style: '+style+';'
				+ 'font-weight: '+weight+';'
				+ 'src: '+fontLocal.join()+';'
				+ '}');
			
		});
	});
	
	//write CSS
	
	fs.writeFileSync("src/sass/_fonts.scss",fontCSS.join('\n'));
	
	//console.log('downloading '+JSON.stringify(fontFiles));
	var fileList = _.map(fontFiles,f => f);
	if(fileList.length) {
		console.log(`downloading ${fileList.length} files`);
		return download(fontFiles).pipe(gulp.dest("dist/fonts/"));
	} else {
		return true;
	}
	
});


// Sitemap

var sitemap = require('sitemap');

gulp.task('sitemap',function() {
	
	
	var html = globule.find("dist/**/*.{html}", {srcBase: "dist/"}).map( x => ({url: x}) );

	var map = sitemap.createSitemap({
		hostname: "http://example.com",
		urls: html
	});

	fs.writeFileSync('dist/sitemap.xml',map.toString());
	
	return true;
	
});


var del = require('del');

gulp.task('clean',function() {
		
	return del("dist/",{force:true});
	
});


// var serve = require('gulp-serve');

// gulp.task('serve', serve({
// 	root: 'dist',
//   	port: 8000,

//   // middleware: function(req, res) {
//   //   // custom optional middleware 
//   // }
// }));

var server = require('gulp-server-livereload');

gulp.task('dist',sequence(["sprite","font","favicon"],["sass","js","img","responsive","html","copy"],"sitemap"));

gulp.task('build',sequence('clean','dist'));

gulp.task('watch',function() {
		
	gulp.watch("src/**/*.html",['html']);
	gulp.watch("src/sass/**/*.scss",['sass']);
	gulp.watch("src/js/**/*.js",['js']);

	gulp.watch(["src/img/**/*.{jpg,png}","!src/img/{sprite,responsive}/**/*.*"],['img']);
	gulp.watch("src/img/responsive/**/*.{jpg,png}",['responsive']);
	gulp.watch("src/sprite/**/*.{jpg,png}",sequence('sprite','sass'));
	gulp.watch("src/favicon.png",['favicon']);

	gulp.watch(["src/**/*.*","!src/**/*.{html,php,scss,css,jpg,png,jpeg,gif,js}"],['copy']);
	gulp.watch("src/**/*.html",['sitemap']);

	return gulp.src('dist').pipe(server({
		livereload: true,
		defaultFile: "index.html",
	}));

});
