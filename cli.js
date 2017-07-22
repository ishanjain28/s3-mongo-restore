const meow = require('meow'),
  chalk = require('chalk'),
  inquirer = require('inquirer'),
  escExit = require('esc-exit'),
  cliTruncate = require('cli-truncate'),
  S3Restore = require('./restore');

const cli = meow(`
  Usage
    $ s3-mongo-restore [<mongodburi|accessKey|secretKey|bucketName> ...]

  Options
    -u, --uri         MongoDB URI
    -a, --accessKey   S3 Access Key
    -s, --secretKey   S3 Secret Key
    -b, --bucketName  S3 Bucket Name
    -r, --region      S3 Region
`, {
  alias: {
    u: "uri",
    a: "accessKey",
    s: "secretKey",
    b: "bucketName",
    r: "region"
  },
  string: ["accessKey", "uri", "secretKey", "bucketName"]
})

let config = {};

function listBackups(backups, flags) {
  inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

  return inquirer.prompt([
    {
      name: "backup",
      message: "Search in Available Backups on S3",
      type: "autocomplete",
      pageSize: 7,
      source: (ans, input) => Promise
        .resolve()
        .then(() => filterBackups(input, backups, flags))
    }
  ]).then(answer => {

    // Start Download backup, Check for space before downloading
    S3Restore
      .Restore(config, answer.backup)
      .then(result => {
        console.log(`${result.message} ${result.backupName}`)
      }, error => {
        console.error(error)
      })

  });
}

function filterBackups(input, backups) {

  return backups.filter(backup => {
    if (!input) {
      return true;
    }

    if (backup.Key.toLowerCase().includes(input.toLowerCase())) {
      return true
    }
    return false;
  }).map((backup, index) => {
    const Key = backup.Key,
      Size = (backup.Size / (1024 * 1024)).toFixed(6),
      lineLength = process.stdout.columns || 80,
      margins = 4 + backup.Key.length,
      length = lineLength - margins;

    return {
      name: `${index + 1}. ${Key} ${chalk.dim(Size)}MiB`,
      value: Key
    }
  })
}

function init(flags) {

  escExit();

  const {u, a, s, b, r} = flags;

  if (u && a && s && b && r) {

    config = {
      mongodb: u,
      s3: {
        secretKey: s,
        accessKey: a,
        region: r,
        bucketName: b
      }
    }

    S3Restore
      .List(config)
      .then(backups => {
        // Show results in terminal
        listBackups(backups, flags);

      }, error => {
        console.error("Error in fetching Databases", error);
      })
  } else {
    console.error("Missing Arguments");
  }
}

if (cli.input.length === 0) {
  init(cli.flags)
} else {
  console.error("Invalid Arguments");
}