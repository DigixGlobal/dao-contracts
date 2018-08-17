const fs = require('fs');

const importQueue = [];

function writeTextFile(output) {
  fs.appendFile('./contract-full-sources/DaoContracts.sol', output, function (err) {
    if (err) throw err;
  });
}

function isExistInList(arr, value) {
  return arr.indexOf(value) >= 0;
}

function removeHeader(source) {
  const startIndex = source.search('pragma');
  const endIndex = source.indexOf(';');
  const header = source.substring(startIndex, endIndex + 1);
  return source.replace(header, '');
}

function scanContract(contractName) {
  console.log('entered ', contractName);
  const contract = artifacts.require(contractName);
  let { source } = contract;
  source = removeHeader(source);
  while (source.search('import') >= 0) {
    const startIndex = source.search('import');
    const endIndex = source.indexOf(';', startIndex);
    const importFile = source.substring(startIndex, endIndex + 1);
    const contractName = importFile.match(/([A-Z])\w+.sol/g)[0];
    source = source.replace(importFile, '');
    if (!isExistInList(importQueue, contractName)) {
      importQueue.push(contractName);
      scanContract(contractName);
    }
  }
  writeTextFile(source);
  console.log('exited ', contractName);
}

module.exports = async function () {
  writeTextFile('pragma solidity ^0.4.24;');
  scanContract('Dao.sol');
};
