var fs = require('fs');
var path = require('path');
var merge = require('merge-stream');
var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');



var scriptsPath = '../scripts';
var outPath = 'dist/scripts';

/**
<script type="text/javascript" src="scripts/jOWL.js"></script>
<script type="text/javascript" src="scripts/jOWLBrowser.js"></script>
<script type="text/javascript" src="scripts/jowl.thing.js"></script>
<script type="text/javascript" src="scripts/jowl.element.js"></script>
<script type="text/javascript" src="scripts/jowl.document.js"></script>
<script type="text/javascript" src="scripts/jowl.datatype.js"></script>
<script type="text/javascript" src="scripts/jowl.ontology.js"></script>
<script type="text/javascript" src="scripts/jowl.individual.js"></script>
<script type="text/javascript" src="scripts/jowl.property.js"></script>
<script type="text/javascript" src="scripts/jowl.class.js"></script>
<script type="text/javascript" src="scripts/jowl.intersection.js"></script>
<script type="text/javascript" src="scripts/jowl.restriction.js"></script>
<script type="text/javascript" src="scripts/jowl.sparql-dl.js"></script>
*/
var order = [
  "jOWL.js", "jowl.thing.js", "jowl.element.js", "jowl.document.js",
  "jowl.datatype.js", "jowl.ontology.js", "jowl.individual.js", "jowl.property.js",
  "jowl.class.js", "jowl.intersection.js", "jowl.restriction.js", "jowl.sparql-dl.js"
];

function getFolders(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
      });
}

gulp.task('scripts', function() {
   var folders = getFolders(scriptsPath);

   var tasks = folders.map(function(folder) {
      return gulp.src(path.join(scriptsPath, folder, '/**/*.js'))
        // concat into foldername.js
        .pipe(concat(folder + '.js'))
        // write to output
        .pipe(gulp.dest(outPath))
        // minify
        .pipe(uglify())
        // rename to folder.min.js
        .pipe(rename(folder + '.min.js'))
        // write to output again
        .pipe(gulp.dest(outPath));
   });

   // process all remaining files in scriptsPath root into main.js and main.min.js files
   var root = gulp.src(order.map(function(i){ return path.join(scriptsPath, i); }))
        .pipe(concat('jowl.js'))
        .pipe(gulp.dest(outPath))
        .pipe(uglify())
        .pipe(rename('jowl.min.js'))
        .pipe(gulp.dest(outPath));

   return merge(tasks, root);
});
