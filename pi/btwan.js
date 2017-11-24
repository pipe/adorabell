var beacon = require("eddystone-beacon");
var util = require('util');
var bleno = require('bleno');
var wpa_cli = require('wireless-tools/wpa_cli');


DEVICE_NAME = 'Pipe';

var ip= "0.0.0.0";
var readUUIDs = [];

process.env['BLENO_DEVICE_NAME'] = DEVICE_NAME;

var WriteByteCharacteristic = function(uuid) {
  bleno.Characteristic.call(this, {
    uuid: uuid,
      properties: ['write', 'writeWithoutResponse'] ,
      value:null
  });
};

util.inherits(WriteByteCharacteristic, bleno.Characteristic);

WriteByteCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    console.log('WriteOnlyCharacteristic write request: ' + JSON.stringify(data) + ' ' + offset + ' ' + withoutResponse);
    console.log('WriteOnlyCharacteristic write request: ' +this.uuid);
    this.value = data;
    check_wan();
    callback(this.RESULT_SUCCESS);
};

var ReadByteCharacteristic = function(uuid,val) {
    bleno.Characteristic.call(this, {
        uuid: uuid,
        properties: ['read'],
        value: null
    });
    this._value = val;
};

util.inherits(ReadByteCharacteristic, bleno.Characteristic);

ReadByteCharacteristic.prototype.onReadRequest = function(offset, callback) {
    console.log('reading uuid '+this.uuid);
    readUUIDs.push(this.uuid);
    callback(this.RESULT_SUCCESS, this._value);
};



console.log("waiting for bleno");

bleno.on('stateChange', function(state) {
  console.log(state);

  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, ['919e']);
    beacon.advertiseUrl("https://pi.pe/iot/wi.html", {name: DEVICE_NAME});
  } else {
    if (state === 'unsupported'){
      console.log("BLE and Bleno configurations not enabled on board");
    }
    bleno.stopAdvertising();
  }
});

function h2b(hex){
var bin = [];
 for(var i=0; i< hex.length-1; i+=2){
    bin.push(parseInt(hex.substr(i, 2), 16));
 }
return bin;
}
function ab2str(buf) {
    return buf.toString();
}
function wanReport(act,err,stat){
    console.log("act = "+act);
    if (err) {
        // most likely the set values for the specified id are wrong
        console.dir("error ->"+err);
    } else {
        // successfully connected to the new network
        console.dir("result ->"+JSON.stringify(stat));
    }
}
function wanUp(ssid,psk){
    wpa_cli.add_network('wlan0',function(err, status) {
        var netno = status.result ;
        wanReport("netno ",err,status);
        wpa_cli.set_network('wlan0',netno,"ssid",ssid,function(err, status) {
            wanReport("ssid",err,status);
            wpa_cli.set_network('wlan0',netno,"psk",psk,function(err, status) {
                wanReport("psk",err,status);
                wpa_cli.enable_network('wlan0',netno,function(err, status) {
                    wanReport("enable",err,status);
                    wpa_cli.save_config('wlan0',function(err, status) {
                        wanReport("save",err,status);
                        if (!err){
                            console.log("Configured LAN now check it is up...")
                            setTimeout(function () {
                                check_wan();
                            }, 2000);
                        }
                    });
                });
            });
        });
    });
}
var statusCharacteristic = new ReadByteCharacteristic('fc0a',new Buffer("off"));
var ssidCharacteristic = new WriteByteCharacteristic('fc0b');
var pskCharacteristic = new WriteByteCharacteristic('fc0c');
var fingerprintACharacteristic = new ReadByteCharacteristic('fc0d',new Buffer(h2b(process.argv[2])));
var fingerprintBCharacteristic = new ReadByteCharacteristic('fc0e',new Buffer(h2b(process.argv[3])));
var nonceCharacteristic = new ReadByteCharacteristic('fc0f',new Buffer(h2b(process.argv[4])));
statusCharacteristic.onReadRequest = function(offset, callback) {
    console.log('reading uuid '+this.uuid);
    readUUIDs.push(this.uuid);
    if (ip) {
        this._value = new Buffer(ip);
    }
    callback(this.RESULT_SUCCESS, this._value);
};

bleno.on('advertisingStart', function (error) {
    console.log('advertisingStart: ' + (error ? error : 'success'));

    if (error) {
        return;
    }
    wpa_cli.status('wlan0', function (err, status) {
        wanReport("status", err, status);
        if (status.ip) {
            ip = status.ip;
            console.log("initial ip is " + status.ip);
        }
        console.log('setting service');
        bleno.setServices([
            new bleno.PrimaryService({
                uuid: '919e',
                characteristics: [
                    statusCharacteristic,
                    ssidCharacteristic, pskCharacteristic,
                    fingerprintACharacteristic, fingerprintBCharacteristic,
                    nonceCharacteristic
                ]
            })
        ]);
    });
});
function read_enough() {
    var ret = true;
    var required = [statusCharacteristic, fingerprintACharacteristic, nonceCharacteristic];
    required.forEach(function (v) {
        console.log("looking for "+JSON.stringify(v));
        var idx = readUUIDs.indexOf(v.uuid);
        console.log("in "+JSON.stringify(readUUIDs));
        console.log("idx is  "+idx);
        if (idx == -1) {
            ret = false
        }
    });
    return ret;
}
bleno.on('accept', function(clientAddress) {
  console.log("Accepted Connection: " + clientAddress);
});

bleno.on('disconnect', function(clientAddress) {
  console.log("Disconnected Connection: " + clientAddress);
});
function check_wan() {
    wpa_cli.status('wlan0', function (err, status) {
        wanReport("status", err, status);
        if (!err) {
            if (!status.ip) {
                if ((ssidCharacteristic.value != null) && (pskCharacteristic.value != null)) {
                    var s = ab2str(ssidCharacteristic.value);
                    s = '\\\"' + s + '\\\"';
                    var p = ab2str(pskCharacteristic.value);
                    p = '\\\"' + p + '\\\"';
                    console.log("try setting up wan " + s + " with " + p);
                    wanUp(s, p);
                }
            } else {
                if (ip != status.ip) {
                    console.log("new ip is " + status.ip);
                    wpa_cli.save_config('wlan0', function (err, status) {
                        wanReport("save", err, status);
                        if (read_enough()) {
                            console.log("Page has read enough characteristics, shutting down BT ");
                            process.exit(0);
                        }
                    });
                } else {
                    console.log("existing ip is " + status.ip);
                    if (read_enough()) {
                        console.log("Page has read enough characteristics, shutting down BT ");
                        process.exit(0);
                    }
                }
            }
        }
    });
}
setInterval(function () {
    check_wan();
}, 10000);



