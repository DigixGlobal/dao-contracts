// const a = require('awaiting');

// const DaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');
const Dao = artifacts.require('./Dao.sol');

module.exports = async function () {
  // const daoConfigsStorage = await DaoConfigsStorage.deployed();
  const dao = await Dao.deployed();
  console.log('\tPrinting DAO details ');
  console.log('\t\tDao contract: ', dao.address);
  console.log('\t\tIs Main phase ? ', await dao.isMainPhase.call());
  console.log('\tPrinting DAO configs');
  console.log('\t\tQUARTER_DURATION = ', (await dao.getUintConfig.call('quarter_duration')).toNumber());
  console.log('\t\tLOCKING_PHASE = ', (await dao.getUintConfig.call('locking_phase_duration')).toNumber());
  console.log('\t\tDRAFT_VOTING_PHASE = ', (await dao.getUintConfig.call('config_draft_voting_phase')).toNumber());
  console.log('\t\tVOTING_ROUND = ', (await dao.getUintConfig.call('voting_phase_total')).toNumber());
  console.log('\t\tCOMMIT_ROUND = ', (await dao.getUintConfig.call('voting_commit_phase')).toNumber());
  console.log('\t\tVOTE_CLAIMING_DEADLINE = ', (await dao.getUintConfig.call('config_claiming_deadline')).toNumber());
};
