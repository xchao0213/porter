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
var sourceDir = path.resolve('/data/media/tmp');
//目标文件夹
var destDir = path.resolve('/data/media/photo');

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
            // console.log(exifData)
            var exif = extractExif(exifData);
            // console.log(exif)
            // var theYear = timestamp.getFullYear();
            // var theMonth = timestamp.getMonth() + 1;
            if (exif.make && exif.model && exif.timestamp){
                var theYear = exif.timestamp.getFullYear();
                // console.log(theYear)
                var theMonth = exif.timestamp.getMonth() + 1;
                // console.log(theMonth)
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

                var hashid = hashids.encodeHex(Buffer('' + exif.timestamp.getTime()).toString('hex'));
                var destName = hashid + '.jpg';
                var destFull = theYear + '/' + theMonth + '/' + destName;
                var destPath = levelTwoPath + '/' + destName;
                console.log('destPath: ' + destPath)
            
                // 移动文件到目标文件夹
                fs.renameSync(sourcePath, destPath)

                var deststats = await fsstat(destPath);
                console.log("deststats" + deststats.isFile())

                
                try {
                    var dbres = await mysql('exif').insert({
                        name: destName,
                        fullPath: destFull,
                        destPath: destPath,
                        make: exif.make,
                        model: exif.model,
                        timestamp: exif.timestamp,
                        width: exif.width,
                        height: exif.height,
                        latitude: exif.latitude,
                        longitude: exif.longitude
                    })
                } catch (error){
                    console.log(error)
                }
                console.log(dbres)
            

            }
            else{
                console.log('Invalid exif info!')
            }
            
        }
        if (isDir) {
            fileDisplay(filedir);//递归，如果是文件夹，就继续遍历该文件夹下面的文件
        }
        
    });
    
}

/**
 * 解析exif数据
 */
function extractExif(exifData){
    if (!exifData){
        console.log("ExifData is undefined!")
        return {};
    }
    var exif = {};
    if (exifData.image){
        exif.make =exifData.image.Make;
        exif.model = exifData.image.Model;
    }
    
    if (exifData.exif){
        exif.date = exifData.exif.CreateDate
        if (exif.date){
            var datestr = exif.date.replace(/:/, "-").replace(/:/, "-")
            exif.timestamp = new Date(datestr);
        }        
        exif.width = exifData.exif.ExifImageWidth;
        exif.height = exifData.exif.ExifImageHeight;
    }

    if (exifData.gps){
        exif.latitude = JSON.stringify(exifData.gps.GPSLatitude);
        exif.longitude = JSON.stringify(exifData.gps.GPSLongitude);
    }
    return exif;    
    
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


