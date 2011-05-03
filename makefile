default:
	@@echo 'Parsing markdown...'
	@@redcarpet src/body.md > src/body.html
	@@echo 'Combining files...'
	@@cat src/header.html src/body.html src/footer.html > documentation.html
	@@echo 'Packaging...'
	@@zip -q Package.zip documentation.html template.html spark.js spark.min.js
	@@echo 'Done!'