var fs = require('fs');
var path = require('path');
var ExifImage = require('exif').ExifImage;
const mysql = require('./db/index')


//源文件夹
var sourcePath = path.resolve('/Data/Titan/test');
//目标文件夹
var destPath = path.resolve('/Data/Titan/dest');
//数据
var exif = {};

//调用文件遍历方法
fileDisplay(sourcePath);

/**
 * 文件遍历方法
 * @param sourcePath 需要遍历的文件路径
 */
function fileDisplay(sourcePath) {
    //根据文件路径读取文件，返回文件列表
    fs.readdir(sourcePath, function (err, files) {
        if (err) {
            console.warn(err)
        } else {
            //遍历读取到的文件列表
            files.forEach(function (filename) {
                //获取当前文件的绝对路径
                var filedir = path.join(sourcePath, filename);
                //根据文件路径获取文件信息，返回一个fs.Stats对象
                fs.stat(filedir, function (eror, stats) {
                    if (eror) {
                        console.warn('获取文件stats失败');
                    } else {
                        var isFile = stats.isFile();//是文件
                        var isDir = stats.isDirectory();//是文件夹
                        if (isFile) {
                            main(filedir, filename)
                            // console.log(filedir);//文件全路径
                            // console.log(filename);//文件名

                        }
                        if (isDir) {
                            fileDisplay(filedir);//递归，如果是文件夹，就继续遍历该文件夹下面的文件
                        }
                    }
                })
            });
        }
    });
}

/**
 * 主流程
 */
function main(filePath, filename) {
    //获取EXIF信息
    try {
        new ExifImage({ image: filePath }, function (error, exifData) {
            if (error)
                console.log('Error: ' + error.message);
            else
                // exif.exifData = exifData; //exif数据集
                exif.Make = exifData.image.Make;
            exif.Model = exifData.image.Model;
            var exifinfo = exifData.exif;
            // console.log(exifinfo)
            // var ddd = exifinfo.CreateDate;
            var datestr = exifinfo.CreateDate.replace(/:/, "-").replace(/:/, "-")
            var date = new Date(datestr)
            exif.Date = date;
            exif.Year = date.getFullYear();
            exif.Month = date.getMonth() + 1;
            exif.Width = exifinfo.ExifImageWidth;
            exif.Height = exifinfo.ExifImageHeight;
            var gpsinfo = exifData.gps;
            // console.log(gpsinfo)
            exif.Latitude = gpsinfo.GPSLatitude;
            exif.Longitude = gpsinfo.GPSLongitude;

            console.log(exif);
            //文件夹不存在，则新建
            var levelOnePath = destPath + '/' + exif.Year;
            var levelTwoPath = destPath + '/' + exif.Year + '/' + exif.Month;
            console.log(levelOnePath);
            console.log(levelTwoPath);
            if (!fs.existsSync(levelOnePath)) {
                fs.mkdirSync(levelOnePath) 
            }
            if (!fs.existsSync(levelTwoPath)) {
                fs.mkdirSync(levelTwoPath)
            }

            //移动文件到目标文件夹
            fs.renameSync(filePath, levelTwoPath + '/' + filename)

            //记录数据库
        });
    } catch (error) {
        console.log('Error: ' + error.message);
    }
    
}


/**
 * 储存用户信息
 * @param {object} userInfo
 * @param {string} sessionKey
 * @return {Promise}
 */
function saveUserInfo(userInfo, skey, session_key) {
    const uuid = uuidGenerator()
    const create_time = moment().format('YYYY-MM-DD HH:mm:ss')
    const last_visit_time = create_time
    const open_id = userInfo.openId
    const user_info = JSON.stringify(userInfo)

    // 查重并决定是插入还是更新数据
    return mysql('cSessionInfo').count('open_id as hasUser').where({
        open_id
    })
        .then(res => {
            // 如果存在用户则更新
            if (res[0].hasUser) {
                return mysql('cSessionInfo').update({
                    skey, last_visit_time, session_key, user_info
                }).where({
                    open_id
                })
            } else {
                return mysql('cSessionInfo').insert({
                    uuid, skey, create_time, last_visit_time, open_id, session_key, user_info
                })
            }
        })
        .then(() => ({
            userinfo: userInfo,
            skey: skey
        }))
        .catch(e => {
            debug('%s: %O', ERRORS.DBERR.ERR_WHEN_INSERT_TO_DB, e)
            throw new Error(`${ERRORS.DBERR.ERR_WHEN_INSERT_TO_DB}\n${e}`)
        })
}