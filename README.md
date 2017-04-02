## Gulp Boilerplate
#### A kitchen sink of gulp tasks

[Gulp](https://www.npmjs.com/package/gulp) is the all purpose build tool for Node. sprawld-gulp-boilerplate is a store of all the different tasks I might run when making a site. May take a while to install, requires [GraphicsMagick](https://www.npmjs.com/package/gm)

### Quick Start

Just install with npm

```sh
npm install sprawld-gulp-boilerplate --save
```

and create a `gulpfile.js` with this line

```js
require('sprawld-gulp-boilerplate')({
	src: "src/",
	dest: "dist/",
	all: true,
});
```
This will run *everything* with default options. To take only the bits you need have a look at the example gulpfile

### Tasks

#### copy

The simplest gulp function is of the form:

```js
gulp.task('copy', () => gulp.src('src/')
	.pipe(gulp.dest('dist/'))
```
