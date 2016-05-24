var appid;
var appsig;
var appsigdata;
var baseurl;
var loginSuccessCallBack;

var sessionInfo = {
    qbopenid: "",
    qbopenkey: "",
    refreshToken: '',
    nickName: '',
    avatarUrl: ''
};

var store = {
    lcst: window.localStorage,
    read: function (key) {
        var value = (store.lcst && store.lcst.getItem(key)) || "";
        return value;
    },
    write: function (key, value) {
        store.lcst && store.lcst.setItem(key, value);
    },
    getAll: function () {
        var data = {}, key;
        for (var i = 0; i < store.lcst.length; i++) {
            key = store.lcst.key(i);
            data[key] = store.lcst.getItem(key);
        }
        return data;
    },
    clear: function () {
        store.lcst && store.lcst.clear();
    }
};

var util = {
    /** Toast提供信息
     *
     * @param msg 文本信息
     * @param duration Toast显示持续时间
     */
    toast: function (msg, duration, hasSpinIcon, middle, noease) {
        duration = duration || 2000;
        hasSpinIcon && (msg = '<span class="loader"></span><span class="loadText">' + msg + '</span>');
        var content = util.addNode("div", "mod-toast-content", null, msg);
        var box = util.addNode("div", "mod-toast", "toast" + parseInt(Math.random() * 100000));
        box.style.display = "block";
        box.style.opacity = 0;
        middle && ( box.style.bottom = "50%" );
        box.appendChild(content);

        var easeTime = (noease && 10 ) || 200;

        var delay = setTimeout(function () {
            box.style.opacity = 1; //设置不透明度
            clearTimeout(delay);

            delay = setTimeout(function () {
                clearTimeout(delay);
                box.style.opacity = 0; //设置不透明度

                delay = setTimeout(function () {
                    clearTimeout(delay);
                    util.closeDialog(box); //移除toast
                }, easeTime);
            }, duration);
        }, easeTime);

        document.body.appendChild(box);
    },
    addNode: function (tag, className, id, text) {
        var node = document.createElement(tag);
        id && (node.id = id);
        className && (node.className = className);
        text && (node.innerHTML = text);
        return node;
    },
    closeDialog: function (dialog) {
        if (dialog && dialog.parentNode != null)
            dialog.parentNode.removeChild(dialog);
        dialog = undefined;
    },
    getKey: function (key, srcString) {
        var result,
            sourceParams = (typeof srcString === 'string') ? srcString : window.location.search,
            regExp = new RegExp("(\\?|&)+" + key + "=([^&\\?]*)");

        result = sourceParams.match(regExp);
        return (!result ? "" : unescape(result[2]));
    },
    debug: function (msg, level) {
        level = level || 1;
        if (level == 1)
            console.info(msg);
        else if (level == 2)
            console.warn(msg);
        else if (level == 3)
            console.error(msg);
    }
};

var devServer = {
    getSig: function (api, option, succCallBack, errorCallBack) {
        //var url = QBH5Config.devDomain + "/api/getsign?id=" + QBH5Config.appid + "&test=" + QBH5Config.isTest;
        var url = baseUrl+"/SDK/datasig";
        option.api = api;
        option.url = "/";
        option.method = "POST";
        //请求开发者服务端,并返回签名
        $.ajax({
            type: "POST",
            url: url,
            data: option,
            dataType: "json",
            success: succCallBack,
            error: errorCallBack || function errorCallBack(err) {
                util.toast("从开发者服务端获取签名失败！" + err);
            }
        });
    }
};

