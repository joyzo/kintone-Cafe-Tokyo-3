/*
 * 一覧画面に地図を表示するサンプルプログラム
 * Copyright (c) 2013 Cybozu
 *
 * Licensed under the MIT License
 *
 * https://cybozudev.zendesk.com/hc/ja/articles/202341964 
 *
 */

(function () {

    "use strict";

    // 緯度、経度を空にします
    function emptyLatLng(event){

        // event よりレコード情報を取得します
        var rec = event['record'];

        // 保存の際に緯度、経度を空にします
        rec['lat']['value'] = '';
        rec['lng']['value'] = '';
        return event;

    }

    // 詳細画面を開いた時に実行します
    function detailShow(event){
        loadGMap();
        waitLoaded(event, 'detail', 10000, 100);
    }

    // 一覧画面を開いた時に実行します
    function indexShow(event){
        loadGMap();
        waitLoaded(event, 'index', 10000, 100);
    }

    // Google Map を Load します
    function loadGMap(){

        // document.write を定義します
        var nativeWrite = document.write;
        document.write = function(html) {
            var m = html.match(/script.+src="([^"]+)"/);
            if     (m) { load(m[1]);}
            else         { nativeWrite(html); }
        };

        // Google Map の API ライブラリをロードします
        load('https://maps-api-ssl.google.com/maps/api/js?v=3&sensor=false');

    }

    // Google Map がロードされるまで待機します
    function waitLoaded(event, mode, timeout, interval) {
        setTimeout(function () {
            timeout -= interval;
            if ((typeof google !== 'undefined')
                && (typeof google.maps !== 'undefined')
                && (typeof google.maps.version !== 'undefined')) {

                if (mode === 'detail'){             // 詳細画面の場合
                    setLocationDetail(event);
                } else if (mode === 'index'){ // 一覧画面の場合
                    setLocationIndex(event);
                }
            } else if (timeout > 0) {    //　ロードされるまで繰り返します
                waitLoaded(event, mode, timeout, interval);
            }
        }, interval);
    }

    // 地図を「住所」フィールドの下に表示します
    // 緯度・経度がない場合は、住所をもとに緯度・経度を算出し、
    // フィールドに値を入れた後、レコードを更新します
    function setLocationDetail(event) {

        // レコード情報を取得します
        var rec = event['record'];

        // Google Geocoder を定義します
        var gc = new google.maps.Geocoder();

        // 住所が入力されていなければ、ここで処理を終了します
        if (rec['Address']['value'] === undefined){return;}
        if (rec['Address']['value'].length === 0){return;}

        //　緯度・経度が入力されていなければ、住所から緯度・経度を算出します
        if (rec['lat']['value'] === undefined ||
            rec['lng']['value'] === undefined ||
            rec['lat']['value'].length === 0 ||
            rec['lng']['value'].length === 0){

            // Geocoding API を実行します
            gc.geocode({
                address: rec['Address']['value'],
                language: 'ja',
                country: 'JP'
            }, function(results, status) {

                //　住所が検索できた場合、開いているレコードに対して
                // 緯度・経度を埋め込んで更新します
                if (status === google.maps.GeocoderStatus.OK) {

                    // 更新するデータの Object を作成します
                    var objParam = {};
                    objParam['app'] = kintone.app.getId();// アプリ番号
                    objParam['id'] = kintone.app.record.getId();    // レコードID
                    objParam['record'] = {};
                    objParam['record']['lat'] = {}; // 緯度
                    objParam['record']['lat']['value'] = results[0].geometry.location.lat();
                    objParam['record']['lng'] = {}; // 経度
                    objParam['record']['lng']['value'] = results[0].geometry.location.lng();

                    // レコードを更新します
                    kintone.api('/k/v1/record', 'PUT', objParam, function(resp){
                        // 成功時は画面をリロードします
                        location.reload(true);
                    }, function(resp) {
                        // エラー時はメッセージを表示して、処理を中断します
                        alert('error->' + resp);
                        return;
                    });
                }
            });
        }

        // 地図を表示する div 要素を作成します
        var mapEl_address = document.createElement('div');
        mapEl_address.setAttribute('id', 'map_address');
        mapEl_address.setAttribute('name', 'map_address');
        mapEl_address.setAttribute('style', 'width: 300px; height: 250px');

        // 「Map」スペース内に mapEl_address で設定した要素を追加します
        var elMap = kintone.app.record.getSpaceElement('Map');
        elMap.appendChild(mapEl_address);

        // 「Map」スペースの親要素のサイズを変更します
        var elMapParent = elMap.parentNode;
        elMapParent.setAttribute('style', 'width: 300px; height: 250px');

        // ポイントする座標を指定します
        var point = new google.maps.LatLng(rec['lat']['value'],rec['lng']['value']);

        // 地図の表示の設定(中心の位置、ズームサイズ等)を設定します
        var opts = {
            zoom: 15,
            center: point,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scaleControl: true
        };

        // 地図を表示する要素を呼び出します
        var map_address = new google.maps.Map(document.getElementById('map_address'), opts);

        // マーカーを設定します
        var marker = new google.maps.Marker({
            position: point,
            map: map_address,
            title: rec['Address']['value']
        });

    }

    // 地図を一覧画面のメニュー下のスペースに表示します
    function setLocationIndex(event) {

        var lat = new Array(), lng = new Array(), recno = new Array();
        var els, rec, i;

        // レコード情報を取得します
        var rec = event['records'];

        // 一覧に表示されているすべてのレコードの緯度・経度とレコードIDを配列に格納します
        for (i=0; i < rec.length ; i+=1) {
            if (rec[i].lat.value !== undefined && rec[i].lng.value !== undefined){
                if (rec[i].lat.value.length > 0 && rec[i].lng.value.length > 0){
                    lat.push( parseFloat(rec[i].lat.value)); // 緯度
                    lng.push( parseFloat(rec[i].lng.value)); // 経度
                    recno.push( parseFloat(rec[i].record_no.value)); // レコードID
                }
            }
        }

        // 一覧の上部部分にあるスペース部分を定義します
        var elAction = kintone.app.getHeaderSpaceElement();

        // すでに地図要素が存在する場合は、削除します
        // ※ ページ切り替えや一覧のソート順を変更した時などが該当します
        var check = document.getElementsByName ('map');
        if (check.length !== 0){
            elAction.removeChild(check[0]);
        }

        // 地図を表示する要素を定義し、スペース部分の要素に追加します
        var mapEl = document.createElement('div');
        mapEl.setAttribute('id', 'map');
        mapEl.setAttribute('name', 'map');
        mapEl.setAttribute('style', 'width: auto; height: 250px; margin-right: 30px; border: solid 2px #c4b097');
        elAction.appendChild(mapEl);

        // 一覧に表示されているレコードで、緯度・経度の値が入っている
        // 一番上のレコードの緯度・経度を取得します(地図の中心になります)
        var latlng = 0;
        for (i=0; i < lat.length ; i+=1){
            if (isNaN(lat[i]) === false && isNaN(lng[i]) === false){
                latlng = new google.maps.LatLng(lat[i],lng[i]);
                break;
            }
        }

        // もし、緯度・経度に値が入っているレコードがなければ、ここで処理を終了します
        if (latlng === 0){ return;}

        // 表示する地図の設定を行います
        var opts = {
            zoom: 12,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scaleControl: true,
            title: 'target'
        };

        // 地図の要素を定義します
        var map = new google.maps.Map(document.getElementById('map'), opts);

        var marker = new Array();
        var m_latlng = new Array();

        // 緯度・経度をもとに、地図にポインタを打ち込みます
        for (i=0; i < lat.length ; i+=1){
            if (isNaN(lat[i]) === false && isNaN(lng[i]) === false){
                m_latlng[i] = new google.maps.LatLng(lat[i],lng[i]);
                marker[i] = new google.maps.Marker({
                    position: m_latlng[i],
                    map: map,
                    // ポインタのアイコンは Google Charts を使用します
                    icon: 'https://chart.googleapis.com/chart?chst=d_bubble_text_small&chld=edge_bc|' + recno[i] + '|FF8060|000000'
                });
            }
        }
    }

    // 一覧画面で編集モードになった時に実行されます
    function indexEditShow(event){
        var record = event.record;
        // 住所フィールドを使用不可にします
        record['Address']['disabled'] = true;
        return event;
    }

    // ヘッダに要素を追加します
    function load(src) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        head.appendChild(script);
    }

    // 登録・更新イベント(新規レコード、編集レコード、一覧上の編集レコード)
    kintone.events.on(['app.record.create.submit',
                       'app.record.edit.submit',
                       'app.record.index.edit.submit'], emptyLatLng);

    // 詳細画面が開いた時のイベント
    kintone.events.on('app.record.detail.show', detailShow);

    // 一覧画面が開いた時のイベント
    kintone.events.on('app.record.index.show', indexShow);

    // 一覧画面で編集モードにした時のイベント
    kintone.events.on('app.record.index.edit.show', indexEditShow);

})();
