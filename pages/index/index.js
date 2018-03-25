//index.js
//获取应用实例
const md5 = require('../../utils/md5.js');
const base64 = require('../../utils/base64.js');
const app = getApp();
const player = wx.createInnerAudioContext();

Page({
    recorderManager: null,
    data: {
        textInput: '',
        inputRecordings: [],
        intereactions: [],
        iPhoneX: false,
        isRecording: false,
        APP_NAME: "我的测试12138",
        APP_ID: "5a9f7bb0",
        API_KEY: "166f479fabbd4241ab87b916a86f3364",
        AIUI_HOST: "http://api.xfyun.cn",
        TEXT_SEMANTIC_ENDPOINT: "/v1/aiui/v1/text_semantic",
        SCENE: "main"
    },
    loadHistorys: function (){
        var that = this;
        wx.getStorage({
            key: 'chats',
            success: function(res) {
                if (res.data) {
                    that.setData({
                        inputRecordings: res.data.recordings,
                    });
                }
            },
        });
    },
    saveToHistory: function () {
        var that = this;
        wx.setStorage({
            key: 'chats',
            data: {
                recordings: that.data.inputRecordings,
            }
        });
    },
    onHide: function () {
        this.saveToHistory();
    },
    onLoad: function () {
        this.loadHistorys();
        this.recorderManager = wx.getRecorderManager();
        this.setData({
            iPhoneX: app.globalData.isiPhoneX,
        });
        var that = this;

        wx.getSetting({
            success(res) {
                if (!res.authSetting['scope.record']) {
                    wx.authorize({
                        scope: 'scope.record',
                        success() {
                            // 用户已经同意小程序使用录音功能，后续调用 wx.startRecord 接口不会弹窗询问
                            console.log('Can Record Now');
                        }, fail() {
                            console.log('Can not Record');
                        }
                    });
                }
            }
        });

        this.recorderManager.onStart(() => {
            console.log('recorder start')
            that.setData({
                isRecording: true,
            });
        });
        this.recorderManager.onResume(() => {
            console.log('recorder resume')
        });
        this.recorderManager.onPause(() => {
            console.log('recorder pause')
        });
        this.recorderManager.onStop((resR) => {
            const { tempFilePath } = resR
            that.setData({
                isRecording: false,
            });
            wx.saveFile({
                tempFilePath: resR.tempFilePath,
                success: function (res) {
                    var savedFilePath = res.savedFilePath;
                    console.log('recorder stop', res);
                    const result = {
                        url: savedFilePath,
                        response: null,
                    };
                    wx.showLoading({
                        title: '正在提问',
                    });
                    wx.uploadFile({
                        url: 'http://106.14.7.201:3000/audioSementic',
                        filePath: savedFilePath,
                        name: 'file',
                        success: function(res) {
                            console.log("upload audio success ", res.data);
                            var intereactions = that.data.intereactions;
                            result.response = res.data;
                            intereactions.push(result);
                            that.setData({
                                intereactions: intereactions
                            });
                        },
                        fail: function(e) {
                            console.log(e);
                        }, complete: function (e) {
                            wx.hideLoading();
                        }
                    });
                    var inputs = that.data.inputRecordings;
                    inputs.push(result);
                    that.setData({
                        inputRecordings: inputs
                    });
                }
            })
        });
        this.recorderManager.onFrameRecorded((res) => {
            const { frameBuffer } = res
            console.log('frameBuffer.byteLength', frameBuffer.byteLength)
        });
    },
    responseFromIntereaction: function(url) {
        var intereactions = this.data.intereactions;
        for (var intereaction in intereactions) {
            if (intereaction.url == url) {
                return intereaction;
            }
        }
        return null;
    },
    queryConfirmed: function (e) {
        wx.showLoading({
            title: '正在发问...',
        });
        const text = this.data.textInput;
        var that = this;
        wx.request({
            url: 'http://106.14.7.201:3000/textSemectic?q='+encodeURI(text),
            success: function (e) {
                const interactions = that.data.intereactions;
                const result = {
                    url: null,
                    response: e.data,
                }
                interactions.push(result);
                that.setData({
                    intereactions: interactions,
                });
            }, fail: function (e) {

            }, complete: function (e) {
                wx.hideLoading();
            }
        })
        // const appid = this.data.APP_ID;
        // console.log('X-Appid:' + appid);

        // var timestamp = Date.parse(new Date());
        // var curTime = timestamp / 1000;
        // console.log('X-CurTime:' + curTime);

        // var xParam = {
        //     "userid": "user_0001",
        //     "scene": "main"
        // }
        // xParam = JSON.stringify(xParam);
        // var xParamBase64 = base64.CusBASE64.encoder(xParam);
        // console.log('X-Param:' + xParamBase64);

        // const text = this.data.textInput;
        // var textBase64 = base64.CusBASE64.encoder(text);
        // var bodyData = "text=" + textBase64;
        // console.log('body: ' + bodyData);

        // var apiKey = this.data.API_KEY;
        // var token = apiKey + curTime + xParamBase64 + bodyData;

        // console.log('token: ' + token);
        // var xCheckSum = md5.hexMD5(token);
        // console.log('X-CheckSum:' + xCheckSum);

        // const url = this.data.AIUI_HOST + this.data.TEXT_SEMANTIC_ENDPOINT;

        // wx.request({
        //     url: url,
        //     method: 'POST',
        //     header: {
        //         "X-Appid": appid,
        //         "X-CurTime": curTime,
        //         "X-Param": xParamBase64,
        //         "X-CheckSum": xCheckSum,
        //         'Content-Type': 'application/x-www-form-urlencoded',
        //     },
        //     data: bodyData,
        //     success: function(res) {
        //         console.log(res);
        //     },
        //     complete: function () {
        //         wx.hideLoading();
        //     }
        // });
    },
    textInput: function (e) {
        const input = e.detail.value;
        this.setData({
            textInput: input,
        });
    },
    startRecord: function() {
        const options = {
            duration: 10000,
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3',
            frameSize: 30
        }
        var that = this;
        this.recorderManager.start(options);
        wx.showLoading({
            title: '在听...',
        });

        this.setData({
            isRecording: true,
        });
    },
    endRecord: function() {
        wx.hideLoading();
        this.recorderManager.stop();
    },
    playAudio: function(e) {
        var url = e.target.dataset.url;
        if (url) {
            if (!player.paused) {
                player.pause();
            }
            player.src = url;
            player.play();
        }
    },
    getUserInfo: function (e) {
        console.log(e)
        app.globalData.userInfo = e.detail.userInfo
        this.setData({
            userInfo: e.detail.userInfo,
            hasUserInfo: true
        })
    }
})
