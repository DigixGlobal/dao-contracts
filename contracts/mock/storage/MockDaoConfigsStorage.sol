pragma solidity ^0.4.25;

import "../../storage/DaoConfigsStorage.sol";

contract MockDaoConfigsStorage is DaoConfigsStorage {
    constructor(address _resolver) public DaoConfigsStorage(_resolver) {
        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
        uintConfigs[CONFIG_QUARTER_DURATION] = QUARTER_DURATION;
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

        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH] = 3;

        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = 200;
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

        uintConfigs[CONFIG_MINIMAL_QUARTER_POINT] = 3;
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT] = 3;
        uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM] = 5; //5% of DGX to Badge holder voting activity
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN] = 100;

        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = 2 weeks;
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = 1000;

        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR] = 30;
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION] = 20;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM] = 1;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN] = 1;

        uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = 5 days;

        uintConfigs[CONFIG_MINIMUM_LOCKED_DGD] = 10 ** 9;
        uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR] = 100 * (10 ** 9);
        uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR] = 100;

        uintConfigs[CONFIG_PREPROPOSAL_COLLATERAL] = 2 ether;

        uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX] = 20 ether;
        uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX] = 2;
        uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER] = 10;

        uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION] = 180 days;

        uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS] = 35;
    }

    function mock_set_uint_config(bytes32 _config_name, uint256 _new_value)
        public
    {
          uintConfigs[_config_name] = _new_value;
    }

    function mock_set_address_config(bytes32 _config_name, address _new_value)
        public
    {
        addressConfigs[_config_name] = _new_value;
    }

    function mock_set_bytes_config(bytes32 _config_name, bytes32 _new_value)
        public
    {
        bytesConfigs[_config_name] = _new_value;
    }
}
