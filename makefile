default:
	@@echo 'Packaging...'
	@@zip -q Spark.zip documentation.html spark.js spark.min.js plugins/*
	@@echo 'Done!'