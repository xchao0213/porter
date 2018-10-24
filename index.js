var fs = require('fs');
var path = require('path');
var ExifImage = require('exif').ExifImage;
const mysql = require('./db/index')
var Hashids = require('hashids');
var hashids = new Hashids('Titan');


//源文件夹
var sourceDir = path.resolve('/Data/Titan/test');
//目标文件夹
var destDir = path.resolve('/Data/Titan/dest');
//exif数据
var make;
var model;
var timestamp;
var width;
var height;
var latitude;
var longitude;

//调用文件遍历方法
fileDisplay(sourceDir);

/**
 * 文件遍历方法
 * @param sourceDir 需要遍历的文件路径
 */
function fileDisplay(sourceDir) {
    //根据文件路径读取文件，返回文件列表
    fs.readdir(sourceDir, function (err, files) {
        if (err) {
            console.warn(err)
        } else {
            //遍历读取到的文件列表
            files.forEach(function (filename) {
                //获取当前文件的绝对路径
                var filedir = path.join(sourceDir, filename);
                //根据文件路径获取文件信息，返回一个fs.Stats对象
                fs.stat(filedir, function (eror, stats) {
                    if (eror) {
                        console.warn('获取文件stats失败');
                    } else {
                        var isFile = stats.isFile();//是文件
                        var isDir = stats.isDirectory();//是文件夹
                        if (isFile) {
                            main(filedir, filename)
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
function main(sourcePath, sourceName) {
    console.log("sourcePath: " + sourcePath)
    //获取EXIF信息
    try {
        new ExifImage({ image: sourcePath }, function (error, exifData) {
            if (error)
                console.log('Error: ' + error.message);
            else {
                // exif.exifData = exifData; //exif数据集
                make = exifData.image.Make;
                model = exifData.image.Model;
                var exifinfo = exifData.exif;
                // console.log(exifinfo)
                // var ddd = exifinfo.CreateDate;
                var datestr = exifinfo.CreateDate.replace(/:/, "-").replace(/:/, "-")
                timestamp = new Date(datestr);
                var theYear = timestamp.getFullYear();
                var theMonth = timestamp.getMonth() + 1;
                width = exifinfo.ExifImageWidth;
                height = exifinfo.ExifImageHeight;
                var gpsinfo = exifData.gps;
                // console.log(gpsinfo)
                latitude = JSON.stringify(gpsinfo.GPSLatitude);
                longitude = JSON.stringify(gpsinfo.GPSLongitude);

                // console.log(exif);
                //文件夹不存在，则新建
                var levelOnePath = destDir + '/' + theYear;
                var levelTwoPath = destDir + '/' + theYear + '/' + theMonth;
                // console.log(levelOnePath);
                // console.log(levelTwoPath);
                if (!fs.existsSync(levelOnePath)) {
                    fs.mkdirSync(levelOnePath)
                }
                if (!fs.existsSync(levelTwoPath)) {
                    fs.mkdirSync(levelTwoPath)
                }
                // console.log(filename + date.getTime())
                var hashid = hashids.encodeHex(Buffer('' + timestamp.getTime()).toString('hex'));
                // console.log(hashid)
                var destName = hashid + '.jpg';
                var destPath = levelTwoPath + '/' + destName;
                console.log('destPath: ' + destPath)

                // 移动文件到目标文件夹
                // fs.renameSync(sourcePath, destPath)

                //记录数据库
                mysql('exif').insert({
                    sourceName:sourceName,
                    sourcePath:sourcePath,
                    destName:destName,
                    destPath:destPath,
                    make:make,
                    model:model,
                    timestamp:timestamp,
                    width:width,
                    height:height,
                    latitude:latitude,
                    longitude:longitude
                }).then(res => {
                    console.log(res)
                })

            }
        });
    } catch (error) {
        console.log('Error: ' + error.message);
    }

}