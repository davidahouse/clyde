#!/usr/bin/env node
const fs = require('fs')
const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const mkdirp = require('mkdirp')
const { execSync } = require('child_process')
const path = require('path')

const conf = require('rc')('clyde', {
  // defaults
  workingFolder: process.cwd(),
  local: false
})

clear()
console.log(chalk.blue(figlet.textSync('clyde', {horizontalLayout: 'full'})))
const simpleGit = require('simple-git')(conf.workingFolder)

if (!fs.existsSync(conf.workingFolder + '/clyde.json')) {
  console.log(chalk.red('clyde.json file not found in working folder, nothing to do!'))
  process.exit(1)
}

const clydeContents = fs.readFileSync(conf.workingFolder + '/clyde.json')
const clydeDetails = JSON.parse(clydeContents)

mkdirp(conf.workingFolder + '/dependencies', function(err) {

  if (!err) {

    if (clydeDetails.dependencies != null) {
      cloneFromRemote(conf.workingFolder + '/dependencies', clydeDetails.dependencies)
    }

    if (clydeDetails.localDependencies != null && conf.local) {
      cloneToLocal(conf.workingFolder + '/dependencies', clydeDetails.localDependencies)
    }
  } else {
    print(err)
  }
})

function cloneToLocal(rootFolder, dependencies) {
  console.log(chalk.yellow('Checking for local dependencies:'))
  for (const key in dependencies) {
    if (dependencies.hasOwnProperty(key)) {
      console.log(chalk.yellow('Linking ' + key + ' to ' + dependencies[key]))
      const local = rootFolder + '/' + key

      // Remove existing folder
      console.log(chalk.yellow('--> Removing existing folder ' + local))
      rmFolder(local)

      // Create the symlink
      console.log(chalk.yellow('--> Creating symlink'))
      fs.symlinkSync(dependencies[key], local, 'dir')
    }
  }
}

function cloneFromRemote(rootFolder, dependencies) {
  console.log(chalk.green('Checking for remote dependencies:'))
  for (const key in dependencies) {
    if (dependencies.hasOwnProperty(key) && !alsoInLocal(key)) {
      console.log(chalk.green('Cloning ' + key + ' from ' + dependencies[key]))
      // Parse out the branch / tag from the dependency
      const gitParts = dependencies[key].split('~')
      const remote = gitParts[0]
      const branch = gitParts[1]
      const local = rootFolder + '/' + key

      // Remove existing folder
//      writeFolder(local)
      console.log(chalk.green('--> Removing existing folder ' + local))
      rmFolder(local)

      // Do a git clone
      console.log(chalk.green('--> Cloning'))
      simpleGit.clone(remote, local, function() {
        // Remove git
        console.log(chalk.green('--> Removing git from cloned folder'))
        rmFolder(local + '/.git')
        rmFile(local + '/.gitignore')

        // Make everything read only
  //      readOnlyFolder(local)
      })
    }
  }
}

function rmFolder(rmPath) {
//  console.log('rmFolder: ' + rmPath)
  if (doesExist(rmPath)) {
    if (fs.lstatSync(rmPath).isDirectory()) {
      fs.readdirSync(rmPath).forEach(function(entry) {
        
          var entryPath = path.join(rmPath, entry)
          if (fs.lstatSync(entryPath).isDirectory()) {
              rmFolder(entryPath)
          } else {
            fs.unlinkSync(entryPath)
          }
      })
      fs.rmdirSync(rmPath)
    } else {
      fs.unlinkSync(rmPath)
    }
  }
}

function readOnlyFolder(roPath) {
  if (doesExist(roPath)) {
    fs.readdirSync(roPath).forEach(function(entry) {
        var entryPath = path.join(roPath, entry)
        if (fs.lstatSync(entryPath).isDirectory()) {
            readOnlyFolder(entryPath)
        } else {
            fs.chmodSync(entryPath, 0o555)
        }
    })
    fs.chmodSync(roPath, 0o555)
  }
}

function writeFolder(roPath) {
  if (doesExist(roPath)) {
    fs.readdirSync(roPath).forEach(function(entry) {
        var entryPath = path.join(roPath, entry)
        if (fs.lstatSync(entryPath).isDirectory()) {
            readOnlyFolder(entryPath)
        } else {
            fs.chmodSync(entryPath, 0o777)
        }
    })
    fs.chmodSync(roPath, 0o777)
  }
}

function rmFile(rmPath) {
  if (doesExist(rmPath)) {
    fs.unlinkSync(rmPath)
  }
}

function doesExist(existPath) {
  try {
    const stats = fs.statSync(existPath)
    return true
  } catch (e) {
    return false
  }
}

function alsoInLocal(dependency) {
  console.log(dependency)
  if (!conf.local) {
    console.log('config.local is false')
    return false
  }

  if (clydeDetails.localDependencies == null) {
    console.log('no local dependencies')
    return false
  }

  if (clydeDetails.localDependencies[dependency] == null) {
    console.log('dependency null')
    return false
  }
  return true
}
