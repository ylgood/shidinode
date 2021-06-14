const path = require('path');
const fs = require('fs');


const filePath = path.join(__dirname);


exports.write = (content, name) => {
    fs.writeFileSync(filePath + '/' + name + '.log', JSON.stringify(content), {
        charset: 'utf-8'
    })
};
exports.writeFile = (content, id, nextArt) => {
    fs.writeFileSync(filePath + '/art/' + nextArt + '.log', JSON.stringify({...content, _id: id}), {
        charset: 'utf-8'
    });
};
exports.readAndWriteFile = (content, id, nextArt) => {
    let contents = fs.readFileSync(filePath + '/art/' + nextArt + '.log', {
        charset: 'utf-8'
    }).toString() || '{}';
    fs.writeFileSync(filePath + '/art/' + nextArt + '.log', JSON.stringify({...content, _id: id}), {
        charset: 'utf-8'
    });
    return JSON.parse(contents)
};
exports.readFile = (nextArt) => {
    let contents = fs.readFileSync(filePath + '/art/' + nextArt + '.log', {
        charset: 'utf-8'
    }).toString() || '{}';
    return JSON.parse(contents)
};


exports.read = (name) => {
    let contents = fs.readFileSync(filePath + '/' + name + '.log', {
        charset: 'utf-8'
    }).toString() || '{}';
    return JSON.parse(contents)
};


exports.getArtById = async (ids, artList) => {
    let resList = [];
    if (artList.includes(ids[ids.length - 1]) && artList.includes(ids[0])) {
        resList = await Promise.all(ids.map(i => JSON.parse(fs.readFileSync(filePath + '/art/' + artList.indexOf(i) + '.log', {
            charset: 'utf-8'
        }).toString() || '{}')));
        return {code: 1, resList}
    } else {
        return {code: -1}
    }
};


