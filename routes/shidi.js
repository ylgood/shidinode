const router = require('koa-router')();
const axios = require('axios');

const {write, read, writeFile, readAndWriteFile, readFile, getArtById} = require('../save/log');

let token = '';
let token_time = 0;
let expires_in = 0;

/** 用户 */
let user = [];
let testUser = {
    "_id": "0000",
    "nickName": "试用",
    "password": "0000",
    "type": "",
    "_openid": "0000",
    "role": 0,
    "avatarUrl": "https://wx.qlogo.cn/mmhead/Q3auHgzwzM469CTJJOVGEAPm6JQpoo8FJAukKhIfsVQQibokiboENx2w/0",
    "phoneNumber": "0000",
    "code": "0000",
    "artNum": 2,
    "art": "b00064a760bba1041e089bb464619aa5",
    "artNick": "",
    "artNicknNum": 0
};
let user_local = [];

let config = {};
let configCategory = {};
let configCategoryn = {};

let artlist = [];
let artlistn = [];

let arthot = [];
let arthotNow = 0;
let arthotn = [];
let arthotnNow = 0;

let artTop = [];
let artTopn = [];

let localArtList = [];
let nextArt = -1;


const baseUrl = (token, name) => `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${token}&env=dayup-y2041&name=${name}`;

router.prefix('/api/shidi');


router.get('/code', async (ctx, next) => {
    const {token, code, id} = ctx.request.query;

    ctx.body = {
        code: encodeToken(token, code, id)
    }
});
router.get('/decode', async (ctx, next) => {
    const {decode} = ctx.request.query;
    ctx.body = {
        code: decodeToken(decode)
    }
});


/**
 * 写库
 */
router.get('/ylwrite', async (ctx, next) => {
    write(user_local, 'user_local');
    write(user, 'user');
    write(config, 'config');
    write(configCategory, 'configCategory');
    write(configCategoryn, 'configCategoryn');
    write(artlist, 'artlist');
    write(artlistn, 'artlistn');
    write(localArtList, 'localArtList');
    const other = {
        token, token_time, expires_in, nextArt, arthotNow, arthotnNow, arthot, arthotn, artTop, artTopn
    };
    write(other, 'other');
    ctx.body = {
        user_local,
        user,
        config,
        configCategory,
        configCategoryn,
        artlist,
        artlistn,
        other,
        nextArt,
        localArtList
    }
});
router.get('/ylnow', async (ctx, next) => {
    const other = {
        token, token_time, expires_in, nextArt, arthotNow, arthotnNow, arthot, arthotn, artTop, artTopn
    };
    ctx.body = {
        user_local,
        user,
        config,
        configCategory,
        configCategoryn,
        artlist,
        artlistn,
        other,
        nextArt,
        localArtList
    }
});

/**
 * 读库
 */
router.get('/ylread', async (ctx, next) => {
    user_local = read('user_local');
    user = read('user');
    config = read('config');
    configCategory = read('configCategory');
    configCategoryn = read('configCategoryn');
    artlist = read('artlist');
    artlistn = read('artlistn');
    localArtList = read('localArtList');
    const other = read('other');

    token = other.token;
    token_time = other.token_time;
    expires_in = other.expires_in;
    nextArt = other.nextArt;
    arthotNow = other.arthotNow || 0;
    arthotnNow = other.arthotnNow || 0;
    arthot = other.arthot || [];
    arthotn = other.arthotn || [];
    artTop = other.artTop || [];
    artTopn = other.artTopn || [];
    ctx.body = {
        user_local,
        user,
        config,
        configCategory,
        configCategoryn,
        artlist,
        artlistn,
        other,
        nextArt,
        localArtList
    }
});
router.get('/ylrefuse', async (ctx, next) => {
    await getToken();
    await getUserList(true);
    ctx.body = {
        user
    }
});

