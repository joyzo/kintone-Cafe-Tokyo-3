var request = require('request');

request({
	method: 'GET',
	url: 'https://{subdomain}.cybozu.com/k/v1/records.json',
	headers: {
		'X-Cybozu-Authorization': new Buffer('{user id}:{password}').toString('base64'),
		'Content-Type': 'application/json'
	},
	json: {
		app: {app id}
	}
}, function(err, response, body ){
	console.log(JSON.stringify(body));
});
