/* モジュールの読込 */
var aws = require('aws-sdk');
var s3 = new aws.S3({
  apiVersion: '2006-03-01'
});

var request = require('request'); // HTTPSリクエスト用
var async = require('async'); // 複数プロセスparallel、series処理用
var fs = require('fs'); // ファイル処理用

/* kintoneパラメータ */
var API_VERSION = '/k/v1/';
var DOMAIN = '{subdomain}.cybozu.com';
var JSON_CONTENT = 'application/json';
var AUTH_VALUE = new Buffer('{user id}:{password}').toString('base64');
var auth_headers = { // ボディにJSONをセットしない（クエリ指定）時、ファイルアップロード時等のヘッダ
  'X-Cybozu-Authorization': AUTH_VALUE
};
var content_headers = { // ボディにJSONをセットする時のヘッダ
  'X-Cybozu-Authorization': AUTH_VALUE,
  'Content-Type': JSON_CONTENT
}

/* Lambda関数 */
exports.handler = function(event, context) {
  // eventからS3バケット名とPUTされたファイル名を取得
  var bucket = event.Records[0].s3.bucket.name;
  var key = event.Records[0].s3.object.key;
  var params = {
    Bucket: bucket,
    Key: key
  };

  var app_ids = [{app id #1}, {app id #2}, {app id #3}, {app id #4}]; // 更新対象のkintoneアプリのID

  s3.getObject(params, function(err, data) { // S3からファイルを取得してkintoneアプリのJSカスタマイズファイルを更新
    if (err) {
      console.log(err);
      var message = "Error getting object " + key + " from bucket " + bucket +
        ". Make sure they exist and your bucket is in the same region as this function.";
      console.log(message);
      context.fail(message);
    } else {

      async.series([ // asyncで複数プロセスseries処理（今回は4アプリ）
        function(callback) {
          jsUpdate(app_ids[0], key, data, function(res){ // kintone JSファイル更新（差替）処理関数の実行
            callback(null, res);
          });
        },
        function(callback) {
          jsUpdate(app_ids[1], key, data, function(res){ // kintone JSファイル更新（差替）処理関数の実行
            callback(null, res);
          });
        },
        function(callback) {
          jsUpdate(app_ids[2], key, data, function(res){ // kintone JSファイル更新（差替）処理関数の実行
            callback(null, res);
          });
        },
        function(callback) {
          jsUpdate(app_ids[3], key, data, function(res){ // kintone JSファイル更新（差替）処理関数の実行
            callback(null, res);
          });
        }
      ], function(err, results) {
        if (err) {
          context.error(results);
          throw err;
        }
        console.log('all done');
        console.log(results);
        context.succeed(results);
      });
    }
  });
};

/* kintone JSファイル更新（差替）処理を関数化 */
function jsUpdate(app_id, key, data, callback) {
  fs.writeFileSync('/tmp/' + key, data.Body); // S3 data.Bodyからファイル作成

  var formData = { // ファイルをformデータとして指定（kintoneにはmultipart/form-data形式でアップロード）
    file: fs.createReadStream('/tmp/' + key)
  };

  simpleRequest('POST', "https://" + DOMAIN + API_VERSION + "file.json", auth_headers, formData, function(file) { // kintoneへファイルアップロード
    console.log(JSON.stringify(file));
    simpleRequest('GET', "https://" + DOMAIN + API_VERSION + "preview/app/customize.json", content_headers, { // 対象kintoneアプリのカスタマイズ情報を取得
      app: app_id
    }, function(customize) {
      console.log(JSON.stringify(customize));
      delete customize['revision']; // 更新用にrevisionプロパティを削除
      delete customize['scope']; // 更新用にscopeプロパティを削除

      var new_flag = true;

      var js = customize['desktop']['js'];
      for (var i = 0; i < js.length; i++) { // 更新対象のファイルを差替
        if (js[i]['type'] == 'FILE' && js[i]['file']['name'] == key) {
          js[i]['file'] = file;
          new_flag = false;
        }
      }

      if(new_flag){
        js.push({
          file: file,
          type: 'FILE'
        });
      }

      customize['app'] = app_id;
      simpleRequest('PUT', "https://" + DOMAIN + API_VERSION + "preview/app/customize.json", content_headers, customize, function(re_customize) { // 対象kintoneアプリのカスタマイズ情報を更新
        console.log(JSON.stringify(re_customize));
        var deploy_payload = {
          apps: [{
            app: app_id
          }]
        };
        simpleRequest('POST', "https://" + DOMAIN + API_VERSION + "preview/app/deploy.json", content_headers, deploy_payload, function(deploy) { // kintoneアプリのデプロイ
          console.log(JSON.stringify(deploy));
          callback(deploy);
        });
      });
    });
  });
}

/* kintone REST APIコール用のライトな関数 */
function simpleRequest(method, url, headers, body, callback) {
  var config;
  config = {
    method: method,
    url: url,
    headers: headers
  };
  if (url.indexOf('file.json') >= 0 && method === 'POST') { // ファイルアップロード時はform形式のボディ
    console.log("formData REQUEST:");
    config['formData'] = body;
  } else { // それ以外は通常JSON形式のボディ
    console.log("JSON REQUEST:");
    config['json'] = body;
  }
  return request(config, function(err, response, body) {
    var e, json;
    if (err) {
      callback(err);
    }
    try {
      json = body;
    } catch (_error) {
      e = _error;
      callback(new Error(e, null));
    }
    if (typeof json !== 'object') {
      json = JSON.parse(json);
    }
    return callback(json);
  });
}
