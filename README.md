# s3-mongo-restore
Restore MongoDB Backups stored in S3, Using a CLI or directly in your code using this as a library

# Features

- Download and Restore MongoDB Backups
- Inbuilt CLI and Library  
- Presents a Searchable field to lookup the database
- Promises!

# Usage

## As a CLI 

## As a Library

    Usage
    $ s3mr [<mongodburi|accessKey|secretKey|bucketName> ...]

      Options
        -u, --uri               MongoDB URI
        -a, --accessKey         S3 Access Key
        -s, --secretKey         S3 Secret Key
        -b, --bucketName        S3 Bucket Name
        -r, --region            S3 Region
        -lff, --load-from-file  Load Configuration from a JSON file

    Configuration File Example
        {
        mongodb: "mongodb://localhost:27017",
            s3: {
            secretKey: "<s3 secret key>",
            accessKey: "<s3 access key>",
            region: "<s3 region>",
            bucketName: "<s3 bucket name>"
            }      
        }


### Import 

    const restore = require('s3-mongo-restore');

### Create a configuration Object

    var restoreConfig = {
      mongodb: "mongodb://localhost:27017", // MongoDB URI
        s3: {
          secretKey: "<s3 secret key>",     // S3 Secret Key
          accessKey: "<s3 access key>",     // S3 Access Key
          region: "<s3 region>",            // S3 Region
          bucketName: "<s3 bucket name>"    // S3 Bucket Name
        }      
    }
#### Call the Function and pass configuration object to it

This module exposes two functions, `List` and `Restore`. `List` is used to list all the backups in the database and takes just the configuration object. `Restore` is used to restore a database and takes the configuration object and the name of database. 

    //List
    restore.List(restoreConfig)
      .then(result => {
        // When everything is ok, result is an Object containing information about all the backups
          console.log(result);
    }, error => {
        // When Anything goes wrong!
        console.log(error);
    });

    //Restore
    restore.Restore(restoreConfig, "<A backup name>")
        .then(result => {
            console.log(result);
        }, error => {
            console.log(error);
        });

> See examples directory for more examples

# License

MIT

## NOTE

1. This module uses `mongorestore` to restore database, You need to have it installed on the machine on which you are using this module. 
2. To backup the databases,

    mongodump --host localhost --port=27017 --gzip --archive=\<path to backup.gz\>

    //OR, in mongodump version 3.4+

    mongodump --uri=\<MongoDB URI\> --gzip --archive=\<path to backup.gz\>
