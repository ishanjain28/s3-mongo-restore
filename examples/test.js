const restore = require('../restore');

let config = {
    "mongodb": "mongodb://localhost:27017/freecodecamp",
    "s3": {
        "accessKey": "",
        "secretKey": "",
        "region": "ap-southeast-1",
        "bucketName": ""
    }
}

// To restore an update
restore
    .Restore(config, "freecodecamp_2017-07-08T03-17-49.gz")
    .then(console.log, console.log);

// To get a list of all the keys in S3
restore
    .List(config)
    .then(console.log, console.log);