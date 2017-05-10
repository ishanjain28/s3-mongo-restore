const program = require('commander'),
  chalk = require('chalk');

  
program
  .version('1.0.0')
  .description("List All available Backups on S3")
  .option('-p, --prefix', "Database Backup Prefix")
  .option('-c, --config', "Configuration File to use")
  .parse(process.argv);

console.log(program.prefix)
console.log(program.option("prefix"))