router.get('/ylroleId', async (ctx, next) => {
    try {
        const {yl = '', ylid = ''} = ctx.request.header;
        const {_openid, lou_type, lou_qu, lou_num, lou_fang, role} = user.find(i => i._id == ylid) || {};
        if (yl && ylid && role == 2) {
            sendMsg(_openid, '【系统消息】', `${lou_type}${lou_qu} ${lou_num}-${lou_fang}  🎉认证成功`, '欢迎加入社区系统，祝友爱。请刷新或登陆', (new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' ' + new Date().getHours() + ':' + new Date().getMinutes()))
        }
        ctx.body = {
            state: 1,
            data: role
        };

    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

/** ================================== 登陆 ================================== */

// 登陆
router.post('/login', async (ctx, next) => {
    const {yl = ''} = ctx.request.header;
    const userAgent = (ctx.request.header['user-agent'] || '').toLocaleLowerCase();
    if (!yl && (userAgent.indexOf('micromessenger') == -1)) {
        ctx.body = {
            state: 0,
            msg: '不行不要'
        };
        return
    }
    try {
        const {password = '', phoneNumber = '', code} = ctx.request.body;

        if (password === '0000' && phoneNumber == '0000' && code == '0000') {
            ctx.body = {
                state: 1,
                data: {
                    _id: '0000',
                    token: '0000',
                    nickName: "试用号",
                    role: 0,
                    avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLWO9KKtkJH6j2wXZ4MVLaDArI6RIObznwWQbvBn054uQrctueeibKbozDwKxxbcjlOr8agVFOmALg/132",
                }
            };
            return
        }


        if (!password || !phoneNumber || phoneNumber.length != 11 || !code || code.length != 4) {
            ctx.body = {
                state: 0,
                msg: '请输入正确账户和密码、验证码'
            };
            return
        }

        let item_local = user_local.find(i => i.phoneNumber == phoneNumber) || {};
        if (!item_local.phoneNumber) {
            item_local = {
                phoneNumber,
                date: new Date().getMonth() + '-' + new Date().getDate(),
                times: 0
            };
            user_local.push(item_local)
        }
        if (item_local.date != new Date().getMonth() + '-' + new Date().getDate()) {
            item_local.date = new Date().getMonth() + '-' + new Date().getDate();
            item_local.times = 0
        }

        if (item_local.times > 5) {
            ctx.body = {
                state: 0,
                msg: '错误输入过多，今日已被禁止登陆'
            };
            return
        }

        if (!checkCode(code)) {
            ctx.body = {
                state: 0,
                msg: '验证码不正确或已失效，请重新生成'
            };
            return
        }

        // 服务token
        await getToken();

        if (item_local._id) { // 已经使用过用户
            if (item_local.password == password) {
                if (item_local.code == code) { // 刷新token
                    if (item_local.token) {
                        ctx.body = {
                            state: 0,
                            msg: '账户已经登陆，请退出在进行本设备登陆'
                        };
                        return
                    }
                    item_local.token = makeRandom(16);
                    item_local.times = 0
                } else {
                    if (checkCode(item_local.code)) { // 今日已登陆，code未过期
                        item_local.times += 1;
                        ctx.body = {
                            state: 0,
                            msg: '请输入正确账户和密码、验证码'
                        };
                        return
                    } else { // 重新拉取 code
                        await getUserList(true);
                        const item = [testUser, ...user].find(i => i.phoneNumber == phoneNumber) || {};
                        if (item.code == code) {
                            item_local.code = item.code;
                            item_local.token = makeRandom(16);
                            item_local.times = 0
                        } else {
                            item_local.times += 1;
                            ctx.body = {
                                state: 0,
                                msg: '请输入正确账户和密码、验证码'
                            };
                            return
                        }
                    }

                }
            } else { // 错误登陆
                item_local.times += 1;
                ctx.body = {
                    state: 0,
                    msg: '请输入正确账户和密码、验证码'
                };
                return
            }
        } else { // 未使用的用户
            await getUserList(true);
            const item = [testUser, ...user].find(i => i.phoneNumber == phoneNumber) || {};
            if (item._id) {
                if (item.password == password) {
                    if (item.code == code) {
                        item_local._id = item._id;
                        item_local.code = item.code;
                        item_local.times = 0;
                        item_local.token = makeRandom(16);
                        item_local.password = item.password
                    } else {
                        item_local._id = item._id;
                        item_local.password = item.password;
                        item_local.code = item.code;
                        item_local.times += 1;
                        ctx.body = {
                            state: 0,
                            msg: '请输入正确账户和密码、验证码'
                        };
                        return
                    }
                } else {
                    item_local._id = item._id;
                    item_local.code = item.code;
                    item_local.password = item.password;
                    item_local.times += 1;
                    ctx.body = {
                        state: 0,
                        msg: '请输入正确账户和密码、验证码'
                    };
                    return
                }
            } else {
                item_local.times += 1;
                ctx.body = {
                    state: 0,
                    msg: '请输入正确账户和密码、验证码'
                };
                return
            }
        }

        ctx.body = {
            state: 1,
            data: {
                ...[testUser, ...user].find(i => i.phoneNumber == phoneNumber) || {},
                token: encodeToken(item_local.token, item_local.code, item_local._id),
                code: undefined,
                times: undefined,
                date: undefined,
                images: undefined,
                phoneNumber: undefined
            },

        }
    } catch (e) {
        ctx.body = {
            state: 0,
        }
    }
});

// 登出
router.post('/logout', async (ctx, next) => {

    const {headert = '', headeri = ''} = ctx.request.header;
    const {id = ''} = decodeToken(headert);
    if (id !== '0000' && id === headeri) {
        user_local = user_local.filter(i => i._id != id)
    }
    ctx.body = {
        state: 1,
        msg: 'ok'
    }
});

//  更新
router.post('/role', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }
        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }
        const userInfo = user.find(i => i._id == id) || {};
        ctx.body = {
            state: 1,
            data: userInfo.role
        };

    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

/** ================================== 配置 ================================== */
// 获取页面配置
router.get('/pageConfig', async (ctx, next) => {
    ctx.body = {
        config: config || {}
    }
});
// 获得分类
router.post('/getCategory', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};

        if (userInfo.role == 2) {
            ctx.body = {
                state: 1,
                data: {
                    category: Object.keys(configCategory).map(i => ({
                            key: i,
                            value: configCategory[i].length,
                            topid: configCategory[i][0]
                        })
                    ),
                    categoryn: Object.keys(configCategoryn).map(i => ({
                            key: i,
                            value: configCategoryn[i].length,
                            topid: configCategoryn[i][0]
                        })
                    )
                }

            };

        } else {
            ctx.body = {
                state: 1,
                data: {
                    category: Object.keys(configCategory).map(i => ({
                            key: i,
                            value: configCategory[i].length,
                            topid: configCategory[i][0]
                        })
                    ),
                }

            };

        }
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
router.post('/getCategoryTest', async (ctx, next) => {
    try {
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }
        ctx.body = {
            state: 1,
            data: {
                category: Object.keys(configCategory).map(i => ({
                        key: i,
                        value: configCategory[i].length,
                        topid: configCategory[i][0]
                    })
                ),
            }
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
/** ================================== 文章 ================================== */
// 添加文章
router.post('/artAdd', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {category = '', title = '', content = '', images = [], open = true, posterCode, posterName} = ctx.request.body;
        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};

        await getToken();

        const param = {
            category,
            title,
            content,
            images,
            user: id,
            time: new Date().getTime(),
            open,
            posterCode,
            posterName,
            like: [],
            commit: []
        };
        const res = await axios.post(baseUrl(token, 'dataService'), {
            action: 'data-add',
            collection: 'art',
            data: {
                data: param
            }
        });
        const _id = posterCode || (JSON.parse(res.data.resp_data) || {})._id || '';

        nextArt = (nextArt + 1) % 1000;

        if (localArtList.length > 1000) {
            const content = readAndWriteFile(param, _id, nextArt);
            if (content.change) {
                delete content.change;
                const res = await axios.post(baseUrl(token, 'dataService'), {
                    action: 'data-updata-id',
                    collection: 'art',
                    id: _id,
                    data: {
                        data: content
                    }
                });
            }
        } else {
            writeFile(param, _id, nextArt);
        }
        localArtList[nextArt] = _id;

        if (open) {
            userInfo.art = _id;
            userInfo.artNum = +(userInfo.artNum || 0) + 1;
            artlist.unshift(_id)
        } else {
            userInfo.artNick = _id;
            userInfo.artNicknNum = +(userInfo.artNickNum || 0) + 1;
            artlistn.unshift(_id)
        }

        if (category) {
            if (open) {
                if (!configCategory[category]) {
                    configCategory[category] = []
                }
                // 添加 分类
                configCategory[category].unshift(_id)
            } else {
                if (!configCategoryn[category]) {
                    configCategoryn[category] = []
                }
                // 添加 分类
                configCategoryn[category].unshift(_id)
            }
        }
        if (posterCode) {
            const file = await axios.post('https://api.weixin.qq.com/tcb/uploadfile?access_token=' + token, {
                env: 'dayup-y2041',
                path: posterName
            });
            ctx.body = {
                state: 1,
                data: {
                    id: _id || '',
                    data: file.data || {}
                }
            };
            return
        }
        ctx.body = {
            state: 1,
            data: {
                id: _id || '',
            }
        }
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

// 获得活跃文章
router.post('/artGetHot', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};
        if (userInfo.role !== 2) {
            ctx.body = {
                state: -1,
                msg: '没有权限'
            };
            return
        }


        let _list;

        _list = await getArtById(arthotn.map(i => i.id), localArtList);

        let resList = [];

        if (_list.code == 1) {
            resList = _list.resList
        }

        ctx.body = {
            state: 1,
            data: resList.map(i => {
                const {avatarUrl, nickName, lou_type, lou_qu, lou_num, lou_fang} = [testUser, ...user].find(j => j._id == i.user) || {};
                return {
                    ...i,
                    id: i._id,
                    _id: undefined,
                    user: {
                        avatarUrl: avatarUrl || '',
                        name: nickName,
                        lou: `${lou_type}${lou_qu} ${lou_num}-${lou_fang}`
                    },
                    like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                    isLike: (i.like || []).includes(id),
                    commit: (i.commit || []).map(c => {
                        const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                        const isbegin = c.cid == '-';
                        const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                        return ({
                            operAvatarUrl: operUser.avatarUrl || '',
                            operName: operUser.nickName,
                            time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                            id: c.id,
                            cid: c.cid,
                            isbegin,
                            targetName: fromUser.nickName || '',
                            content: c.content
                        })
                    }),
                    isCommit: (i.commit || []).some(it => it.uid === id),

                }
            })
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
router.post('/artGetHotTest', async (ctx, next) => {
    try {
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        let _list;
        _list = await getArtById((arthot).map(i => i.id), localArtList);

        let resList = [];

        if (_list.code == 1) {
            resList = _list.resList
        }
        const {headert = ''} = ctx.request.header;

        const {id = ''} = decodeToken(headert);

        ctx.body = {
            state: 1,
            data: resList.map(i => {
                const {avatarUrl, nickName} = [testUser, ...user].find(j => j._id == i.user) || {};
                return {
                    ...i,
                    id: i._id,
                    _id: undefined,
                    user: {
                        avatarUrl: avatarUrl || '',
                        name: nickName,
                    },
                    like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                    isLike: (i.like || []).includes(id),
                    commit: (i.commit || []).map(c => {
                        const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                        const isbegin = c.cid == '-';
                        const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                        return ({
                            operAvatarUrl: operUser.avatarUrl || '',
                            operName: operUser.nickName,
                            time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                            id: c.id,
                            cid: c.cid,
                            isbegin,
                            targetName: fromUser.nickName || '',
                            content: c.content
                        })
                    }),
                    isCommit: (i.commit || []).some(it => it.uid === id),

                }
            })
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
// 获得活跃文章
router.post('/artGetZhishi', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};
        if (userInfo.role !== 2) {
            ctx.body = {
                state: -1,
                msg: '没有权限'
            };
            return
        }


        let _list;

        _list = await getArtById(artTopn.map(i => i.id), localArtList);

        let resList = [];

        if (_list.code == 1) {
            resList = _list.resList
        }

        ctx.body = {
            state: 1,
            data: resList.map(i => {
                const {avatarUrl, nickName, lou_type, lou_qu, lou_num, lou_fang} = [testUser, ...user].find(j => j._id == i.user) || {};
                return {
                    ...i,
                    id: i._id,
                    _id: undefined,
                    user: {
                        avatarUrl: avatarUrl || '',
                        name: nickName,
                        lou: `${lou_type}${lou_qu} ${lou_num}-${lou_fang}`
                    },
                    like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                    isLike: (i.like || []).includes(id),
                    commit: (i.commit || []).map(c => {
                        const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                        const isbegin = c.cid == '-';
                        const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                        return ({
                            operAvatarUrl: operUser.avatarUrl || '',
                            operName: operUser.nickName,
                            time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                            id: c.id,
                            cid: c.cid,
                            isbegin,
                            targetName: fromUser.nickName || '',
                            content: c.content
                        })
                    }),
                    isCommit: (i.commit || []).some(it => it.uid === id),

                }
            })
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
router.post('/artGetZhishiTest', async (ctx, next) => {
    try {
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        let _list;
        _list = await getArtById((artTop).map(i => i.id), localArtList);

        let resList = [];

        if (_list.code == 1) {
            resList = _list.resList
        }
        const {headert = ''} = ctx.request.header;

        const {id = ''} = decodeToken(headert);

        ctx.body = {
            state: 1,
            data: resList.map(i => {
                const {avatarUrl, nickName} = [testUser, ...user].find(j => j._id == i.user) || {};
                return {
                    ...i,
                    id: i._id,
                    _id: undefined,
                    user: {
                        avatarUrl: avatarUrl || '',
                        name: nickName,
                    },
                    like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                    isLike: (i.like || []).includes(id),
                    commit: (i.commit || []).map(c => {
                        const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                        const isbegin = c.cid == '-';
                        const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                        return ({
                            operAvatarUrl: operUser.avatarUrl || '',
                            operName: operUser.nickName,
                            time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                            id: c.id,
                            cid: c.cid,
                            isbegin,
                            targetName: fromUser.nickName || '',
                            content: c.content
                        })
                    }),
                    isCommit: (i.commit || []).some(it => it.uid === id),

                }
            })
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

// 获得文章
router.post('/artGet', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }
        const {page = 1, pageSize = 10, category = '', aid = ''} = ctx.request.body;

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};
        if (userInfo.role !== 2) {
            ctx.body = {
                state: -1,
                msg: '没有权限'
            };
            return
        }

        let _list;
        let list = [];
        let total = 0;

        if (category) {

            if (configCategoryn[category]) {
                if (page === 1 && aid && configCategoryn[category].includes(aid) && configCategoryn[category].indexOf(aid) < pageSize) {
                    list = configCategoryn[category].filter((i, index) => index >= (page - 1) * pageSize && index <= configCategoryn[category].indexOf(aid))
                } else {
                    list = configCategoryn[category].filter((i, index) => index >= (page - 1) * pageSize && index < page * pageSize)
                }
                total = configCategoryn[category].length

            } else {
                ctx.body = {
                    state: -1,
                    msg: '不存在'
                };
                return
            }
        } else {

            list = artlistn.filter((i, index) => index >= (page - 1) * pageSize && index < page * pageSize);
            total = artlistn.length

        }
        let resList = [];

        if (list.length) {
            _list = await getArtById(list, localArtList);
            if (_list.code == 1) {
                resList = _list.resList
            } else {
                const where = category ? {where: {category, open: '0'}} : {};
                const res = await axios.post(baseUrl(token, 'dataService'), {
                    action: 'data-get-page',
                    collection: 'art',
                    ...where,
                    page: 1,
                });
                resList = JSON.parse(res.data.resp_data) || [];
            }
        }
        ctx.body = {
            state: 1,
            data: {
                page: page,
                total: total,
                list: resList.map(i => {
                    const {avatarUrl, nickName, lou_type, lou_qu, lou_num, lou_fang} = [testUser, ...user].find(j => j._id == i.user) || {};
                    return {
                        ...i,
                        id: i._id,
                        _id: undefined,
                        user: {
                            avatarUrl: avatarUrl || '',
                            name: nickName,
                            lou: `${lou_type}${lou_qu} ${lou_num}-${lou_fang}`
                        },
                        like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                        isLike: (i.like || []).includes(id),
                        commit: (i.commit || []).map(c => {
                            const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                            const isbegin = c.cid == '-';
                            const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                            return ({
                                operAvatarUrl: operUser.avatarUrl || '',
                                operName: operUser.nickName,
                                time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                                id: c.id,
                                cid: c.cid,
                                isbegin,
                                targetName: fromUser.nickName || '',
                                content: c.content
                            })
                        }),
                        isCommit: (i.commit || []).some(it => it.uid === id),

                    }
                })
            }
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});
router.post('/artGetTest', async (ctx, next) => {
    try {
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }
        const {headert = ''} = ctx.request.header;
        const {id = ''} = decodeToken(headert);

        const {page = 1, category = '', aid = ''} = ctx.request.body;

        let _list = {};
        let list = [];
        let total = 0;

        if (category) {
            if (configCategory[category]) {
                if (page === 1 && aid && configCategory[category].includes(aid) && configCategory[category].indexOf(aid) < 10) {
                    list = configCategory[category].filter((i, index) => index >= (page - 1) * 10 && index <= configCategory[category].indexOf(aid))
                } else {
                    list = configCategory[category].filter((i, index) => index >= (page - 1) * 10 && index < page * 10)
                }
                total = configCategory[category].length

            } else {
                ctx.body = {
                    state: -1,
                    msg: '不存在'
                };
                return
            }
        } else {

            list = artlist.filter((i, index) => index >= (page - 1) * 10 && index < page * 10);
            total = artlist.length

        }
        if (list.length) {
            _list = await getArtById(list, localArtList);
        }
        let resList = _list.resList || [];

        ctx.body = {
            state: 1,
            data: {
                page: page,
                total: total,
                list: resList.map(i => {
                    const {avatarUrl, nickName} = [testUser, ...user].find(j => j._id == i.user) || {};
                    return {
                        ...i,
                        id: i._id,
                        _id: undefined,
                        user: {
                            avatarUrl: avatarUrl || '',
                            name: nickName,
                        },
                        like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                        isLike: (i.like || []).includes(id),
                        commit: (i.commit || []).map(c => {
                            const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                            const isbegin = c.cid == '-';
                            const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                            return ({
                                operAvatarUrl: operUser.avatarUrl || '',
                                operName: operUser.nickName,
                                time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                                id: c.id,
                                cid: c.cid,
                                isbegin,
                                targetName: fromUser.nickName || '',
                                content: c.content
                            })
                        }),
                        isCommit: (i.commit || []).some(it => it.uid === id),
                    }
                })
            }
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

router.post('/artDetail', async (ctx, next) => {
    try {
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {code = ''} = ctx.request.body;

        let _list = await getArtById([code], localArtList);

        let resList = [];

        if (_list.code == 1) {
            resList = _list.resList
        }

        const {headert = ''} = ctx.request.header;
        const {id = ''} = decodeToken(headert);
        ctx.body = {
            state: 1,
            data: {
                list: resList.map(i => {
                    const {avatarUrl, nickName} = [testUser, ...user].find(j => j._id == i.user) || {};
                    return {
                        ...i,
                        id: i._id,
                        _id: undefined,
                        user: {
                            avatarUrl: avatarUrl || '',
                            name: nickName,
                        },
                        like: (i.like || []).map(l => [testUser, ...user].find(u => u._id == l).nickName),
                        isLike: (i.like || []).includes(id),
                        commit: (i.commit || []).map(c => {
                            const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                            const isbegin = c.cid == '-';
                            const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == i.commit.find(x => c.cid == x.id).uid) || {});

                            return ({
                                operAvatarUrl: operUser.avatarUrl || '',
                                operName: operUser.nickName,
                                time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                                id: c.id,
                                cid: c.cid,
                                isbegin,
                                targetName: fromUser.nickName || '',
                                content: c.content
                            })
                        }),
                        isCommit: (i.commit || []).some(it => it.uid === id),

                    }
                })
            }
        };
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});


/** ================================== 上传文件 ================================== */
router.post('/upload', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }
        const {name = ''} = ctx.request.body;

        await getToken();

        const file = await axios.post('https://api.weixin.qq.com/tcb/uploadfile?access_token=' + token, {
            env: 'dayup-y2041',
            path: name
        });
        ctx.body = file.data || {}
    } catch (e) {
        ctx.body = {e}
    }
});

/** ================================== 点赞 ================================== */
router.post('/like', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};

        const {aid = ''} = ctx.request.body;
        if (aid) {
            ctx.body = {
                state: -1,
                msg: '不对'
            };
        }
        await getToken();

        let artItem = '';

        const artIndex = localArtList.indexOf(aid);
        // 获取文章内容
        if (artIndex > -1) {
            artItem = readFile(artIndex)
        } else {
            const res = await axios.post(baseUrl(token, 'dataService'), {
                action: 'get-data-id',
                collection: 'art',
                id: aid
            });
            artItem = JSON.parse(res.data.resp_data) || {}
        }

        // 判断是否有操作权限
        if (!artItem.open && userInfo.role != 2) {
            ctx.body = {
                state: 0,
                msg: '没有权限'
            }
        }

        // 回写
        const isLike = artItem.like.includes(id);
        if (isLike) {
            artItem.like = artItem.like.filter(i => i != id)
        } else {
            artItem.like.unshift(id)
        }
        // 编辑过
        artItem.change = 1;

        // ================================== 热度 ==================================

        const hotNum = artItem.like.length;

        if (artItem.open) {
            if (artTop.some(i => i.id == artItem._id)) {
                artTop.find(i => i.id == artItem._id).hotNum = hotNum;
                artTop = artTop.filter(i => i.hotNum).sort((a, b) => b.hotNum - a.hotNum)
            } else {
                artTop.push({id: artItem._id, hotNum});
                artTop = artTop.sort((a, b) => b.hotNum - a.hotNum)
            }
        } else {
            if (artTopn.some(i => i.id == artItem._id)) {
                artTopn.find(i => i.id == artItem._id).hotNum = hotNum;
                artTopn = artTopn.filter(i => i.hotNum).sort((a, b) => b.hotNum - a.hotNum)
            } else {
                artTopn.push({id: artItem._id, hotNum});
                artTopn = artTopn.sort((a, b) => b.hotNum - a.hotNum)
            }
        }

        if (artIndex > -1) {
            writeFile(artItem, aid, artIndex)

        } else {
            axios.post(baseUrl(token, 'dataService'), {
                action: 'data-updata-id',
                collection: 'art',
                id: aid,
                data: {
                    data: artItem
                }
            });
        }
        ctx.body = {
            state: 1,
            data: {
                isLike: !isLike,
                like: artItem.like.map(l => [testUser, ...user].find(u => u._id == l).nickName)
            }
        }
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

/** ================================== 评论 ================================== */
router.post('/commit', async (ctx, next) => {
    try {
        const {headert = ''} = ctx.request.header;
        if (!checkHeader(ctx.request.header)) {
            ctx.body = {
                state: -1,
                msg: '登陆状态状态失效，请重新获取验证码'
            };
            return
        }

        const {id = ''} = decodeToken(headert);
        if (!id) {
            ctx.body = {
                state: 0
            };
            return
        }

        const userInfo = [testUser, ...user].find(i => i._id == id) || {};

        const {aid = '', cid = '', content = ''} = ctx.request.body;
        if (aid && cid && content) {
            ctx.body = {
                state: -1,
                msg: '不对'
            };
        }

        await getToken();

        let artItem = '';

        const artIndex = localArtList.indexOf(aid);

        // 获取文章内容
        if (artIndex > -1) {
            artItem = readFile(artIndex)
        } else {
            const res = await axios.post(baseUrl(token, 'dataService'), {
                action: 'get-data-id',
                collection: 'art',
                id: aid
            });
            artItem = JSON.parse(res.data.resp_data) || {}
        }

        // 判断是否有操作权限
        if (!artItem.open && userInfo.role != 2) {
            ctx.body = {
                state: 0,
                msg: '没有权限'
            }
        }
        // 消息
        const touser = await canMsg(cid, artItem, id);
        if (touser) {
            sendMsg(touser, getCommitContent(cid, artItem, userInfo.nickName), (content || '-').slice(0, 20), userInfo.nickName, (new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' ' + new Date().getHours() + ':' + new Date().getMinutes()))
        }

        // 回写
        artItem.commit.push({
            aid,
            cid,
            content,
            id: `${fulltime(new Date().getMonth() + 1)}${fulltime(new Date().getDate())}${fulltime(new Date().getHours())}${fulltime(new Date().getMinutes())}${makeRandom(8)}`,
            uid: id
        });
        // 编辑过
        artItem.change = 1;

        // ================================== 热度 ==================================

        const hotNum = artItem.like.length + artItem.commit.length;

        if (artItem.open) {
            if (arthot.some(i => i.id == artItem._id)) {
                arthot.find(i => i.id == artItem._id).hotNum = hotNum;
                arthot = arthot.filter(i => i.hotNum).sort((a, b) => b.hotNum - a.hotNum)
            } else {
                if (arthotNow <= hotNum) {
                    if (arthot.length >= 19) {
                        arthot[19] = {id: artItem._id, hotNum};
                        arthot = arthot.sort((a, b) => b.hotNum - a.hotNum)
                    } else {
                        arthot.push({id: artItem._id, hotNum});
                        arthot = arthot.sort((a, b) => b.hotNum - a.hotNum)
                    }
                }
            }
            if (arthot.length == 20) {
                arthotNow = arthot[19].hotNum
            }
        } else {
            if (arthotn.some(i => i.id == artItem._id)) {
                arthotn.find(i => i.id == artItem._id).hotNum = hotNum;
                arthotn = arthotn.filter(i => i.hotNum).sort((a, b) => b.hotNum - a.hotNum)
            } else {
                if (arthotnNow <= hotNum) {
                    if (arthotn.length >= 19) {
                        arthotn[19] = {id: artItem._id, hotNum};
                        arthotn = arthotn.sort((a, b) => b.hotNum - a.hotNum)
                    } else {
                        arthotn.push({id: artItem._id, hotNum});
                        arthotn = arthotn.sort((a, b) => b.hotNum - a.hotNum)
                    }
                }
            }
            if (arthotn.length == 20) {
                arthotnNow = arthotn[19].hotNum
            }
        }

        if (artIndex > -1) {
            writeFile(artItem, aid, artIndex)

        } else {
            axios.post(baseUrl(token, 'dataService'), {
                action: 'data-updata-id',
                collection: 'art',
                id: aid,
                data: {
                    data: artItem
                }
            });
        }
        ctx.body = {
            state: 1,
            data: {
                commit: artItem.commit.map(c => {
                    const operUser = [testUser, ...user].find(j => j._id == c.uid) || {};
                    const isbegin = c.cid == '-';
                    const fromUser = isbegin ? {} : ([testUser, ...user].find(j => j._id == artItem.commit.find(x => c.cid == x.id).uid) || {});

                    return ({
                        operAvatarUrl: operUser.avatarUrl || '',
                        operName: operUser.nickName,
                        time: `${c.id.substr(0, 2)}-${c.id.substr(2, 2)} ${c.id.substr(4, 2)}:${c.id.substr(6, 2)}`,
                        id: c.id,
                        cid: c.cid,
                        isbegin,
                        targetName: fromUser.nickName || '',
                        content: c.content
                    })
                }),
                isCommit: artItem.commit.some(it => it.uid === id)
            }
        }
    } catch (e) {
        ctx.body = {state: 0, e}
    }
});

module.exports = router;

async function getToken() {
    if (!token_time || (token_time + expires_in <= new Date().getTime())) {
        const res = await axios.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wxefa196114425c3f0&secret=19ff421289d14c061fdcd90b31874fa7');
        token = res.data.access_token;
        expires_in = res.data.expires_in * 1000;
        token_time = new Date().getTime()
    }
}

async function getUserList(type) {
    if (type || !user.length) {
        const res = await axios.post(baseUrl(token, 'dataService'), {
            action: 'data-get',
            collection: 'user'
        });
        const userList = JSON.parse(res.data.resp_data).data || [];
        if (userList.length) {
            user = userList.map(i => ({...i, role: (i.role == 0 && i.type == '认证') ? 1 : i.role}))
        }
    }
}


/** ================================== 消息 ================================== */
function sendMsg(touser, content, commit, name, time) {
    axios.post(baseUrl(token, 'dataService'), {
            action: 'msg-commit',
            touser, content, commit, name, time
        }
    )

}


async function canMsg(cid, art, id) {
    if (id === '0000') {
        return false
    }
    let uid;
    if (cid === '-') {
        uid = art.user
    } else {
        uid = art.commit.find(i => i.id === cid).uid || ''
    }
    if (uid === '0000') {
        return false
    }
    const u = user.find(i => i._id == uid) || {};
    if (u.msgCommit) {
        return u._openid
    }
    await getUserList(true);

    const u2 = user.find(i => i._id == uid) || {};
    return !u2.msgCommit ? u2._openid : false
}

function getCommitContent(cid, art, name) {

    if (cid === '-') {
        return (art.content || art.title || '-').slice(0, 20)
    } else {
        return (art.commit.find(i => i.id === cid).content || '-').slice(0, 20)
    }

}

function checkCode(code) {
    const codeList = [[["a", "w", "5", "5", "6"], ["h", "i", "2", "4", "h"], ["n", "3", "k", "3", "n"], ["v", "6", "d", "8", "s"]], [["i", "u", "k", "i", "g"], ["i", "n", "z", "d", "7"], ["z", "x", "s", "t", "a"], ["j", "z", "k", "q", "4"]], [["3", "5", "t", "u", "e"], ["q", "8", "s", "j", "9"], ["c", "n", "f", "u", "9"], ["r", "6", "z", "k", "w"]], [["q", "z", "3", "r", "c"], ["w", "q", "p", "n", "h"], ["r", "e", "8", "t", "p"], ["v", "v", "4", "z", "8"]], [["8", "i", "x", "w", "5"], ["j", "s", "b", "m", "3"], ["w", "m", "d", "e", "r"], ["h", "m", "k", "y", "7"]], [["c", "r", "e", "z", "s"], ["m", "e", "z", "r", "r"], ["w", "c", "t", "9", "e"], ["8", "w", "i", "r", "v"]], [["4", "p", "m", "t", "s"], ["x", "2", "3", "5", "c"], ["9", "w", "b", "f", "m"], ["u", "b", "n", "s", "m"]]];
    const day = new Date().getDay();
    const codeDay = codeList[day];
    return codeDay[0].includes(code.charAt(0)) && codeDay[1].includes(code.charAt(1)) && code[2].includes(code.charAt(2)) && codeDay[3].includes(code.charAt(3))
}

function decodeToken(token) {
    if (token === '0000') {
        return {
            token: '0000',
            code: '0000',
            id: '0000',
        }
    }
    if (token.length !== 52) {
        return false
    }
    let l = [];
    let r = 0;
    let d = 0;

    token.split('').reverse().forEach((i, index) => {
        if ([0, 13, 26, 39].includes(index)) {
            l[index] = i;
            r = +i;
            d = index
        } else {
            if (index > r + d) {
                l[index - r] = i
            } else {
                l[index + 12 - r] = i
            }
        }
    });
    let tokenList = [];
    let codeList = [];
    let idList = [];

    l.forEach((i, index) => {
        if ((index % 13) < 4) {
            tokenList.push(i)
        } else if ((index % 13) == 4) {
            codeList.push(i)
        } else {
            idList.push(i)
        }

    });
    return {
        token: tokenList.join(''),
        code: codeList.join(''),
        id: idList.join(''),
    }
}

function encodeToken(token, code, id) {
    let l = [];
    let s0 = [];
    let s1 = [];
    let s2 = [];
    let s3 = [];

    token.split('').forEach((i, index) => {
        if (index < 4) {
            s0.push(i)
        } else if (index < 8) {
            s1.push(i)
        } else if (index < 12) {
            s2.push(i)
        } else {
            s3.push(i)
        }
    });

    code.split('').forEach((i, index) => {
        if (index == 0) {
            s0.push(i)
        } else if (index == 1) {
            s1.push(i)
        } else if (index == 2) {
            s2.push(i)
        } else {
            s3.push(i)
        }
    });


    id.split('').forEach((i, index) => {
        if (index < 8) {
            s0.push(i)
        } else if (index < 16) {
            s1.push(i)
        } else if (index < 24) {
            s2.push(i)
        } else {
            s3.push(i)
        }
    });

    s0.forEach((i, index) => {
        if (index == 0) {
            l[index] = i
        } else {
            if (index + +s0[0] > 12) {
                l[index + +s0[0] - 12] = i
            } else {
                l[index + +s0[0]] = i
            }
        }
    });

    s1.forEach((i, index) => {
        if (index == 0) {
            l[index + 13] = i
        } else {
            if (index + +s1[0] > 12) {
                l[index + 13 + +s1[0] - 12] = i
            } else {
                l[index + 13 + +s1[0]] = i
            }
        }
    });

    s2.forEach((i, index) => {
        if (index == 0) {
            l[index + 26] = i
        } else {
            if (index + +s2[0] > 12) {
                l[index + 26 + +s2[0] - 12] = i
            } else {
                l[index + 26 + +s2[0]] = i
            }
        }
    });

    s3.forEach((i, index) => {
        if (index == 0) {
            l[index + 39] = i
        } else {
            if (index + +s3[0] > 12) {
                l[index + 39 + +s3[0] - 12] = i
            } else {
                l[index + 39 + +s3[0]] = i
            }
        }
    });
    return l.reverse().join('')
}

/**
 * 校验
 */
function checkHeader(header) {
    let res = false;

    const {headeri = '', headert = '', yl = ''} = header;
    const userAgent = (header['user-agent'] || '').toLocaleLowerCase();
    if (yl || (userAgent.indexOf('micromessenger') > -1)) {
        if (headeri && headert &&
            headeri.length == 32 &&
            headert.length == 52 &&
            /\d/.test(headert[51]) &&
            /\d/.test(headert[38]) &&
            /\d/.test(headert[25]) &&
            /\d/.test(headert[12])) {
            const {id = '', token = '', code = ''} = decodeToken(headert);
            if (id == headeri && user_local.some(i => i._id == id && i.token == token && i.code == code)) {
                res = true
            }
        }
        if (headeri === '0000' && headert === '0000') {
            res = true
        }
    }
    return res
}

function makeRandom(num) {
    const l = ((Math.random() + '').split('.')[1] + (Math.random() + '').split('.')[1]).split('');
    l.length = num;
    return l.join('')
}

function fulltime(s) {
    const str = s + '';
    return str.length == 1 ? `0${str}` : str
}