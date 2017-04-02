"use strict";

/*
	sprawld-gulp-boilerplate v2.0.0
	a big bunch of gulp tasks
	example gulpfile.js
*/

var tasklist = ["sass","js","img","responsive","sprite","font","favicon","html","copy","sitemap"];

module.exports = function(options) {

	if(!options.src || !options.dest) {
		console.log('src and dest are requires options')
	}

	if(options.all) {
		tasklist.forEach(name => options[name] = true);
	}


	var gulp = require('gulp'),
		_ = require('underscore'),
		fs = require('fs'),
		path = require('path'),
		globule = require('globule'),
		sequence = require('gulp-sequence'),
		plumber = require('gulp-plumber'),
		changed = require('gulp-changed');

	// var htmlmin = require('html-minifier').minify;

	var plugins = {};

	var queues = {
		before: [],
		main: [],
		after: [],
	}

	var tasks = {

		copy: {
			queue: "main",
			plugins: [],
			defaults: {
				src: [`${options.src}/**/*.*`,`!${options.src}/**/*.{html,php,scss,css,jpg,png,jpeg,gif,js}`],
				dest: options.dest,
			},

			task: () => gulp.src(options.copy.src)
				.pipe(gulp.dest(options.copy.dest))
		},

		html: {
			queue: "main",
			plugins: ['gulp-htmlmin','through2','gulp-replace-include'],
			defaults: {
				src: `${options.src}/**/.html`,
				dest: options.dest,
			},
			task: () => gulp.src(options.html.src)
				.pipe(plumber())
				.pipe(plugins.replaceinclude({
					include: options.include || [],
					global: options.global || {},
				}))
				.pipe(plugins.htmlminifier({
					collapseWhitespace: true,
					conservativeCollapse:true,
					minifyCSS: true,
					minifyJS: true,
				}))
				.pipe(gulp.dest(options.html.dest))
		},

		sass: {
			queue: "main",
			plugins: ['gulp-replace-include','gulp-sass','gulp-csso','gulp-autoprefixer'],
			defaults: {
				src: `${options.src}/**/*.scss`,
				dest: options.dest
			},
			task: () => gulp.src(options.sass.src)
				.pipe(plumber())
				.pipe(plugins.replaceinclude({
					include: options.include || [],
					global: options.global || {},
				}))
				.pipe(plugins.sass())								// [main] : compile sass
				.pipe(plugins.autoprefixer('last 10 versions'))	// [main] : add vendor prefixes
				.pipe(plugins.csso())								// [main] : minify CSS
				.pipe(gulp.dest(options.sass.dest))
		},

		js: {
			queue: "main",
			plugins: ["gulp-uglify","gulp-babel","gulp-replace-include"],
			defaults: {
				src: `${options.src}/**/*.js`,
				dest: options.dest
			},

			task: () => gulp.src(options.js.src)
				.pipe(plumber())
				.pipe(plugins.replaceinclude({
					include: options.include || [],
					global: options.global || {},
				}))
				.pipe(plugins.babel({ presets: ['es2015'] }))	// [main] : transpiler
				.pipe(plugins.uglify())							// [main] : minify javascript
				.pipe(gulp.dest(options.js.dest)),
		},
		img: {
			queue: "main",
			plugins: ["gulp-imagemin"],
			defaults: {
				src: [`${options.src}/**/*.{png,jpg,gif}`,`!${options.src}/{img,images?}/{sprite,responsive}/**/*.{png,jpg,gif}`],
				dest: options.dest
			},
			task: () => gulp.src(options.img.src)
				.pipe(plugins.imagemin({
					progressive: true,
					svgoPlugins: [{removeViewBox: true}],
				}))
				.pipe(gulp.dest(options.img.dest)),
		},		


		responsive: {
			queue: "main",
			plugins: ["gulp-image-resize","gulp-imagemin"],
			defaults: {
				src: `${options.src}/img/responsive/**/*.{png,jpg}`,
				sizes: [480,760,1200],
				dest: `${options.dest}/img/responsive/`,
			},
			task: () => sequence.apply(null, options.responsive.sizes.map(size => 	// [option] set array of responsive image sizes
				gulp.src(options.responsive.src)
					.pipe(plumber())										// error handling
					.pipe(plugins.imageresize({ 									
						width : size,											// [main] resize images
						height : size,											
						upscale : false,
					}))
					.pipe(plugins.imagemin({progressive: true}))					// [main] : minify images
					.pipe(gulp.dest(options.responsive.dest+size+'/'))			
				))
		},
		sprite: {
			queue: "before",
			plugins: ["vinyl-buffer","merge-stream","gmsmith","gulp.spritesmith","gulp-imagemin"],
			defaults: {
				src: `${options.src}/img/sprite/`,
			    sass: `${options.src}/sass/sprite/`,
			    relative: `../img/sprite/`,
				dest: `${options.dest}/img/sprite/`,
			},
			task: () => {
					//get list of folders in sprite folder
				var spriteDirs = fs.readdirSync(options.sprite.src).filter(file => 
					fs.statSync(path.join(options.sprite.src, file)).isDirectory());

				console.log('found sprite directories '+spriteDirs)
					
				return plugins.mergestream.apply(null,spriteDirs.map(function(src) {
					var spriteJpeg = globule.find(options.sprite.src+src+'/*.jpg').length;
					var spritePng = globule.find(options.sprite.src+src+'/*.png').length;
					
					//console.log('relative path for '+src+' : '+path.join(options.sprite.sass,options.sprite.dest));
					
					var spriteType = spritePng ? '.png' : '.jpg';
					var spriteData = gulp.src(options.sprite.src+src+'/*.{png,jpg}',{read:false})
						.pipe(plugins.spritesmith({
						imgName: src+spriteType,
						imgPath: options.sprite.relative + src + spriteType,
						engine: plugins.gmsmith,
						imgOpts: {quality: 97},
						cssName: '_'+src+'.scss',
						cssSpritesheetName: src,
						cssVarMap: function (sprite) {
							sprite.name = src+'-'+sprite.name;
						},

						cssTemplate: options.sprite.template || (__dirname+"/sprites.scss.handlebars")
					}));
					
				
					console.log('doing sprites for '+src+' : '+spriteType);
					
					var imgStream = spriteData.img
						.pipe(plugins.vinylbuffer())
						.pipe(plugins.imagemin({progressive: true}))		
						.pipe(gulp.dest(options.sprite.dest));	// [main] : create sprite.png
					var cssStream = spriteData.css
						.pipe(gulp.dest(options.sprite.sass));	// [main] : create sprite Sass file

					return plugins.mergestream(imgStream, cssStream);
				}));
			},
		},

		font: {
			queue: "before",
			plugins: ["gulp-download-files"],
			defaults: {
				sass: `${options.src}/sass/_fonts.scss`,
				dest: `${options.dest}/fonts/`,
				relative: `../fonts/`,
				types: {
					"Roboto": true
				}
			},
			task: () => {
				var googleFont;	

				if(globule.find(__dirname+'/google-font.json').length == 0) {
					googleFont = require('google-fonts-complete');
					fs.writeFileSync(__dirname+'/google-font.json',JSON.stringify(googleFont));
				} else {
					googleFont = JSON.parse(fs.readFileSync(__dirname+'/google-font.json').toString());
				}
				
				console.log('got google fonts');

				var fonts = options.font.types || {},
					fontTypes = {
						"eot": "embedded-opentype",
						"woff": "woff",
						"woff2": "woff2",
						"ttf": "truetype",
						"svg": "svg",
					},
					fontFiles = {},
					fontCSS = [];
				
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
							if(globule.find(options.font.dest+filename+'.'+ext).length == 0) fontFiles[filename+'.'+ext] = url;
							fontLocal.push('url("'+options.font.relative+filename+'.'+ext+'") format("'+fontTypes[ext]+'")');
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
				
				fs.writeFileSync(options.font.sass,fontCSS.join('\n'));
				
				var fileList = _.map(fontFiles,f => f);
				if(fileList.length) {
					console.log(`downloading ${fileList.length} files`);
					return plugins.downloadfiles(fontFiles).pipe(gulp.dest(options.font.dest));
				} else {
					return true;
				}
				
			}
		},


		favicon: {
			queue: "before",
			plugins: ["gulp-favicons","gulp-replace"],
			defaults: {
				src: `${options.src}/favicon.png`,
				dest: `${options.src}/icon/`,
				html: `${options.src}/include/`,
				path: "/icon/",
				manifest: {
					"appName": null,
					"appDescription": null,
					"developerName": null,
					"developerURL": null,
					"background": "#16a085",
					"display": "standalone",
					"orientation": "portrait"
				}
			},
			task: () =>	sequence(
				gulp.src(options.favicon.src)
					.pipe(plugins.favicons(
						_.extend({
							path: options.favicon.path,
							url: options.site,
							logging: false,
							online: false,
							replace: true,
							html: options.favicon.html + 'favicons.html',
						},options.favicon.manifest)))
					.pipe(gulp.dest(options.favicon.dest)),
				gulp.src(options.favicon.html + 'favicons.html')
					.pipe(plugins.replace(/\\/g, '/'))
					.pipe(gulp.dest(options.favicon.html))
			),
		},

		sitemap: {
			queue: "after",
			plugins: ["sitemap"],
			defaults: {
				src: `${options.src}/**/*.html`,
				dest: options.dest,
			},
			task: () => {
					
					var o = options.sitemap;
					var html = globule.find(o.src, {srcBase: o.dest}).map( x => ({url: x}) );

					if(o.pages && o.pages.length) html = html.concat(o.pages.map( x => ({url: x}) ));
					
					var map = plugins.sitemap.createSitemap({
						hostname: options.site || "",
						urls: html
					});

					fs.writeFileSync(o.dest+'sitemap.xml',map.toString());
					
					// callback();
					return true;
					
			}
		},

	}


	for(var name in tasks) {
		if(options[name]) {
			var t = tasks[name];
			// require plugins
			t.plugins.forEach(plugin => {
				if(_.isArray(plugin)) {
					var p = plugin[0].replace(/^gulp[\-\.]/,'').replace(/[\-\.0-9]/g,'');
					if(!plugins[p]) plugins[p] = require(plugin[0])[plugin[1]];
				} else {
					var p = plugin.replace(/^gulp[\-\.]/,'').replace(/[\-\.0-9]/g,'');
					if(!plugins[p]) plugins[p] = require(plugin);
				}
			});
			// check options
			if(_.isBoolean(options[name])) {
				options[name] = t.defaults;
			} else if(_.isObject(options[name])) {
				options[name] = _.extend(t.defaults,options[name]);
			}

			queues[t.queue].push(name);
			
			console.log(`Task ${name} : ${JSON.stringify(options[name])}`)

			gulp.task(name,t.task);
			
		}
	}

	gulp.task('clean',function() {
			
		var del = require('del');
		return del(options.dest,{force:true});
		
	});

	var dist = [queues.before,queues.main,queues.after].filter(a => a.length);
	var build = ['clean'].concat(dist);
	gulp.task('build',sequence.apply(null,build));
	gulp.task('dist',sequence.apply(null,build));

	gulp.task('watch',function() {
		
		for(var name in tasks) {
			if(name === "sprite" && options[name]) {
				
				gulp.watch(options[name].src+'**/*.{png,jpg}',
					options.sass ? sequence('sprite','sass') : ['sprite']);
			
			} else if(options[name]) {
				gulp.watch(options[name].src,[name]);
			}
		}
			
	});

}

