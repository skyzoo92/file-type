'use strict';

#!/usr/bin/node
const process = require('node:process');
const {fileTypeFromFile} = require('./index.js');

const [file] = process.argv.slice(2);

if (!file) {
	console.error('Expected path of the file to examine');
	process.exit();
}

const fileType = await fileTypeFromFile(file);

if (fileType) {
	console.log(`MIME-type: ${fileType.mime}`);
	console.log(`Extension: ${fileType.ext}`);
} else {
	console.log('Could not determine file type');
}
