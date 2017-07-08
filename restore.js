const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  AWS = require('aws-sdk'),
  MongoDBURI = require('mongodb-uri');

function ValidateConfig(config) {
  if (config && config.mongodb && config.s3 && config.s3.accessKey && config.s3.secretKey && config.s3.region && config.s3.bucketName) {

    config.mongodb = MongoDBURI.parse(config.mongodb);

    return true;
  }
  return false;
}

function AWSSetup(config) {
  AWS
    .config
    .update({accessKeyId: config.s3.accessKey, secretAccessKey: config.s3.secretKey, region: config.s3.region});

  let s3 = new AWS.S3();
  return s3;
}

// Fetches All the keys in Database that start with database name
function fetchObjectsFromBucket(s3, config) {
  return new Promise((resolve, reject) => {
    s3.listObjects({
      Bucket: config.s3.bucketName,
      Prefix: config.mongodb.database
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Contents)
      }
    });
  });
}

function restore(config) {}

function downloadBackup(s3, config, backupKey) {

  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket: config.s3.bucketName,
      Key: backupKey
    }, (err, data) => {
      if (err) {
        reject({error: 1, message: err.message, code: err.code})
      } else {
        let stream = fs.createWriteStream(path.resolve(os.tmpdir(), backupKey));
        stream.write(data.Body);

        console.log(os.freemem() / 1024 / 1024)
        //TODO:return an error if space available on disk is less than backup size
        resolve({error: 0, Body: data.Body, Length: data.ContentLength});
      };
    });
  })
};

function RestoreBackup(config, databaseToRestore) {
  let isValidConfig = ValidateConfig(config);

  if (isValidConfig) {

    let s3 = AWSSetup(config)
    return downloadBackup(s3, config, databaseToRestore).then(console.log, console.log)

  } else {
    return Promise.reject({error: 1, message: "Invalid Configuration"})
  }
}

function List(config) {
  let isValidConfig = ValidateConfig(config);

  if (isValidConfig) {
    let s3 = AWSSetup(config);
    return fetchObjectsFromBucket(s3, config)
  } else {
    return Promise.reject({error: 1, message: "Invalid Configuration"})
  }
}

module.exports = {
  List: List,
  Restore: RestoreBackup
}