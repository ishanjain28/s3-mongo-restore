const AWS = require('aws-sdk'),
  fs = require('fs');

function ValidateConfig(config) {
  if (config && config.mongodb && config.mongodb.host && config.mongodb.name && config.s3 && config.s3.accessKey && config.s3.secretKey && config.s3.region && config.s3.bucketName) {
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
      Prefix: config.mongodb.name
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
        resolve({error: 0, Body: data.Body, Length: data.ContentLength})
      }
    });
  });
}

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