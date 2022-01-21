const jssha = require('jssha');
const { fromBase64 } = require('base64url');


// Uses sha384 encryption for inputted text parameter.
const sha384 = (_text) => {
    const shaObj = new jssha('SHA-384', 'TEXT', { encoding: 'UTF8' })
    shaObj.update(_text)
    let hash =  shaObj.getHash('B64')
    return fromBase64(hash)
};


module.exports = sha384;
