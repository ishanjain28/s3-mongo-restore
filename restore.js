const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  exec = require('child_process').exec,
  AWS = require('aws-sdk'),
  MongoDBURI = require('mongodb-uri');

// Validate Configuration
function ValidateConfig(config) {
  if (config && config.mongodb && config.s3 && config.s3.accessKey && config.s3.secretKey && config.s3.region && config.s3.bucketName) {

    // Don't try to parse the url when it has been parsed once
    if (!(config.mongodb.scheme && config.mongodb.hosts)) {
      config.mongodb = MongoDBURI.parse(config.mongodb);
    }

    return true;
  }
  return false;
}

// Set up AWS
function AWSSetup(config) {
  AWS
    .config
    .update({accessKeyId: config.s3.accessKey, secretAccessKey: config.s3.secretKey, region: config.s3.region});

  let s3 = new AWS.S3();
  return s3;
}

// Fetch a list of all files from AWS
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

// Restore downloaded database
function restore(config, filePath) {

  return new Promise((resolve, reject) => {

    const database = config.mongodb.database,
      password = config.mongodb.password || null,
      username = config.mongodb.username || null,
      host = config.mongodb.hosts[0].host || null,
      port = config.mongodb.hosts[0].port || null;

    let gzipFlag = "--gzip"

    if (path.extname(filePath).toLowerCase() != ".gz") {
      gzipFlag = ""
    }

    // Default command, does not considers username or password
    let command = `mongorestore -h ${host} --port=${port} -d ${database} ${gzipFlag} --archive=${filePath}`;

    // When Username and password is provided
    if (username && password) {
      command = `mongorestore -h ${host} --port=${port} -d ${database} -p ${password} -u ${username} ${gzipFlag} --archive=${filePath}`;
    }
    // When Username is provided
    if (username && !password) {
      command = `mongorestore -h ${host} --port=${port} -d ${database} -u ${username} ${gzipFlag} --archive=${filePath}`;
    }

    exec(command, (err, stdout, stderr) => {
      if (err) {
        // Most likely, mongodump isn't installed or isn't accessible
        reject({error: 1, code: err.code, message: err.message});
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

// Download Backup
function downloadBackup(s3, config, backupKey) {

  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket: config.s3.bucketName,
      Key: backupKey
    }, (err, data) => {
      if (err) {
        reject({error: 1, code: err.code, message: err.message})
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

// Validate, Download, Restore Backup
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

// List Backups
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