var SDK;
(function (SDK) {
        
function myTest()
{

}
    
SDK.myTest = myTest;
    
function _autoLogin(appId,appSig,appSigData,baseUrl,successCallback)
{
    appid = appId;
    appsig = appSig;
    appsigdata = appSigData;
    baseurl = baseUrl;

    alert(appsig+"~~"+appid+"~~"+appsigdata+"~~");
    
    loginSuccessCallBack = successCallback;
    checkAvailableLogin();
    //配置SDK属性,向SDK注册登录的回调
    QBH5.config && QBH5.config({
    loginCallBack: loginCallBack
    })
    //检查是否已登录
    checkLogin();      
}

SDK.autoLogin = _autoLogin;

function logout() {
    var option = {
        appid: appid,
        qbopenid: localStorage.getItem("qbopenid"),
        loginType: localStorage.getItem("loginType")
    };
    QBH5.logout(option, function (rsp) {
        util.debug(rsp);
        var url = window.location.href;

        var sandbox = QBH5.sandbox || "";
        sandbox = sandbox && ("?sandbox="+sandbox);
        window.location.href = url.substring(0, url.lastIndexOf("/")) + "/login.html" + sandbox;
    });
}

SDK.logout = logout;

function pay(pid, product, price, count) {
    //到开发者服务端请求生成签名及返回相关的明细信息
    var option = {
                appid: appid,
                appsig: "",
                paysig: "",
                qbopenid: sessionInfo.qbopenid,
                qbopenkey: sessionInfo.qbopenkey,
                payItem: product + "*" + price + "*" + count,
                payInfo: product + "*" + pid,
                reqTime: parseInt(new Date().getTime() / 1000),
                customMeta: product + " x " + count
            };

            devServer.getSig("pay", option, function succCallBack(rspDev) { //开发者服务端签名成功
                if (rspDev.result == 0) {
                    option.paysig = rspDev.data.reqsig;
                    option.reqTime = rspDev.data.reqTime;

                    var callback = function (rsp) {
                        if (typeof rsp === "object") {
                            if (rsp.msg == "order error, ErrorCode(1101)") {
                                util.toast("登录已过期，请重新登录！");
                            } else {
                                if (rsp.result === 0) {
                                    util.toast("支付操作完成");
                                }
                                else if (rsp.result === -2 || rsp.result === 903) {
                                    util.toast("已取消支付！");
                                }
                                else if (rsp.result === -3) {
                                    util.toast("登录已过期，程序将自动刷新授权！");

                                    setTimeout(function () {
                                        refreshToken(function () {
                                            pay(pid, product, price, count);
                                        });
                                    }, 3000);
                                } 
                                else if (rsp.result === -4) {
                                    util.toast("登录已过期，程序将自动刷新授权！");

                                    setTimeout(function () {
                                        refreshToken(function () {
                                            pay(pid, product, price, count);
                                        });
                                    }, 3000);
                                } 
                                else if (rsp.result === 19) {
                                    util.toast("登录态已过期，需要重新登录！");
                                    setTimeout(function () {
                                        logout();
                                    }, 3000);
                                } 
                                else {
                                    util.toast("支付失败！(" + rsp.result + "," + rsp.msg + ")");
                                }
                            }
                        } else {
                            util.toast("支付完成！可跳到应用自定义界面(如显示发货结果)。");
                            util.debug(rsp);
                        }
                    };
                    QBH5.pay(option, callback);
                } else {
                    util.toast("从开发者服务端获取签名失败！")
                }
            });
}

SDK.pay = pay;


        function getFriends(){
            var option = {
                appid: appid,
                qbopenid: sessionInfo.qbopenid,
                qbopenkey: sessionInfo.qbopenkey
            };
            var callback = function (rsp) {
                if (typeof rsp === "object") {
                    if (rsp.result === 0) {
                        //rsp = JSON.stringify(rsp.friends);
                        return rsp.friends;
                    } else {
                        util.toast("获取好友失败(" + rsp.msg + ")");
                        return null;
                    }
                } else {
                    util.debug(rsp);
                    return null;
                }
            };
            QBH5.getGameFriends(option, callback);
        }
SDK.getFriends = getFriends;

})(SDK || (SDK = {}));

//登录回调函数
function loginCallBack(rspObj) {
    //登录成功
    if (rspObj && rspObj.result === 0) {
        alert("登陆成功");
        //更新缓存
        var ls = window.localStorage;
        ls.setItem("qbopenid", rspObj.qbopenid);
        ls.setItem("qbopenkey", rspObj.qbopenkey);
        ls.setItem("refreshToken", rspObj.refreshToken);
        ls.setItem("nickName", rspObj.nickName);
        ls.setItem("avatarUrl", rspObj.avatarUrl);
        
        //调用 TS 登录
        loginSuccessCallBack(rspObj.qbopenid,rspObj.nickName,rspObj.avatarUrl);  
        
    } else if (rspObj.result == 602) {
        alert("当前浏览器不支持该登录方式！");
    } else {
        //登录失败处理逻辑
        alert("登录失败"+rspObj.result+"  msg:"+rspObj.msg);
    }
}

function checkAvailableLogin() {
    QBH5.getAvailableLoginType({appid: appid}, function (rsp) {
        if (rsp && rsp.result === 0) {
            var types = rsp.loginTypes, html = "";           
            for (var i = 0; i < types.length; i++) {
                if (types[i].accInfo["qbopenid"]) {
                    html = types[i].accInfo["avatarUrl"];
                }
                if (types[i]["loginType"] === "qq") {
                    document.getElementById("qqlogin").style.display = "block";
                    if(html!==""){
                        $("#qqlogin").attr("src",html);                         
                    }
                } else if (types[i]["loginType"] === "wx") {
                    document.getElementById("wxlogin").style.display = "block";
                    if(html!==""){
                        $("#wxlogin").attr("src",html); 
                    }
                }
            }
        }
    });
}

