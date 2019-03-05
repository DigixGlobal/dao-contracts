pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoConfigsStorage is ResolverClient, DaoConstants {

    // mapping of config name to config value
    // config names can be found in DaoConstants contract
    mapping (bytes32 => uint256) public uintConfigs;

    // mapping of config name to config value
    // config names can be found in DaoConstants contract
    mapping (bytes32 => address) public addressConfigs;

    // mapping of config name to config value
    // config names can be found in DaoConstants contract
    mapping (bytes32 => bytes32) public bytesConfigs;

    uint256 ONE_BILLION = 1000000000;
    uint256 ONE_MILLION = 1000000;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_CONFIG, _resolver));

        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
        uintConfigs[CONFIG_QUARTER_DURATION] = QUARTER_DURATION;
        uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = 14 days;
        uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = 21 days;
        uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = 7 days;
        uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = 14 days;



        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = 5; // 5%
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = 100; // 5%
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = 35; // 35%
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100; // 35%


        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = 5; // 5%
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = 100; // 5%
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = 25; // 25%
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100; // 25%

        uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = 1; // >50%
        uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = 2; // >50%
        uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = 1; // >50%
        uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = 2; // >50%


        uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE] = ONE_BILLION;
        uintConfigs[CONFIG_QUARTER_POINT_VOTE] = ONE_BILLION;
        uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE] = ONE_BILLION;

        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH] = 20000 * ONE_BILLION;

        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = 15; // 15% bonus for consistent votes
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = 100; // 15% bonus for consistent votes

        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = 28 days;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = 35 days;



        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = 1; // >50%
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = 2; // >50%

        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = 40; // 40%
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = 100; // 40%

        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = 8334 * ONE_MILLION;

        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = 1666 * ONE_MILLION;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = 1; // 1 extra QP gains 1/1 RP
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = 1;


        uintConfigs[CONFIG_MINIMAL_QUARTER_POINT] = 2 * ONE_BILLION;
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = 400 * ONE_BILLION;
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = 2000 * ONE_BILLION;

        uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT] = 4 * ONE_BILLION;
        uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR] = 400 * ONE_BILLION;
        uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR] = 2000 * ONE_BILLION;

        uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM] = 42; //4.2% of DGX to moderator voting activity
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN] = 1000;

        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = 7 days;

        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = 412500 * ONE_MILLION;

        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR] = 7; // 7%
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR] = 100; // 7%

        uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION] = 12500 * ONE_MILLION;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM] = 1;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN] = 1;

        uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = 10 days;

        uintConfigs[CONFIG_MINIMUM_LOCKED_DGD] = 10 * ONE_BILLION;
        uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR] = 842 * ONE_BILLION;
        uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR] = 400 * ONE_BILLION;

        uintConfigs[CONFIG_PREPROPOSAL_COLLATERAL] = 2 ether;

        uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX] = 100 ether;
        uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX] = 5;
        uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER] = 80;

        uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION] = 90 days;
        uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS] = 10 * ONE_BILLION;
    }

    function updateUintConfigs(uint256[] _uintConfigs)
        external
    {
        require(sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS));
        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = _uintConfigs[0];
        /*
        This used to be a config that can be changed. Now, _uintConfigs[1] is just a dummy config that doesnt do anything
        uintConfigs[CONFIG_QUARTER_DURATION] = _uintConfigs[1];
        */
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
        uintConfigs[CONFIG_MINIMAL_QUARTER_POINT] = _uintConfigs[21];
        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH] = _uintConfigs[22];
        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = _uintConfigs[23];
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = _uintConfigs[24];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = _uintConfigs[25];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = _uintConfigs[26];
        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = _uintConfigs[27];
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = _uintConfigs[28];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = _uintConfigs[29];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = _uintConfigs[30];
        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = _uintConfigs[31];
        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = _uintConfigs[32];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = _uintConfigs[33];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = _uintConfigs[34];
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[35];
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[36];
        uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT] = _uintConfigs[37];
        uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[38];
        uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[39];
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM] = _uintConfigs[40];
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN] = _uintConfigs[41];
        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = _uintConfigs[42];
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = _uintConfigs[43];
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR] = _uintConfigs[44];
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[45];
        uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION] = _uintConfigs[46];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM] = _uintConfigs[47];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN] = _uintConfigs[48];
        uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = _uintConfigs[49];
        uintConfigs[CONFIG_MINIMUM_LOCKED_DGD] = _uintConfigs[50];
        uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR] = _uintConfigs[51];
        uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR] = _uintConfigs[52];
        uintConfigs[CONFIG_PREPROPOSAL_COLLATERAL] = _uintConfigs[53];
        uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX] = _uintConfigs[54];
        uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX] = _uintConfigs[55];
        uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER] = _uintConfigs[56];
        uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION] = _uintConfigs[57];
        uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS] = _uintConfigs[58];
    }

    function readUintConfigs()
        public
        view
        returns (uint256[])
    {
        uint256[] memory _uintConfigs = new uint256[](59);
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
        _uintConfigs[21] = uintConfigs[CONFIG_MINIMAL_QUARTER_POINT];
        _uintConfigs[22] = uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH];
        _uintConfigs[23] = uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR];
        _uintConfigs[24] = uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR];
        _uintConfigs[25] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE];
        _uintConfigs[26] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL];
        _uintConfigs[27] = uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR];
        _uintConfigs[28] = uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR];
        _uintConfigs[29] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR];
        _uintConfigs[30] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR];
        _uintConfigs[31] = uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION];
        _uintConfigs[32] = uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING];
        _uintConfigs[33] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM];
        _uintConfigs[34] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN];
        _uintConfigs[35] = uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[36] = uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[37] = uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT];
        _uintConfigs[38] = uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[39] = uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[40] = uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM];
        _uintConfigs[41] = uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN];
        _uintConfigs[42] = uintConfigs[CONFIG_DRAFT_VOTING_PHASE];
        _uintConfigs[43] = uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE];
        _uintConfigs[44] = uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[45] = uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[46] = uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION];
        _uintConfigs[47] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM];
        _uintConfigs[48] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN];
        _uintConfigs[49] = uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE];
        _uintConfigs[50] = uintConfigs[CONFIG_MINIMUM_LOCKED_DGD];
        _uintConfigs[51] = uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR];
        _uintConfigs[52] = uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR];
        _uintConfigs[53] = uintConfigs[CONFIG_PREPROPOSAL_COLLATERAL];
        _uintConfigs[54] = uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX];
        _uintConfigs[55] = uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX];
        _uintConfigs[56] = uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER];
        _uintConfigs[57] = uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION];
        _uintConfigs[58] = uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS];
        return _uintConfigs;
    }
}
