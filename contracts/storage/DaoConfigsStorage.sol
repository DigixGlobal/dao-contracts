pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoConfigsStorage is ResolverClient, DaoConstants {
    mapping (bytes32 => uint256) public uintConfigs;
    mapping (bytes32 => address) public addressConfigs;
    mapping (bytes32 => bytes32) public bytesConfigs;

    function DaoConfigsStorage(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_CONFIG, _resolver));

        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
        uintConfigs[CONFIG_QUARTER_DURATION] = 90 days;
        uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = 3 weeks;
        uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = 4 weeks;
        uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = 7 days;
        uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = 10 days;

        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = 30;
        uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = 100;
        uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = 30;
        uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = 100;

        uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION] = 3;

        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = 20;
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = 100;

        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = 3 weeks;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = 4 weeks;

        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = 51;
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = 100;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = 70;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = 100;

        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = 20;
        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = 5;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = 1; // 1 extra QP gains 1/1 RP
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = 1;

        uintConfigs[CONFIG_MINIMAL_PARTICIPATION_POINT] = 3;
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT] = 3;
        uintConfigs[CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_NUM] = 5; //5% of DGX to Badge holder voting activity
        uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_DEN] = 100;

        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = 2 weeks;
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = 1000;
    }

    function updateUintConfigs(uint256[] _uintConfigs)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = _uintConfigs[0];
        uintConfigs[CONFIG_QUARTER_DURATION] = _uintConfigs[1];
        uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = _uintConfigs[2];
        uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = _uintConfigs[3];
        uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = _uintConfigs[4];
        uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = _uintConfigs[5];
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = _uintConfigs[6];
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = _uintConfigs[7];
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = _uintConfigs[8];
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[9];
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = _uintConfigs[10];
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = _uintConfigs[11];
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = _uintConfigs[12];
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[13];
        uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = _uintConfigs[14];
        uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = _uintConfigs[15];
        uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = _uintConfigs[16];
        uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = _uintConfigs[17];
        uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE] = _uintConfigs[18];
        uintConfigs[CONFIG_QUARTER_POINT_VOTE] = _uintConfigs[19];
        uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE] = _uintConfigs[20];
        uintConfigs[CONFIG_MINIMAL_PARTICIPATION_POINT] = _uintConfigs[21];
        uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT] = _uintConfigs[22];
        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION] = uintConfigs[23];
        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = _uintConfigs[24];
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = _uintConfigs[25];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = _uintConfigs[26];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = _uintConfigs[27];
        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = _uintConfigs[28];
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = _uintConfigs[29];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = _uintConfigs[30];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = _uintConfigs[31];
        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = _uintConfigs[32];
        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = _uintConfigs[33];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = _uintConfigs[34];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = _uintConfigs[35];
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[36];
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[37];
        uintConfigs[CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT] = _uintConfigs[38];
        uintConfigs[CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[39];
        uintConfigs[CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[40];
        uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_NUM] = _uintConfigs[41];
        uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_DEN] = _uintConfigs[42];
        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = _uintConfigs[43];
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = _uintConfigs[44];
    }

    function readUintConfigs()
        public
        returns (uint256[])
    {
        uint256[] memory _uintConfigs = new uint256[](45);
        _uintConfigs[0] = uintConfigs[CONFIG_LOCKING_PHASE_DURATION];
        _uintConfigs[1] = uintConfigs[CONFIG_QUARTER_DURATION];
        _uintConfigs[2] = uintConfigs[CONFIG_VOTING_COMMIT_PHASE];
        _uintConfigs[3] = uintConfigs[CONFIG_VOTING_PHASE_TOTAL];
        _uintConfigs[4] = uintConfigs[CONFIG_INTERIM_COMMIT_PHASE];
        _uintConfigs[5] = uintConfigs[CONFIG_INTERIM_PHASE_TOTAL];
        _uintConfigs[6] = uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR];
        _uintConfigs[7] = uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR];
        _uintConfigs[8] = uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[9] = uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[10] = uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR];
        _uintConfigs[11] = uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR];
        _uintConfigs[12] = uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[13] = uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[14] = uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR];
        _uintConfigs[15] = uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR];
        _uintConfigs[16] = uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR];
        _uintConfigs[17] = uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR];
        _uintConfigs[18] = uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE];
        _uintConfigs[19] = uintConfigs[CONFIG_QUARTER_POINT_VOTE];
        _uintConfigs[20] = uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE];
        _uintConfigs[21] = uintConfigs[CONFIG_MINIMAL_PARTICIPATION_POINT];
        _uintConfigs[22] = uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT];
        _uintConfigs[23] = uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION];
        _uintConfigs[24] = uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR];
        _uintConfigs[25] = uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR];
        _uintConfigs[26] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE];
        _uintConfigs[27] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL];
        _uintConfigs[28] = uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR];
        _uintConfigs[29] = uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR];
        _uintConfigs[30] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR];
        _uintConfigs[31] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR];
        _uintConfigs[32] = uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION];
        _uintConfigs[33] = uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING];
        _uintConfigs[34] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM];
        _uintConfigs[35] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN];
        _uintConfigs[36] = uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[37] = uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[38] = uintConfigs[CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT];
        _uintConfigs[39] = uintConfigs[CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[40] = uintConfigs[CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[41] = uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_NUM];
        _uintConfigs[42] = uintConfigs[CONFIG_PORTION_TO_BADGE_HOLDERS_DEN];
        _uintConfigs[43] = uintConfigs[CONFIG_DRAFT_VOTING_PHASE];
        _uintConfigs[44] = uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE];
        return _uintConfigs;
    }
}
