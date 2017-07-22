const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  exec = require('child_process').exec,
  AWS = require('aws-sdk'),
  MongoDBURI = require('mongodb-uri');

function ValidateConfig(config) {
  if (config && config.mongodb && config.s3 && config.s3.accessKey && config.s3.secretKey && config.s3.region && config.s3.bucketName) {

    // Check if the url isn't parsed already
    if (!(config.mongodb.scheme && config.mongodb.hosts)) {
      config.mongodb = MongoDBURI.parse(config.mongodb);
    }

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
function listObjectsInBucket(s3, config) {
  return new Promise((resolve, reject) => {
    s3.listObjects({
      Bucket: config.s3.bucketName,
      // Prefix: config.mongodb.database
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Contents)
      }
    });
  });
}

function restore(config, filePath) {

  return new Promise((resolve, reject) => {

    const database = config.mongodb.database,
      password = config.mongodb.password || null,
      username = config.mongodb.username || null,
      host = config.mongodb.hosts[0].host || null,
      port = config.mongodb.hosts[0].port || null;

    // Default command, does not considers username or password
    let command = `mongorestore -h ${host} --port=${port} -d ${database} --gzip --archive=${filePath}`;

    // When Username and password is provided
    if (username && password) {
      command = `mongorestore -h ${host} --port=${port} -d ${database} -p ${password} -u ${username} --gzip --archive=${filePath}`;
    }
    // When Username is provided
    if (username && !password) {
      command = `mongorestore -h ${host} --port=${port} -d ${database} -u ${username} --gzip --archive=${filePath}`;
    }

    exec(command, (err, stdout, stderr) => {
      if (err) {
        // Most likely, mongodump isn't installed or isn't accessible
        reject({error: 1, message: err.message, code: err.code});
      } else {
        resolve({
          error: 0,
          message: "Successfuly Restored Backup",
          backupName: path.basename(filePath)
        });
      }
    });
  });

}

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

        // Reject in case of an error in writing data
        stream.on('error', err => {
          reject({error: 1, message: err.message, code: err.code})
          return
        });

        resolve({
          error: 0,
          filePath: path.resolve(os.tmpdir(), backupKey)
        });
      };
    });
  })
};

function RestoreBackup(config, databaseToRestore) {
  let isValidConfig = ValidateConfig(config);

  if (isValidConfig) {

    let s3 = AWSSetup(config)
    return downloadBackup(s3, config, databaseToRestore).then(result => {
      return restore(config, result.filePath)
    }, error => {
      return Promise.reject({error: 1, message: error.message});
    })

  } else {
    return Promise.reject({error: 1, message: "Invalid Configuration"})
  }
}

function List(config) {
  let isValidConfig = ValidateConfig(config);

  if (isValidConfig) {
    let s3 = AWSSetup(config);
    return listObjectsInBucket(s3, config)
  } else {
    return Promise.reject({error: 1, message: "Invalid Configuration"})
  }
}

module.exports = {
  List: List,
  Restore: RestoreBackup
}