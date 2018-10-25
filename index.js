var fs = require('fs');
var path = require('path');
var ExifImage = require('exif').ExifImage;
const mysql = require('./db/index')
var Hashids = require('hashids');
var hashids = new Hashids('Titan');
var promisify = require('util').promisify;

const fsreaddir = promisify(fs.readdir);
const fsstat = promisify(fs.stat);

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
async function fileDisplay(sourceDir) {
    //根据文件路径读取文件，返回文件列表
    var files = await fsreaddir(sourceDir)
    // console.log(files)
    //遍历读取到的文件列表
    asyncForEach(files, async function (filename) {
        //获取当前文件的绝对路径
        var filedir = path.join(sourceDir, filename);
        //根据文件路径获取文件信息，返回一个fs.Stats对象
        var stats = await fsstat(filedir);
        var isFile = stats.isFile();//是文件
        var isDir = stats.isDirectory();//是文件夹
        if (isFile && isJpg(filedir)) {
            // main(filedir, filename)
            sourcePath = filedir;
            sourceName = filename;
            console.log("sourcePath: " + filedir)
            var exifData = await getEXIF(filedir)
            if (exifData.image.Make) {

                make = exifData.image.Make;
                // console.log(make)
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
                console.log(levelOnePath);
                console.log(levelTwoPath);
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
                fs.renameSync(sourcePath, destPath)

                try {
                    var dbres = await mysql('exif').insert({
                        sourceName: sourceName,
                        sourcePath: sourcePath,
                        destName: destName,
                        destPath: destPath,
                        make: make,
                        model: model,
                        timestamp: timestamp,
                        width: width,
                        height: height,
                        latitude: latitude,
                        longitude: longitude
                    })
                } catch (error){
                    console.log(error)
                }
                console.log(dbres)
                

            }
        }
        if (isDir) {
            fileDisplay(filedir);//递归，如果是文件夹，就继续遍历该文件夹下面的文件
        }
        
    });
    
}

/**
 * 判断文件是否图片
 */
function isJpg(filename) {
    return path.extname(filename) == ".jpg" || path.extname(filename) == ".JPG"
}

/**
 * async forEach
 */
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

/**
 * 获取exif数据
 */
function getEXIF(filePath) {
    return new Promise(resolve => {
        ExifImage(filePath, (err, data) => {
            resolve(data);
        });
    });
}

