/**
Node.js specific entry point.
*/

'use strict';
const strtok3 = require('strtok3');
const { ReadableStream, WebReadableStream } = require('node:stream/web');
const { pipeline, PassThrough, Readable } = require('node:stream');
const {
    DefaultFileTypeParser,
    reasonableDetectionSizeInBytes,
    fileTypeFromTokenizer,
    fileTypeFromBuffer,
    fileTypeFromBlob,
    supportedMimeTypes,
    supportedExtensions,
} = require('./core.js');

// Ganti nama class agar tidak bentrok
class MyFileTypeParser extends DefaultFileTypeParser {
    async fromStream(stream) {
        const tokenizer = await (stream instanceof WebReadableStream
            ? strtok3.fromWebStream(stream, this.tokenizerOptions)
            : strtok3.fromStream(stream, this.tokenizerOptions));
        try {
            return await super.fromTokenizer(tokenizer);
        } finally {
            await tokenizer.close();
        }
    }

    async fromFile(path) {
        const tokenizer = await strtok3.fromFile(path);
        try {
            return await super.fromTokenizer(tokenizer);
        } finally {
            await tokenizer.close();
        }
    }

    async toDetectionStream(readableStream, options = {}) {
        if (!(readableStream instanceof Readable)) {
            return super.toDetectionStream(readableStream, options);
        }

        const { sampleSize = reasonableDetectionSizeInBytes } = options;

        return new Promise((resolve, reject) => {
            readableStream.on('error', reject);

            readableStream.once('readable', () => {
                (async () => {
                    try {
                        const pass = new PassThrough();
                        const outputStream = pipeline
                            ? pipeline(readableStream, pass, () => {})
                            : readableStream.pipe(pass);

                        const chunk = readableStream.read(sampleSize)
                            ?? readableStream.read()
                            ?? new Uint8Array(0);
                        try {
                            pass.fileType = await this.fromBuffer(chunk);
                        } catch (error) {
                            if (error instanceof strtok3.EndOfStreamError) {
                                pass.fileType = undefined;
                            } else {
                                reject(error);
                            }
                        }

                        resolve(outputStream);
                    } catch (error) {
                        reject(error);
                    }
                })();
            });
        });
    }
}

// Gunakan instance global jika ingin
const fileTypeParser = new MyFileTypeParser();

async function fileTypeFromFile(path, options) {
    return fileTypeParser.fromFile(path, options);
}

async function fileTypeFromStream(stream, options) {
    return fileTypeParser.fromStream(stream, options);
}

async function fileTypeStream(readableStream, options = {}) {
    return fileTypeParser.toDetectionStream(readableStream, options);
}

module.exports = {
    fileTypeFromTokenizer,
    fileTypeFromBuffer,
    fileTypeFromBlob,
    supportedMimeTypes,
    supportedExtensions,
    fileTypeFromFile,
    fileTypeFromStream,
    fileTypeStream
};
