var request = require('request');

request({
	method: 'POST',
	url: 'https://{subdomain}.cybozu.com/k/v1/record.json',
	headers: {
		'X-Cybozu-Authorization': new Buffer('{user id}:{password}').toString('base64'),
		'Content-Type': 'application/json'
	},
	json: {
		app: {app id},
		record: {
			lat: {
				value: 35.6314597
			},
			lng: {
				value: 139.71403510000005
			}
		}
	}
}, function(err, response, body ){
	console.log(JSON.stringify(body));
});