/** 检查是否已经登录 */
function checkLogin() {
    var ls = window.localStorage;
    var openid = ls.getItem("qbopenid");
    var openkey = ls.getItem("qbopenkey");
    var refreshToken = ls.getItem("refreshToken");


    if (openid && openkey && refreshToken) { //已登录
        var option = {
            appid: appid,
            qbopenid: openid,
            refreshToken: refreshToken
        };
        //刷新token
        QBH5.refreshToken(option, function (rspObj) {
            if (rspObj) {
                if (rspObj.result === 0) { //回调结果成功
                    //更新缓存localStorage
                    var ls = window.localStorage;
                    ls.setItem("qbopenid", rspObj.qbopenid);
                    ls.setItem("qbopenkey", rspObj.qbopenkey);

                    showMain();//加载/跳转游戏主界面
                    return; //刷新成功返回
                } else {
                    console.warn(rspObj);
                }
            } else {
                console.warn("Empty refreshToken result");
            }
            showLogin();// //刷新失败，加载/跳转到登录界面
        });
    } else { //未登录
        showLogin();
    }
}  

function refreshToken(callBack) {
    var option = {
    appid: appid,
    qbopenid: sessionInfo.qbopenid,
    refreshToken: sessionInfo.refreshToken
    };
    var callback = function (rspObj) {
        if (typeof rspObj === "object") {
        //rsp = JSON.stringify(rsp);
        if (rspObj.result === 0 && rspObj.qbopenkey) {
            util.toast("刷新成功！登录有效期延长2小时。");
            var ls = window.localStorage;
            ls.setItem("qbopenkey", rspObj.qbopenkey);
            sessionInfo.qbopenkey = rspObj.qbopenkey;
        } else if (rspObj.result == 11) {
            util.toast("登录已经过期，请重新登录！");
            setTimeout(function () {
            logout();
        }, 3000);
        } else {
            util.toast("刷新Token失败！");
            util.debug("刷新Token失败！" + JSON.stringify(rspObj), 2);
            }
        }
    };
    QBH5.refreshToken(option, callback);
}

        function recharge(amount) {
            //到开发者服务端请求生成签名及返回相关的明细信息
            var option = {
                appid: appid,
                paysig: "",
                qbopenid: sessionInfo.qbopenid,
                qbopenkey: sessionInfo.qbopenkey,
                reqTime: parseInt(new Date().getTime() / 1000),
                amount:amount
            };

            devServer.getSig("recharge", option, function succCallBack(rspDev) { //开发者服务端签名成功
                if (rspDev.result == 0) {
                    option.paysig = rspDev.data.reqsig;
                    option.reqTime = rspDev.data.reqTime;

                    var callback = function (rsp) {
                        if (typeof rsp === "object") {
                            if (rsp.msg == "order error, ErrorCode(1101)") {
                                util.toast("登录已过期，请重新登录！");
                            } else {
                                if (rsp.result === 0) {
                                    util.toast("支付操作完成");
                                }
                                else if (rsp.result === -2 || rsp.result === 903) {
                                    util.toast("已取消支付！");
                                }
                                else if (rsp.result === -3) {
                                    util.toast("登录已过期，程序将自动刷新授权！");

                                    setTimeout(function () {
                                        refreshToken(function () {
                                            pay(pid, product, price, count);
                                        });
                                    }, 3000);
                                } else if (rsp.result === 19) {
                                    util.toast("登录态已过期，需要重新登录！");
                                    setTimeout(function () {
                                        logout();
                                    }, 3000);
                                } else {
                                    util.toast("支付失败！(" + rsp.result + "," + rsp.msg + ")");
                                }
                            }
                        } else {
                            util.toast("支付完成！可跳到应用自定义界面(如显示发货结果)。");
                            util.debug(rsp);
                        }
                    };
                    QBH5.recharge(option, callback);
                } else {
                    util.toast("从开发者服务端获取签名失败！")
                }
            });
        }

        function share(toApp) {
            var option = {
                url: window.location.href,
                title: window.document.title,
                description: "一点即玩的游戏",
                imgUrl: "http://res.imtt.qq.com/activity/resource_files/empower_logo.png",
                imgTitle: "QB游戏",
                cusTxt: "测试游戏Demo是一款专注于测试demo api的游戏",
                toApp: toApp // 1:微信 ; 8 :朋友圈; 3: qq空间 ; 4:qq好友 ; 0: 显示面板
            };
            var callback = function (rsp) {
                if (typeof rsp === "object") {
                    if (rsp.result == 0) {
                        util.toast("分享回调成功！");
                    } else if (rsp.result === 4001) {
                        util.toast("已取消分享！");
                    }
                }
            };
            QBH5.share(option, callback);
        }

/** 显示登录界面 **/
function showLogin() {
    //登录按钮点击事件
    $("#qqlogin").on("click", function () {
        login("qq");
    });

    $("#wxlogin").on("click", function () {
        login("wx");
    });

    //调用sdk的login api方法
function login(loginType) {
    var option = {
            appid: appid,
            appsig: appsig,
            appsigData: appsigdata,
            loginType: loginType
        };      
        alert(option.appid+"~~"+option.appsig+"~~"+appsigdata+"~~"+loginType);
        QBH5.login(option, loginCallBack);
    }
}

/** 显示游戏主界面 **/
function showMain() {

}