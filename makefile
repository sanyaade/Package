default:
	@@echo 'Building documentation...'
	@@redcarpet src/body.md > src/body.html
	@@cat src/header.html src/body.html src/footer.html > documentation.html
	@@echo 'Done!'