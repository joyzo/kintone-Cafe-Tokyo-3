var request = require('request');
var fs = require('fs');

request({
	method: 'POST',
	url: 'https://{subdomain}.cybozu.com/k/v1/file.json',
	headers: {
		'X-Cybozu-Authorization': new Buffer('{user id}:{password}').toString('base64')
	},
	formData: {
		file: fs.createReadStream('/Users/yamaryu0508/Downloads/kintone/kintone_post.js')
	}
}, function(err, response, body ){
	console.log(JSON.stringify(body));
});
