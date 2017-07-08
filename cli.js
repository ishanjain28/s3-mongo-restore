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

function listBackups(backups, flags) {
  inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

  return inquirer.prompt([
    {
      name: "backups",
      message: "Available Backups on S3",
      type: "autocomplete",
      pageSize: 5,
      source: (ans, input) => Promise
        .resolve()
        .then(() => filterBackups(input, backups, flags))
    }
  ]).then(answer => {
    console.log(answer)
    return
  })
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
  }).map(backup => {
    const {Key, Size} = backup;
    const lineLength = process.stdout.columns || 80;
    const margins = 4 + backup.Key.length;
    const length = lineLength - margins;

    return {
      name: `${Key} ${chalk.dim(Size)}`,
      value: Key
    }
  })
}

function init(flags) {

  escExit();

  const {u, a, s, b, r} = flags;

  if (u && a && s && b && r) {

    let config = {
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